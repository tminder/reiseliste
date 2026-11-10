import { t } from '../i18n'
// Nächstgelegenen Supermarkt erkennen: Standort des Geräts + OpenStreetMap (Overpass API).
// Der Standort wird nur mit Erlaubnis abgefragt und an die Overpass API geschickt. Auf dem Gerät bleiben die Stelle der letzten Suche (12 h) und der gewählte Laden (D-033).

export interface Shop {
  id: string
  name: string
  brand: string | null
  distance: number // Meter
  supermarket?: boolean
  /** Lage des Ladens (für Distanz bei wiederverwendetem Ergebnis und „weggefahren?“, D-033) */
  lat?: number
  lon?: number
}

/** retry = true: vorübergehendes Problem (Server ausgelastet, kein Netz, GPS-Timeout) – später nochmal versuchen */
export class NearbyError extends Error {
  readonly retry: boolean
  /** Standort verweigert (oder in iOS für Safari-Websites ausgeschaltet) */
  readonly permission: boolean
  constructor(message: string, retry = false, permission = false) {
    super(message)
    this.retry = retry
    this.permission = permission
  }
}

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new NearbyError(t('errNoGeo')))
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED)
        reject(new NearbyError(t('errGeoDenied'), false, true))
      else reject(new NearbyError(t('errGeoFailed'), true))
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 })
  })
}

/** Abstand in Metern (Haversine) */
export function meters(lat1: number, lon1: number, lat2: number, lon2: number) {
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
  let lastError = t('errOsmUnreachable')
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }) })
      if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements
      lastError =
        res.status === 429 || res.status === 504
          ? t('errOsmBusy')
          : t('errOsmStatus', { status: res.status })
    } catch {
      // Netzwerkfehler – oder Überlastung: Overpass schickt bei 429 keine CORS-Header, der Browser meldet dann nur „failed to fetch“
      lastError = t('errOsmUnreachable')
    }
  }
  throw new NearbyError(lastError, true)
}

/** Suchstufen ausserhalb eines Ladens: der nächste Supermarkt wird bis FAR_RADIUS_M gesucht. */
export const FAR_STEPS_M = [1_000, 3_000, 10_000, 20_000]
export const FAR_RADIUS_M = FAR_STEPS_M[FAR_STEPS_M.length - 1]

// Läden ziehen nicht um: ein Ergebnis gilt, bis man sich wirklich bewegt hat (D-033)
const CACHE_MS = 12 * 60 * 60 * 1000
/** Ab dieser Strecke gilt man als „woanders“ (mindestens aber die GPS-Ungenauigkeit) */
const MOVED_M = 300
/** War man in einem Laden, reicht eine kürzere Strecke */
const MOVED_INSIDE_M = 150
export type NearbyResult = { shops: Shop[]; inside: boolean; accuracy?: number }
type LastResult = { at: number; lat: number; lon: number; accuracy?: number; result: NearbyResult }

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

/** Letztes Ergebnis (bis 12 h, ohne neue Standortabfrage) – wird sofort gezeigt, die Prüfung läuft im Hintergrund */
export function recentSuggestion(): NearbyResult | null {
  const last = readLast()
  return last && Date.now() - last.at < CACHE_MS ? last.result : null
}

/** Distanzen eines gespeicherten Ergebnisses auf den aktuellen Standort umrechnen */
function relocate(result: NearbyResult, lat: number, lon: number): NearbyResult {
  const shops = result.shops
    .map((s) => (s.lat != null && s.lon != null ? { ...s, distance: meters(lat, lon, s.lat, s.lon) } : s))
    .sort((a, b) => (result.inside ? 0 : a.distance - b.distance))
  return { ...result, shops }
}

/**
 * Läden in der Nähe – eine einzige Anfrage an OpenStreetMap (schont die Server, vermeidet Sperren).
 * `inside` = true: Läden im Umkreis der GPS-Genauigkeit (man ist wohl drin), alle Ladenarten, Supermärkte zuerst.
 * Sonst die nächsten Supermärkte; pro Stufe (1, 3, 10, 20 km) höchstens 40 Treffer, damit die Antwort klein bleibt.
 */
export async function findNearbyShops(force = false): Promise<NearbyResult & { fresh: boolean }> {
  const pos = await getPosition()
  const { latitude: lat, longitude: lon, accuracy } = pos.coords

  // Nicht wirklich bewegt (GPS-Sprünge in Gebäuden eingerechnet): letztes Ergebnis wiederverwenden, keine Anfrage
  const lastResult = readLast()
  if (!force && lastResult && Date.now() - lastResult.at < CACHE_MS) {
    const moved = meters(lat, lon, lastResult.lat, lastResult.lon)
    const limit = Math.max(lastResult.result.inside ? MOVED_INSIDE_M : MOVED_M, accuracy, lastResult.accuracy ?? 0)
    if (moved <= limit) return { ...relocate(lastResult.result, lat, lon), accuracy, fresh: false }
  }

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
        lat: p.lat,
        lon: p.lon,
        rank: tags.shop === 'supermarket' ? 0 : 1, // Supermärkte vor Kiosken, Drogerien usw.
      }
    })
    .filter((s): s is Shop & { rank: number } => !!s)

  const strip = ({ rank, ...shop }: Shop & { rank: number }): Shop => ({ ...shop, supermarket: rank === 0 })
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
  writeLast({ at: Date.now(), lat, lon, accuracy, result })
  return { ...result, accuracy, fresh: true }
}

function formatDistance(m: number) {
  if (m < 1000) return `${m} m`
  if (m >= 10_000) return `${Math.round(m / 1000)} km`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
export { formatDistance }

// ---------- Gewählter Laden pro Liste (nur auf diesem Gerät) ----------
// Gilt, solange man in der Nähe ist (D-033); ohne bekannte Lage (ältere Einträge) höchstens 3 Stunden.

const VALID_MS = 3 * 60 * 60 * 1000
const VALID_WITH_POS_MS = 24 * 60 * 60 * 1000
/** Weiter weg als das: gewählter Laden wird verworfen */
export const LEFT_SHOP_M = 1_000

export function getChosenShop(listId: string): Shop | null {
  try {
    const raw = localStorage.getItem(`rl:shop:${listId}`)
    if (!raw) return null
    const { at, shop } = JSON.parse(raw) as { at: number; shop: Shop }
    return Date.now() - at < (shop.lat != null ? VALID_WITH_POS_MS : VALID_MS) ? shop : null
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

// ---------- Automatischer Wechsel in die Ladenansicht ----------

/** Supermarkt sehr nahe und GPS genau genug → man ist wohl drin */
export function isInsideSupermarket(r: NearbyResult): Shop | null {
  const first = r.shops[0]
  if (!r.inside || !first?.supermarket) return null
  if (first.distance > 50 || (r.accuracy ?? 999) > 60) return null
  return first
}

const NO_AUTO_MS = 3 * 60 * 60 * 1000
/** Nutzer hat „zurück“ getippt: bei diesem Laden 3 Stunden nicht mehr automatisch wechseln */
export function autoShopModeBlocked(shopId: string): boolean {
  try {
    const at = Number(localStorage.getItem(`rl:noauto:${shopId}`) ?? 0)
    return Date.now() - at < NO_AUTO_MS
  } catch {
    return false
  }
}
export function blockAutoShopMode(shopId: string) {
  try {
    localStorage.setItem(`rl:noauto:${shopId}`, String(Date.now()))
  } catch {
    /* egal */
  }
}
