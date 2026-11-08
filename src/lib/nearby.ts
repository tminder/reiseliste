// Nächstgelegenen Supermarkt erkennen: Standort des Geräts + OpenStreetMap (Overpass API).
// Der Standort wird nur auf Knopfdruck (oder bei bereits erteilter Erlaubnis beim Öffnen) abgefragt,
// an die Overpass API geschickt und nirgends gespeichert. Gespeichert wird nur der gewählte Laden, lokal pro Liste.

export interface Shop {
  id: string
  name: string
  brand: string | null
  distance: number // Meter
}

/** retry = true: vorübergehendes Problem (Server ausgelastet, kein Netz, GPS-Timeout) – später nochmal versuchen */
export class NearbyError extends Error {
  readonly retry: boolean
  constructor(message: string, retry = false) {
    super(message)
    this.retry = retry
  }
}

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new NearbyError('Dieses Gerät kann den Standort nicht bestimmen.'))
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED)
        reject(new NearbyError('Standort nicht freigegeben. Du kannst ihn in den Browser-Einstellungen erlauben.'))
      else reject(new NearbyError('Standort konnte nicht bestimmt werden.', true))
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 })
  })
}

/** Abstand in Metern (Haversine) */
function meters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

/** Erlaubnis schon erteilt? Dann darf die App beim Öffnen ohne Nachfrage suchen. */
export async function locationAlreadyAllowed(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state === 'granted'
  } catch {
    return false
  }
}

// Öffentliche Overpass-Server; fällt einer aus oder ist ausgelastet, wird der nächste versucht.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

async function runQuery(query: string): Promise<OsmElement[]> {
  let lastError = 'Keine Verbindung zu OpenStreetMap.'
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }) })
      if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements
      lastError =
        res.status === 429 || res.status === 504
          ? 'OpenStreetMap ist ausgelastet.'
          : `OpenStreetMap antwortet nicht (Fehler ${res.status}).`
    } catch {
      // Netzwerkfehler – oder Überlastung: Overpass schickt bei 429 keine CORS-Header, der Browser meldet dann nur „failed to fetch“
      lastError = 'OpenStreetMap ist nicht erreichbar oder ausgelastet.'
    }
  }
  throw new NearbyError(lastError, true)
}

/** Suchstufen ausserhalb eines Ladens: der nächste Supermarkt wird bis FAR_RADIUS_M gesucht. */
export const FAR_STEPS_M = [1_000, 3_000, 10_000, 20_000]
export const FAR_RADIUS_M = FAR_STEPS_M[FAR_STEPS_M.length - 1]

const CACHE_MS = 5 * 60 * 1000
const SUGGESTION_MS = 30 * 60 * 1000
type LastResult = { at: number; lat: number; lon: number; result: { shops: Shop[]; inside: boolean } }

// Letztes Suchergebnis im lokalen Speicher – übersteht ein Neuladen der Seite
function readLast(): LastResult | null {
  try {
    const raw = localStorage.getItem('rl:nearby')
    return raw ? (JSON.parse(raw) as LastResult) : null
  } catch {
    return null
  }
}
function writeLast(v: LastResult) {
  try {
    localStorage.setItem('rl:nearby', JSON.stringify(v))
  } catch {
    /* egal */
  }
}

/** Vorschlag der letzten 30 Minuten (ohne neue Standortabfrage), z. B. nach einem Neuladen */
export function recentSuggestion(): { shops: Shop[]; inside: boolean } | null {
  const last = readLast()
  return last && Date.now() - last.at < SUGGESTION_MS ? last.result : null
}

/**
 * Läden in der Nähe – eine einzige Anfrage an OpenStreetMap (schont die Server, vermeidet Sperren).
 * `inside` = true: Läden im Umkreis der GPS-Genauigkeit (man ist wohl drin), alle Ladenarten, Supermärkte zuerst.
 * Sonst die nächsten Supermärkte; pro Stufe (1, 3, 10, 20 km) höchstens 40 Treffer, damit die Antwort klein bleibt.
 */
export async function findNearbyShops(): Promise<{ shops: Shop[]; inside: boolean }> {
  const pos = await getPosition()
  const { latitude: lat, longitude: lon, accuracy } = pos.coords

  // Gleiche Stelle (< 50 m) innerhalb von 5 Minuten: letztes Ergebnis wiederverwenden
  const lastResult = readLast()
  if (lastResult && Date.now() - lastResult.at < CACHE_MS && meters(lat, lon, lastResult.lat, lastResult.lon) < 50)
    return lastResult.result

  // GPS ist in Gebäuden ungenau: Radius an die Genauigkeit anpassen (mind. 75 m, höchstens 400 m)
  const radius = Math.min(400, Math.max(75, Math.round(accuracy * 1.5)))
  const at = `${lat},${lon}`
  const query = `[out:json][timeout:25];
nwr(around:${radius},${at})["shop"~"^(supermarket|convenience|greengrocer|chemist)$"];out center tags 30;
${FAR_STEPS_M.map((r) => `nwr(around:${r},${at})["shop"="supermarket"];out center tags 40;`).join('\n')}`

  const seen = new Set<string>()
  const all = (await runQuery(query))
    .map((el): (Shop & { rank: number }) | null => {
      const id = `${el.type}/${el.id}`
      const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null)
      const tags = el.tags ?? {}
      const name: string | undefined = tags.name ?? tags.brand
      if (!p || !name || seen.has(id)) return null
      seen.add(id)
      return {
        id,
        name,
        brand: (tags.brand as string | undefined) ?? null,
        distance: meters(lat, lon, p.lat, p.lon),
        rank: tags.shop === 'supermarket' ? 0 : 1, // Supermärkte vor Kiosken, Drogerien usw.
      }
    })
    .filter((s): s is Shop & { rank: number } => !!s)

  const strip = ({ rank: _rank, ...shop }: Shop & { rank: number }): Shop => shop
  const close = all.filter((s) => s.distance <= radius).sort((a, b) => a.rank - b.rank || a.distance - b.distance)
  const result = close.length
    ? { shops: close.map(strip), inside: true }
    : {
        shops: all
          .filter((s) => s.rank === 0)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5)
          .map(strip),
        inside: false,
      }
  writeLast({ at: Date.now(), lat, lon, result })
  return result
}

function formatDistance(m: number) {
  if (m < 1000) return `${m} m`
  if (m >= 10_000) return `${Math.round(m / 1000)} km`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
export { formatDistance }

// ---------- Gewählter Laden pro Liste (nur auf diesem Gerät, 3 Stunden gültig) ----------

const VALID_MS = 3 * 60 * 60 * 1000

export function getChosenShop(listId: string): Shop | null {
  try {
    const raw = localStorage.getItem(`rl:shop:${listId}`)
    if (!raw) return null
    const { at, shop } = JSON.parse(raw) as { at: number; shop: Shop }
    return Date.now() - at < VALID_MS ? shop : null
  } catch {
    return null
  }
}

export function setChosenShop(listId: string, shop: Shop | null) {
  try {
    if (shop) localStorage.setItem(`rl:shop:${listId}`, JSON.stringify({ at: Date.now(), shop }))
    else localStorage.removeItem(`rl:shop:${listId}`)
  } catch {
    /* egal */
  }
}

/** Kette als Tag für Open Food Facts: "Lidl" → "lidl", "El Corte Inglés" → "el-corte-ingles" */
export function shopTag(shop: Shop): string {
  return (shop.brand ?? shop.name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
