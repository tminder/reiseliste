// Gerätespeicher aufräumen (D-106). Der localStorage fasst je nach Browser nur etwa 5 MB. Zwischenspeicher
// (Fotos, Adressen, Kurse) wachsen mit jeder Reise; ist der Speicher voll, scheitert auch das Speichern der
// Warteschlange mit offline gemachten Änderungen. Darum: beim Start Abgelaufenes und Altes löschen, Zwischenspeicher
// begrenzen, und wenn trotzdem nichts mehr geht, alle Zwischenspeicher leeren und nochmals versuchen.

const DAY = 24 * 60 * 60 * 1000
const PHOTOS_MAX = 300
const PHOTOS_TTL = 90 * DAY
const STREETS_MAX = 500
const RATE_TTL = 90 * DAY
/** Einstellungen pro Liste, die nach „Liste entfernen“ übrig bleiben könnten */
const PER_LIST = ['rl:shop:', 'rl:shopvisit:', 'rl:nocountry:', 'rl:hideNames:', 'rl:people:', 'rl:sole:']

function keys(): string[] {
  const out: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k) out.push(k)
  }
  return out
}

function atOf(raw: string | null): number {
  try {
    const v = raw ? (JSON.parse(raw) as { at?: number }) : null
    return typeof v?.at === 'number' ? v.at : 0
  } catch {
    return 0
  }
}

/**
 * aggressive: Speicher voll – alle Zwischenspeicher weg (Fotos, Adressen, Kurse, letzte Ladensuche).
 * Listen, Profil, Warteschlange und Einstellungen bleiben immer.
 */
export function tidyStorage(aggressive = false) {
  try {
    const now = Date.now()
    const all = keys()
    const lists = new Set<string>(JSON.parse(localStorage.getItem('rl:lists') ?? '[]') as string[])
    const drop = (k: string) => localStorage.removeItem(k)

    // Frühere Versionen von Zwischenspeichern
    for (const k of all) if (/^rl:nearby[0-4]?$/.test(k) || /^rl:photos[23]?:/.test(k)) drop(k)

    // Fotos: abgelaufene weg, sonst die neuesten 300
    const photos = all.filter((k) => k.startsWith('rl:photos4:')).map((k) => ({ k, at: atOf(localStorage.getItem(k)) }))
    photos.sort((a, b) => b.at - a.at)
    photos.forEach((p, i) => {
      if (aggressive || now - p.at > PHOTOS_TTL || i >= PHOTOS_MAX) drop(p.k)
    })

    // Kurse
    for (const k of all) if (k.startsWith('rl:rate:') && (aggressive || now - atOf(localStorage.getItem(k)) > RATE_TTL)) drop(k)

    // Adressen: die zuletzt nachgeschlagenen behalten
    const streets = localStorage.getItem('rl:streets')
    if (streets) {
      if (aggressive) drop('rl:streets')
      else {
        const entries = Object.entries(JSON.parse(streets) as Record<string, string>)
        if (entries.length > STREETS_MAX) localStorage.setItem('rl:streets', JSON.stringify(Object.fromEntries(entries.slice(-STREETS_MAX))))
      }
    }
    if (aggressive) drop('rl:nearby5')

    // Einstellungen von Listen, die nicht mehr auf dem Gerät sind
    for (const k of all) {
      const prefix = PER_LIST.find((p) => k.startsWith(p))
      if (!prefix) continue
      const id = k.slice(prefix.length).split(':')[0]
      if (id && !lists.has(id)) drop(k)
    }
  } catch {
    /* Speicher gesperrt oder unlesbar: beim nächsten Start wieder */
  }
}
