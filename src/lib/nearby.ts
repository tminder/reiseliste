// Nächstgelegenen Supermarkt erkennen: Standort des Geräts + OpenStreetMap (Overpass API).
// Der Standort wird nur auf Knopfdruck (oder bei bereits erteilter Erlaubnis beim Öffnen) abgefragt,
// an die Overpass API geschickt und nirgends gespeichert. Gespeichert wird nur der gewählte Laden, lokal pro Liste.

export interface Shop {
  id: string
  name: string
  brand: string | null
  distance: number // Meter
}

export class NearbyError extends Error {}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new NearbyError('Dieses Gerät kann den Standort nicht bestimmen.'))
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED)
        reject(new NearbyError('Standort nicht freigegeben. Du kannst ihn in den Browser-Einstellungen erlauben.'))
      else reject(new NearbyError('Standort konnte nicht bestimmt werden.'))
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

async function overpass(lat: number, lon: number, radius: number, shopTypes: string, limit: number) {
  const query = `[out:json][timeout:25];
nwr(around:${radius},${lat},${lon})["shop"~"^(${shopTypes})$"];
out center tags ${limit};`
  let res: Response
  try {
    res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
    })
  } catch {
    throw new NearbyError('Keine Verbindung zu OpenStreetMap.')
  }
  if (res.status === 429 || res.status === 504) throw new NearbyError('OpenStreetMap ist gerade ausgelastet. Bitte gleich nochmal.')
  if (!res.ok) throw new NearbyError(`OpenStreetMap antwortet nicht (${res.status}).`)

  const data = (await res.json()) as {
    elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[]
  }
  return data.elements
    .map((el): (Shop & { rank: number }) | null => {
      const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null)
      const tags = el.tags ?? {}
      const name: string | undefined = tags.name ?? tags.brand
      if (!p || !name) return null
      return {
        id: `${el.type}/${el.id}`,
        name,
        brand: (tags.brand as string | undefined) ?? null,
        distance: meters(lat, lon, p.lat, p.lon),
        // Supermärkte vor Kiosken, Drogerien usw.
        rank: tags.shop === 'supermarket' ? 0 : 1,
      }
    })
    .filter((s): s is Shop & { rank: number } => !!s)
    .sort((a, b) => a.rank - b.rank || a.distance - b.distance)
    .map(({ rank: _rank, ...shop }) => shop)
}

/** Suchradius ausserhalb eines Ladens. TESTWEISE 20 km (S-024), vorgesehen sind 3 km. */
export const FAR_RADIUS_M = 20_000

/**
 * Läden in der Nähe. `inside` = true: Läden im Umkreis der GPS-Genauigkeit (man ist wohl drin).
 * Sonst die nächsten Supermärkte bis FAR_RADIUS_M Entfernung.
 */
export async function findNearbyShops(): Promise<{ shops: Shop[]; inside: boolean }> {
  const pos = await getPosition()
  const { latitude: lat, longitude: lon, accuracy } = pos.coords
  // GPS ist in Gebäuden ungenau: Suchradius an die Genauigkeit anpassen (mind. 75 m, höchstens 400 m)
  const radius = Math.min(400, Math.max(75, Math.round(accuracy * 1.5)))
  const close = await overpass(lat, lon, radius, 'supermarket|convenience|greengrocer|chemist', 30)
  if (close.length) return { shops: close, inside: true }
  const far = await overpass(lat, lon, FAR_RADIUS_M, 'supermarket', 200)
  return { shops: far.slice(0, 5), inside: false }
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
