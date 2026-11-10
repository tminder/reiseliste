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
