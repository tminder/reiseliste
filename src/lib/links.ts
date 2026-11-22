// Listen-Links in der installierten iPhone-App öffnen (D-037).
// iOS öffnet Links immer in Safari, nie in der Web-App vom Home-Bildschirm, und beide haben getrennten Speicher.

const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

/** Listen-ID aus einem eingefügten Link (oder der nackten ID) */
export function listIdFrom(text: string): string | null {
  return text.match(UUID)?.[1]?.toLowerCase() ?? null
}

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Läuft die App vom Home-Bildschirm (eigenes Fenster)? */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export const listUrl = (id: string) => `${location.origin}${location.pathname}#/l/${id}`

export const isAndroid = () => /Android/i.test(navigator.userAgent)

/** Beim Start gemerkt: Kam man über einen Listen-Link, und war die Liste auf diesem Gerät noch unbekannt? */
const ENTRY = (() => {
  try {
    const id = location.hash.match(/^#\/l\/([0-9a-f-]{36})/i)?.[1]?.toLowerCase() ?? null
    const known = id ? (JSON.parse(localStorage.getItem('rl:lists') ?? '[]') as string[]).includes(id) : false
    return { id, known }
  } catch {
    return { id: null, known: true }
  }
})()

/** Wurde diese Liste über einen fremden Link geöffnet (nicht selbst angelegt oder schon gespeichert)? */
export const openedByLink = (id: string) => ENTRY.id === id && !ENTRY.known

/**
 * Laden in der Karten-App öffnen (D-101). iPhone: Schema `maps:` öffnet Apple Karten direkt – ein https-Link zu
 * maps.apple.com bleibt in der Home-Bildschirm-App im eingebauten Browser hängen. Android: `geo:` zeigt die Auswahl
 * der Karten-Apps. Sonst OpenStreetMap im Browser. `external`: nur die Web-Karte in neuem Tab öffnen.
 */
export type MapApp = 'apple' | 'google'

/** Auf dem iPhone gewählte Karten-App (D-101); null = noch nicht gewählt. Android und Computer brauchen keine Wahl. */
export function mapApp(): MapApp | null {
  try {
    const v = localStorage.getItem('rl:mapApp')
    return v === 'apple' || v === 'google' ? v : null
  } catch {
    return null
  }
}
export function setMapApp(v: MapApp | null) {
  try {
    if (v) localStorage.setItem('rl:mapApp', v)
    else localStorage.removeItem('rl:mapApp')
  } catch {
    /* egal */
  }
}
/** Muss vor dem Öffnen gefragt werden, welche Karten-App? (iPhone: Web kann nicht prüfen, welche installiert ist) */
export const needsMapChoice = () => isIos() && !mapApp()

export function mapLink(lat: number, lon: number, name: string, app: MapApp | null = mapApp()): { href: string; external: boolean } {
  const q = encodeURIComponent(name)
  if (isIos()) {
    // Google Maps über sein eigenes Schema; Apple Karten über `maps:` (D-101)
    if (app === 'google') return { href: `comgooglemaps://?q=${lat},${lon}&center=${lat},${lon}&zoom=17`, external: false }
    return { href: `maps://?ll=${lat},${lon}&q=${q}`, external: false }
  }
  if (isAndroid()) return { href: `geo:${lat},${lon}?q=${lat},${lon}(${q})`, external: false }
  return { href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`, external: true }
}
