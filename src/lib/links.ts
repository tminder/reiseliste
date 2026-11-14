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
