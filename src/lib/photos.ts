// Produktfotos aus Open Food Facts (Fotos: CC BY-SA, Daten: ODbL).
//
// Treffsicherheit: Gesucht wird über die PRODUKTKATEGORIE von Open Food Facts (z. B. en:milks), nicht über
// Freitext – Freitext liefert bei „tomates“ Ketchup und Pastasauce. Für lose Ware (Obst, Gemüse, Frischfleisch)
// und Non-Food gibt es keine Fotos: Open Food Facts kennt fast nur verpackte Lebensmittel.
// Nur für eigene Landesbegriffe ohne Wörterbuch-Eintrag wird Freitext genutzt, mit strengem Namensfilter.
//
// Open Food Facts erlaubt nur 10 Suchanfragen pro Minute und IP (sonst droht eine Sperre): Fotos werden nur auf
// Antippen geladen, eine Anfrage pro Artikel (die Läden der Produkte kommen mit, die Kette wird hier vorgezogen),
// höchstens 8 pro Minute (weitere warten) und 90 Tage lokal zwischengespeichert (D-010, D-094).

import { t } from '../i18n'
import { normalize } from './translate'
import { timeout } from './net'
import { CONCEPTS } from '../data/dictionary'

export interface Photo {
  code: string
  name: string
  brand: string
  image: string
  url: string
  /** Läden laut Open Food Facts (Tags, z. B. „mercadona“) */
  stores?: string[]
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
  VN: 'en:vietnam',
  TW: 'en:taiwan',
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

const TTL = 90 * 24 * 60 * 60 * 1000
const MAX = 4
const FIELDS = 'code,product_name,brands,image_front_small_url,stores_tags'

export type PhotoResult = { photos: Photo[]; fromStore: boolean }

// Version 3: ein Eintrag pro Land und Artikel, mit Läden (vorher getrennt pro Kette)
function cacheKey(country: string, what: string) {
  return `rl:photos3:${country}:${what}`
}

/** Einträge früherer Versionen entfernen (S-054), einmal pro Sitzung */
let cleaned = false
function cleanOldCache() {
  if (cleaned) return
  cleaned = true
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith('rl:photos2:')) localStorage.removeItem(k)
    }
  } catch {
    /* egal */
  }
}

function readCache(key: string): Photo[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as { at: number; photos: Photo[] }
    return Date.now() - entry.at < TTL && Array.isArray(entry.photos) ? entry.photos : null
  } catch {
    return null
  }
}

function writeCache(key: string, photos: Photo[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), photos }))
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

type OffProduct = { code: string; product_name?: string; brands?: string; image_front_small_url?: string; stores_tags?: string[] }

// Eigene Bremse: höchstens 8 Suchen pro gleitender Minute (Open Food Facts erlaubt 10). Weitere warten.
const SEARCHES_PER_MIN = 8
const recent: number[] = []
async function throttle() {
  for (;;) {
    const now = Date.now()
    while (recent.length && now - recent[0] >= 60_000) recent.shift()
    if (recent.length < SEARCHES_PER_MIN) {
      recent.push(now)
      return
    }
    await new Promise((r) => setTimeout(r, 60_000 - (now - recent[0]) + 50))
  }
}

async function fetchJson(url: string): Promise<OffProduct[]> {
  await throttle()
  let res: Response
  try {
    // Ohne Zeitlimit kann eine hängende Anfrage alle weiteren blockieren (Anfragen laufen nacheinander, D-094)
    res = await fetch(url, { signal: timeout(15_000) })
  } catch {
    throw new PhotoError(t('errOffUnreachable'), true)
  }
  if (res.status === 429 || res.status >= 500) throw new PhotoError(t('errOffBusy', { status: res.status }), true)
  if (!res.ok) throw new PhotoError(t('errOffStatus', { status: res.status }))
  try {
    return ((await res.json()) as { products?: OffProduct[] }).products ?? []
  } catch {
    // Ausgelastet liefert Open Food Facts manchmal eine HTML-Seite statt JSON
    throw new PhotoError(t('errOffUnreachable'), true)
  }
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
      ...(p.stores_tags?.length ? { stores: p.stores_tags } : {}),
    }))
}

/** Kategorie-Suche (API v2): meistgescannte Produkte der Kategorie im Land, mit ihren Läden */
async function byCategory(country: string, category: string): Promise<Photo[]> {
  const params = new URLSearchParams({
    categories_tags: category,
    countries_tags: OFF_COUNTRY[country] ?? 'en:world',
    sort_by: 'unique_scans_n',
    page_size: '24',
    fields: FIELDS,
    app_name: 'CartOnTheRoad',
  })
  return toPhotos(await fetchJson(`https://world.openfoodfacts.org/api/v2/search?${params}`))
}

/** Freitext (nur für eigene Begriffe): nur Produkte, deren Name mit dem Begriff beginnt oder ihn als Wort enthält */
async function byText(country: string, term: string): Promise<Photo[]> {
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: (OFF_COUNTRY[country] ?? 'en:world').replace('en:', ''),
    sort_by: 'unique_scans_n',
    page_size: '40',
    json: '1',
    fields: FIELDS,
    app_name: 'CartOnTheRoad',
  })
  const needle = normalize(term)
  return toPhotos(await fetchJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}`)).filter((p) => {
    const n = normalize(p.name)
    return n.startsWith(needle) || ` ${n} `.includes(` ${needle} `)
  })
}

/** Produkte der Kette zuerst (gibt es welche, „fromStore“), sonst die meistgescannten im Land */
function pick(all: Photo[], store?: string): PhotoResult {
  const inStore = store ? all.filter((p) => p.stores?.includes(store)) : []
  return inStore.length ? { photos: inStore.slice(0, MAX), fromStore: true } : { photos: all.slice(0, MAX), fromStore: false }
}

// Anfragen nacheinander statt gleichzeitig – schont das Limit von Open Food Facts
let chain: Promise<unknown> = Promise.resolve()

/**
 * Fotos für einen Artikel im Reiseland. Mit `store` (Kette, z. B. "mercadona") zuerst Produkte dieser Kette;
 * gibt es dort nichts, die üblichen Produkte im ganzen Land.
 */
export function loadPhotos(opts: { country: string; conceptId: string | null; term: string; store?: string }): Promise<PhotoResult> {
  const { country, conceptId, term, store } = opts
  cleanOldCache()
  const category = conceptId ? OFF_CATEGORY[conceptId] : undefined
  const what = category ?? `text:${normalize(term)}`
  const key = cacheKey(country, what)
  const cached = readCache(key)
  if (cached) return Promise.resolve(pick(cached, store))

  const run = async (): Promise<PhotoResult> => {
    const again = readCache(key)
    if (again) return pick(again, store)
    const all = category ? await byCategory(country, category) : await byText(country, term)
    writeCache(key, all)
    return pick(all, store)
  }

  const p = chain.then(run, run)
  chain = p.catch(() => {})
  return p
}
