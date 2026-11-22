import { t } from '../i18n'
import { timeout } from './net'
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
  /** Öffnungszeiten aus OpenStreetMap (`opening_hours`), roh (D-099) */
  hours?: string
  /** Strasse und Hausnummer aus OpenStreetMap (D-101) */
  street?: string
  /** Filiale (`branch`), z. B. „Wipkingen“ (D-103) */
  branch?: string
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

/**
 * Zustimmung zum Standort in der App (D-066): 'yes' nach „Standort freigeben“, 'no' nach „Nicht jetzt“, null = noch nicht gefragt.
 * Ohne 'yes' fragt die App den Standort nicht ab, ausser der Browser hat ihn schon erlaubt.
 */
export function locationConsent(): 'yes' | 'no' | null {
  try {
    const v = localStorage.getItem('rl:locConsent')
    if (v === 'yes' || v === 'no') return v
    return localStorage.getItem('rl:locnotice') === '1' ? 'yes' : null // früherer Hinweis mit „OK“ bestätigt
  } catch {
    return null
  }
}
export function setLocationConsent(v: 'yes' | 'no') {
  try {
    localStorage.setItem('rl:locConsent', v)
  } catch {
    /* egal */
  }
}

/** maxAgeMs: wie alt eine zwischengespeicherte Position höchstens sein darf (Standard 1 Minute) */
export async function getPosition(maxAgeMs = 60_000): Promise<GeolocationPosition> {
  // Erst nach Zustimmung in der App fragen, damit die Rückfrage des Browsers nicht ohne Erklärung kommt (D-066)
  if (locationConsent() !== 'yes') {
    if (!(await locationAlreadyAllowed())) throw new NearbyError(t('errGeoDenied'), false, true)
    setLocationConsent('yes')
  }
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new NearbyError(t('errNoGeo')))
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED)
        reject(new NearbyError(t('errGeoDenied'), false, true))
      else reject(new NearbyError(t('errGeoFailed'), true))
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: maxAgeMs })
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
// Nur Betreiber aus der EU, beide in der Datenschutzerklärung genannt (S-025). Neue Server nur nach Prüfung des Betreibers.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter', // FOSSGIS e.V., Deutschland
  'https://overpass.private.coffee/api/interpreter', // Private.coffee, Verein nach österreichischem Recht
]

type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

async function runQuery(query: string): Promise<OsmElement[]> {
  let lastError = t('errOsmUnreachable')
  for (const url of ENDPOINTS) {
    try {
      // Zeitlimit: Die Abfrage selbst darf 25 s dauern (D-094)
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: timeout(35_000) })
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

// Läden ziehen nicht um: ein Ergebnis gilt, bis man sich wirklich bewegt hat (D-033, D-102).
// Als Vorschlag beim Start höchstens 12 Stunden alt (danach ist man oft woanders); zum Wiederverwenden am gleichen Ort 7 Tage.
const CACHE_MS = 12 * 60 * 60 * 1000
const REUSE_MS = 7 * 24 * 60 * 60 * 1000
/** Ab dieser Strecke gilt man als „woanders“ (mindestens aber die GPS-Ungenauigkeit) */
const MOVED_M = 300
/** War man in einem Laden, reicht eine kürzere Strecke */
const MOVED_INSIDE_M = 150
export type NearbyResult = { shops: Shop[]; inside: boolean; accuracy?: number }
type LastResult = { at: number; lat: number; lon: number; accuracy?: number; result: NearbyResult }

// Letztes Suchergebnis im lokalen Speicher – übersteht ein Neuladen der Seite.
// Schlüssel mit Version: Ergebnisse älterer Versionen neu suchen. Bei jedem neuen Feld der Läden erhöhen
// (2: Öffnungszeiten D-099, Ketten-Läden D-100; 3: Strasse D-101; 4: Filiale D-103).
const LAST_KEY = 'rl:nearby5'
function readLast(): LastResult | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    return raw ? (JSON.parse(raw) as LastResult) : null
  } catch {
    return null
  }
}
function writeLast(v: LastResult) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(v))
  } catch {
    /* egal */
  }
}

/** Letztes Ergebnis (bis 12 h, ohne neue Standortabfrage) – wird sofort gezeigt, die Prüfung läuft im Hintergrund */
export function recentSuggestion(): NearbyResult | null {
  const last = readLast()
  return last && Date.now() - last.at < CACHE_MS ? { ...last.result, accuracy: last.accuracy } : null
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
 * Sonst die nächsten Supermärkte und kleinen Läden einer Kette (D-100); pro Stufe (1, 3, 10, 20 km) höchstens 40 Treffer, damit die Antwort klein bleibt.
 */
/**
 * precise: Beginn des Einkaufs (D-046). Frischer Standort (höchstens 10 s alt), neue Suche schon ab
 * 75 m Abstand – in Städten liegen Läden oft nah beieinander. Ohne Ortswechsel keine neue Suche (D-102).
 */
/**
 * Ketten, deren kleine Läden in OpenStreetMap oft ohne Marke (`brand`) als „convenience“ eingetragen sind,
 * z. B. „Denner Express“ an der Landenbergstrasse in Zürich. Erkannt am ersten Wort des Namens (D-100).
 */
const CHAIN_NAMES =
  '^(Denner|Coop|Migros|Migrolino|Volg|Spar|Avec|Aldi|Lidl|Carrefour|Mercadona|Dia|Billa|Rewe|Edeka|Penny|Netto|Albert Heijn|Jumbo|Tesco|Sainsbury|Monoprix|Franprix|Intermarché|Auchan|Conad|Pam|Despar|Eurospin|Konzum|Tommy|Pingo Doce|Continente|Sklavenitis|AB)( |-|$)'
const CHAIN_RE = new RegExp(CHAIN_NAMES, 'i')

export async function findNearbyShops(force = false, precise = false): Promise<NearbyResult & { fresh: boolean; lat: number; lon: number }> {
  const pos = await getPosition(precise ? 10_000 : undefined)
  const { latitude: lat, longitude: lon, accuracy } = pos.coords

  // Nicht wirklich bewegt (GPS-Sprünge in Gebäuden eingerechnet): letztes Ergebnis wiederverwenden, keine Anfrage
  const lastResult = readLast()
  if (!force && lastResult && Date.now() - lastResult.at < REUSE_MS) {
    const moved = meters(lat, lon, lastResult.lat, lastResult.lon)
    const base = precise ? 75 : lastResult.result.inside ? MOVED_INSIDE_M : MOVED_M
    const limit = Math.max(base, accuracy, precise ? 0 : (lastResult.accuracy ?? 0))
    if (moved <= limit) return { ...relocate(lastResult.result, lat, lon), accuracy, lat, lon, fresh: false }
  }

  // GPS ist in Gebäuden ungenau: Radius an die Genauigkeit anpassen (mind. 75 m, höchstens 400 m)
  const radius = Math.min(400, Math.max(75, Math.round(accuracy * 1.5)))
  const at = `${lat},${lon}`
  const query = `[out:json][timeout:25];
nwr(around:${radius},${at})["shop"~"^(supermarket|convenience|greengrocer|chemist)$"];out center tags 30;
${FAR_STEPS_M.map((r) => `(nwr(around:${r},${at})["shop"="supermarket"];nwr(around:${r},${at})["shop"="convenience"]["brand"];nwr(around:${r},${at})["shop"="convenience"]["name"~"${CHAIN_NAMES}",i];);out center tags 40;`).join('\n')}`

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
        ...(tags.opening_hours ? { hours: tags.opening_hours } : {}),
        ...(tags.branch ? { branch: tags.branch } : {}),
        ...(tags['addr:street'] ? { street: `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}` } : {}),
        // Supermärkte und kleine Läden einer Kette (Denner Express, Coop Pronto, Migrolino …, D-100) vor Kiosken, Drogerien usw.
        rank: tags.shop === 'supermarket' || (tags.shop === 'convenience' && (!!tags.brand || CHAIN_RE.test(name))) ? 0 : 1,
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
  return { ...result, accuracy, lat, lon, fresh: true }
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
/** Ankunft im Supermarkt: höchstens 50 m vom Ladenpunkt, GPS auf 60 m genau (D-020) */
export const HERE_M = 50
export const HERE_ACCURACY_M = 60
export function isHere(distance: number | undefined, accuracy: number | undefined): boolean {
  return distance != null && distance <= HERE_M && (accuracy ?? 999) <= HERE_ACCURACY_M
}
/**
 * Anzeige „Im <Laden>“ (D-078): grosszügiger als die Ankunft, weil der Laden schon feststeht.
 * Im Gebäude ist GPS oft 50–100 m ungenau, und der Ladenpunkt liegt oft in der Gebäudemitte:
 * „im Laden“, solange der Laden innerhalb von 50 m oder innerhalb der GPS-Ungenauigkeit (höchstens 100 m) liegt.
 */
export function looksInside(distance: number, accuracy: number): boolean {
  return distance <= Math.max(HERE_M, Math.min(accuracy, 100))
}

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

/** Wann der Laden von Hand gewählt wurde (null = keiner gewählt) */
export function getChosenShopAt(listId: string): number | null {
  try {
    const raw = localStorage.getItem(`rl:shop:${listId}`)
    return raw ? (JSON.parse(raw) as { at: number }).at : null
  } catch {
    return null
  }
}

/** So lange gilt eine Wahl von Hand, egal wo man gerade ist (D-033): man wählt oft einen Laden, zu dem man erst hingeht */
export const CHOSEN_GRACE_MS = 30 * 60 * 1000

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

// ---------- Beim Öffnen im Supermarkt (D-020) ----------

/** Supermarkt sehr nahe und GPS genau genug → man ist wohl drin */
export function isInsideSupermarket(r: NearbyResult): Shop | null {
  const first = r.shops[0]
  if (!r.inside || !first?.supermarket) return null
  if (!isHere(first.distance, r.accuracy)) return null
  return first
}

// ---------- Adressen nachschlagen (D-101) ----------
// Viele Läden haben in OpenStreetMap keine eigene Adresse (z. B. in der Schweiz: Adresse am Gebäude oder als eigener Punkt).
// Fehlt sie, sucht die App beim Öffnen der Ladenauswahl die nächste Adresse im Umkreis von 40 m, in einer einzigen Anfrage
// für alle angezeigten Läden. Ergebnisse (auch „keine gefunden“) werden auf dem Gerät gespeichert.

const STREETS_KEY = 'rl:streets'
const STREET_RADIUS_M = 40

function readStreets(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STREETS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

/** Bekannte Strasse eines Ladens: aus dem Laden selbst oder nachgeschlagen; '' = keine gefunden, undefined = unbekannt */
export function knownStreet(shop: Shop): string | undefined {
  return shop.street ?? readStreets()[shop.id]
}

export async function lookupStreets(shops: Shop[]): Promise<Record<string, string>> {
  const saved = readStreets()
  const todo = shops.filter((s) => !s.street && saved[s.id] === undefined && s.lat != null && s.lon != null).slice(0, 8)
  if (!todo.length) return saved
  const query = `[out:json][timeout:15];(${todo
    .map((s) => `nwr(around:${STREET_RADIUS_M},${s.lat},${s.lon})["addr:street"]["addr:housenumber"];`)
    .join('')});out center tags 80;`
  const found = await runQuery(query)
  for (const s of todo) {
    let best: { d: number; street: string } | null = null
    for (const el of found) {
      const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null)
      const tags = el.tags ?? {}
      if (!p || !tags['addr:street']) continue
      const d = meters(s.lat!, s.lon!, p.lat, p.lon)
      if (d <= STREET_RADIUS_M && (!best || d < best.d)) best = { d, street: `${tags['addr:street']} ${tags['addr:housenumber'] ?? ''}`.trim() }
    }
    saved[s.id] = best?.street ?? ''
  }
  try {
    localStorage.setItem(STREETS_KEY, JSON.stringify(saved))
  } catch {
    /* egal */
  }
  return saved
}

/**
 * Name für die Ladenzeile (D-103): Filialen einer Kette unterscheidbar machen. „Coop“ → „Coop Wipkingen“ (Filiale aus
 * OpenStreetMap) bzw. „Coop Scheffelstrasse“ (Strasse ohne Hausnummer). Immer ergänzt, auch bei „Coop City“, weil
 * es mehrere davon geben kann; steht die Angabe schon im Namen, nicht doppelt.
 */
export function shopTitle(shop: Shop, street?: string): string {
  const name = shop.name
  if (shop.branch && !name.includes(shop.branch)) return `${name} ${shop.branch}`
  const streetName = (street ?? shop.street ?? '').replace(/\s+\d+\s*\w?$/, '').trim()
  if (streetName && !name.includes(streetName)) return `${name} ${streetName}`
  return name
}
