// Produktfotos aus Open Food Facts (Fotos: CC BY-SA, Daten: ODbL).
//
// Treffsicherheit: Gesucht wird über die PRODUKTKATEGORIE von Open Food Facts (z. B. en:milks), nicht über
// Freitext – Freitext liefert bei „tomates“ Ketchup und Pastasauce. Für lose Ware (Obst, Gemüse, Frischfleisch)
// und Non-Food gibt es keine Fotos: Open Food Facts kennt fast nur verpackte Lebensmittel.
// Nur für eigene Landesbegriffe ohne Wörterbuch-Eintrag wird Freitext genutzt, mit strengem Namensfilter.
//
// Open Food Facts erlaubt nur wenige Suchanfragen pro Minute: Fotos werden nur auf Antippen geladen
// und 30 Tage lokal zwischengespeichert.

import { t } from '../i18n'
import { normalize } from './translate'
import { CONCEPTS } from '../data/dictionary'

export interface Photo {
  code: string
  name: string
  brand: string
  image: string
  url: string
}

/** Wörterbuch-ID → Kategorie in Open Food Facts (aus src/data/dictionary/concepts.json). Fehlt sie, gibt es keinen Foto-Knopf. */
export const OFF_CATEGORY: Record<string, string> = Object.fromEntries(CONCEPTS.flatMap((c) => (c.off ? [[c.id, c.off]] : [])))

/** Gibt es für diesen Artikel sinnvolle Fotos? (Wörterbuch-Artikel nur mit Kategorie, eigene Begriffe immer) */
export function hasPhotos(conceptId: string | null, localOverride: string | null): boolean {
  if (conceptId) return conceptId in OFF_CATEGORY
  return !!localOverride
}

/** Länder-Codes der App → Länder-Tag in Open Food Facts */
const OFF_COUNTRY: Record<string, string> = {
  ES: 'en:spain',
  PT: 'en:portugal',
  IT: 'en:italy',
  FR: 'en:france',
  GR: 'en:greece',
  CY: 'en:cyprus',
  HR: 'en:croatia',
  NL: 'en:netherlands',
  'BE-NL': 'en:belgium',
  'BE-FR': 'en:belgium',
  LU: 'en:luxembourg',
  MT: 'en:malta',
  GB: 'en:united-kingdom',
  IE: 'en:ireland',
  US: 'en:united-states',
  MX: 'en:mexico',
  'CH-FR': 'en:switzerland',
  'CH-IT': 'en:switzerland',
}

const TTL = 30 * 24 * 60 * 60 * 1000
const MAX = 4
const FIELDS = 'code,product_name,brands,image_front_small_url'

export type PhotoResult = { photos: Photo[]; fromStore: boolean }

function cacheKey(country: string, what: string, store?: string) {
  return `rl:photos2:${country}:${store ?? '*'}:${what}`
}

function readCache(key: string): PhotoResult | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as { at: number; result: PhotoResult }
    return Date.now() - entry.at < TTL ? entry.result : null
  } catch {
    return null
  }
}

function writeCache(key: string, result: PhotoResult) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), result }))
  } catch {
    /* Speicher voll – dann eben ohne Cache */
  }
}

/** retry = true: vorübergehendes Problem (Server ausgelastet, kein Netz) – später automatisch nochmal */
export class PhotoError extends Error {
  readonly retry: boolean
  constructor(message: string, retry = false) {
    super(message)
    this.retry = retry
  }
}

type OffProduct = { code: string; product_name?: string; brands?: string; image_front_small_url?: string }

async function fetchJson(url: string): Promise<OffProduct[]> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new PhotoError(t('errOffUnreachable'), true)
  }
  if (res.status === 429 || res.status >= 500) throw new PhotoError(t('errOffBusy', { status: res.status }), true)
  if (!res.ok) throw new PhotoError(t('errOffStatus', { status: res.status }))
  return ((await res.json()) as { products?: OffProduct[] }).products ?? []
}

function toPhotos(products: OffProduct[]): Photo[] {
  return products
    .filter((p) => p.image_front_small_url)
    .map((p) => ({
      code: p.code,
      name: p.product_name ?? '',
      brand: (p.brands ?? '').split(',')[0].trim(),
      image: p.image_front_small_url!,
      url: `https://world.openfoodfacts.org/product/${p.code}`,
    }))
}

/** Kategorie-Suche (API v2): meistgescannte Produkte der Kategorie im Land, optional nur einer Kette */
async function byCategory(country: string, category: string, store?: string): Promise<Photo[]> {
  const params = new URLSearchParams({
    categories_tags: category,
    countries_tags: OFF_COUNTRY[country] ?? 'en:world',
    sort_by: 'unique_scans_n',
    page_size: '8',
    fields: FIELDS,
    app_name: 'CartOnTheRoad',
  })
  if (store) params.set('stores_tags', store)
  return toPhotos(await fetchJson(`https://world.openfoodfacts.org/api/v2/search?${params}`)).slice(0, MAX)
}

/** Freitext (nur für eigene Begriffe): nur Produkte, deren Name mit dem Begriff beginnt oder ihn als Wort enthält */
async function byText(country: string, term: string, store?: string): Promise<Photo[]> {
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: (OFF_COUNTRY[country] ?? 'en:world').replace('en:', ''),
    sort_by: 'unique_scans_n',
    page_size: '20',
    json: '1',
    fields: FIELDS,
    app_name: 'CartOnTheRoad',
  })
  if (store) {
    params.set('tagtype_1', 'stores')
    params.set('tag_contains_1', 'contains')
    params.set('tag_1', store)
  }
  const needle = normalize(term)
  return toPhotos(await fetchJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}`))
    .filter((p) => {
      const n = normalize(p.name)
      return n.startsWith(needle) || ` ${n} `.includes(` ${needle} `)
    })
    .slice(0, MAX)
}

// Anfragen nacheinander statt gleichzeitig – schont das Limit von Open Food Facts
let chain: Promise<unknown> = Promise.resolve()

/**
 * Fotos für einen Artikel im Reiseland. Mit `store` (Kette, z. B. "mercadona") zuerst Produkte dieser Kette;
 * gibt es dort nichts, die üblichen Produkte im ganzen Land.
 */
export function loadPhotos(opts: { country: string; conceptId: string | null; term: string; store?: string }): Promise<PhotoResult> {
  const { country, conceptId, term, store } = opts
  const category = conceptId ? OFF_CATEGORY[conceptId] : undefined
  const what = category ?? `text:${normalize(term)}`
  const key = cacheKey(country, what, store)
  const cached = readCache(key)
  if (cached) return Promise.resolve(cached)

  const search = (s?: string) => (category ? byCategory(country, category, s) : byText(country, term, s))
  const run = async (): Promise<PhotoResult> => {
    const again = readCache(key)
    if (again) return again
    let photos: Photo[] = []
    let fromStore = false
    if (store) {
      photos = await search(store)
      fromStore = photos.length > 0
    }
    if (!photos.length) photos = await search()
    const result = { photos, fromStore }
    writeCache(key, result)
    return result
  }

  const p = chain.then(run, run)
  chain = p.catch(() => {})
  return p
}
