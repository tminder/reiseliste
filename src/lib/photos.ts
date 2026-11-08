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

function cacheKey(country: string, term: string) {
  return `rl:photos:${OFF_COUNTRY[country] ?? country}:${normalize(term)}`
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

export function loadPhotos(country: string, term: string): Promise<Photo[]> {
  const key = cacheKey(country, term)
  const cached = readCache(key)
  if (cached) return Promise.resolve(cached)

  const run = async (): Promise<Photo[]> => {
    const again = readCache(key)
    if (again) return again
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
    const photos = (data.products ?? [])
      .filter((p) => p.image_front_small_url)
      .map((p) => ({
        code: p.code,
        name: p.product_name ?? '',
        brand: (p.brands ?? '').split(',')[0].trim(),
        image: p.image_front_small_url!,
        url: `https://world.openfoodfacts.org/product/${p.code}`,
      }))
      // Produkte, deren Name den Suchbegriff enthält, zuerst (sonst kommt bei "leche" auch Milchschokolade)
      .sort((a, b) => score(b.name, needle) - score(a.name, needle))
      .slice(0, MAX)
    writeCache(key, photos)
    return photos
  }

  const p = chain.then(run, run)
  chain = p.catch(() => {})
  return p
}
