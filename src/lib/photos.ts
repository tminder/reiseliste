// Produktfotos aus Open Food Facts (Fotos: CC BY-SA, Daten: ODbL).
// Gesucht wird mit dem Begriff in der Landessprache, gefiltert auf Produkte, die im Reiseland verkauft werden.
// Open Food Facts erlaubt nur wenige Suchanfragen pro Minute: Fotos werden deshalb nur auf Antippen geladen
// und 30 Tage lokal zwischengespeichert.

import { normalize } from './translate'

export interface Photo {
  code: string
  name: string
  brand: string
  image: string
  url: string
}

/** Länder-Codes der App → Länder-Tag in Open Food Facts */
const OFF_COUNTRY: Record<string, string> = {
  ES: 'spain',
  PT: 'portugal',
  IT: 'italy',
  FR: 'france',
  GR: 'greece',
  CY: 'cyprus',
  HR: 'croatia',
  NL: 'netherlands',
  'BE-NL': 'belgium',
  'BE-FR': 'belgium',
  LU: 'luxembourg',
  MT: 'malta',
  GB: 'united-kingdom',
  IE: 'ireland',
  US: 'united-states',
  MX: 'mexico',
  'CH-FR': 'switzerland',
  'CH-IT': 'switzerland',
}

const TTL = 30 * 24 * 60 * 60 * 1000
const MAX = 4

type CacheEntry = { at: number; photos: Photo[] }

function cacheKey(country: string, term: string, store?: string) {
  return `rl:photos:${OFF_COUNTRY[country] ?? country}:${store ?? '*'}:${normalize(term)}`
}

function readCache(key: string): Photo[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    return Date.now() - entry.at < TTL ? entry.photos : null
  } catch {
    return null
  }
}

function writeCache(key: string, photos: Photo[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), photos } satisfies CacheEntry))
  } catch {
    /* Speicher voll – dann eben ohne Cache */
  }
}

/** Name beginnt mit dem Begriff: 2, enthält ihn: 1, sonst 0 – stabile Sortierung behält die Beliebtheit bei */
function score(name: string, needle: string) {
  const n = normalize(name)
  return n.startsWith(needle) ? 2 : n.includes(needle) ? 1 : 0
}

export class PhotoError extends Error {}

// Anfragen nacheinander statt gleichzeitig – schont das Limit von Open Food Facts
let chain: Promise<unknown> = Promise.resolve()

async function search(country: string, term: string, store?: string): Promise<Photo[]> {
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: OFF_COUNTRY[country] ?? 'world',
    sort_by: 'unique_scans_n', // häufig gescannte = gängige Produkte zuerst
    page_size: '12',
    json: '1',
    fields: 'code,product_name,brands,image_front_small_url',
    app_name: 'Reiseliste',
  })
  if (store) {
    params.set('tagtype_1', 'stores')
    params.set('tag_contains_1', 'contains')
    params.set('tag_1', store)
  }
  let res: Response
  try {
    res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`)
  } catch {
    throw new PhotoError('Keine Verbindung zu Open Food Facts.')
  }
  if (res.status === 429 || res.status === 503) throw new PhotoError('Open Food Facts ist gerade ausgelastet. Bitte gleich nochmal.')
  if (!res.ok) throw new PhotoError(`Open Food Facts antwortet nicht (${res.status}).`)

  const data = (await res.json()) as {
    products?: { code: string; product_name?: string; brands?: string; image_front_small_url?: string }[]
  }
  const needle = normalize(term)
  return (data.products ?? [])
    .filter((p) => p.image_front_small_url)
    .map((p) => ({
      code: p.code,
      name: p.product_name ?? '',
      brand: (p.brands ?? '').split(',')[0].trim(),
      image: p.image_front_small_url!,
      url: `https://world.openfoodfacts.org/product/${p.code}`,
    }))
    // Produkte, deren Name mit dem Begriff beginnt, zuerst (sonst kommt bei "leche" auch Milchschokolade)
    .sort((a, b) => score(b.name, needle) - score(a.name, needle))
    .slice(0, MAX)
}

/**
 * Fotos zu einem Begriff im Reiseland. Mit `store` (Kette, z. B. "mercadona") zuerst Produkte dieser Kette;
 * findet sich dort nichts, die üblichen Produkte im ganzen Land.
 */
export function loadPhotos(country: string, term: string, store?: string): Promise<Photo[] & { fromStore?: boolean }> {
  const key = cacheKey(country, term, store)
  const cached = readCache(key)
  if (cached) return Promise.resolve(Object.assign(cached, { fromStore: !!store && cached.length > 0 && readFlag(key) }))

  const run = async () => {
    let photos: Photo[] = []
    let fromStore = false
    if (store) {
      photos = await search(country, term, store)
      fromStore = photos.length > 0
    }
    if (!photos.length) photos = await search(country, term)
    writeCache(key, photos)
    writeFlag(key, fromStore)
    return Object.assign(photos, { fromStore })
  }

  const p = chain.then(run, run)
  chain = p.catch(() => {})
  return p
}

function readFlag(key: string) {
  return localStorage.getItem(`${key}:store`) === '1'
}
function writeFlag(key: string, v: boolean) {
  try {
    localStorage.setItem(`${key}:store`, v ? '1' : '0')
  } catch {
    /* egal */
  }
}
