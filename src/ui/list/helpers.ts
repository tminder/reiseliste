// Hilfen der Listenansicht: Ladenbesuch, gleicher Artikel (D-045), abgelehnter Länderwechsel (D-040)
import { exactConcept, normalize } from '../../lib/translate'
import { type Item } from '../../lib/store'

// Wartezeiten zwischen automatischen neuen Versuchen, wenn OpenStreetMap ausgelastet ist (danach alle 5 Min.)
export const RETRY_S = [15, 30, 60, 120, 300]

export const DAY_MS = 24 * 60 * 60 * 1000

/** Als Ladenbesuch zählt nur, wer höchstens so weit vom Laden entfernt ist, bei genügend genauem GPS (D-043) */
export const VISIT_RADIUS_M = 100
export const VISIT_ACCURACY_M = 100

/** Letzter Ladenbesuch pro Liste (D-043), nur auf diesem Gerät, höchstens 12 Stunden gültig.
 *  Schlüssel „rl:shopvisit“: ältere Einträge („rl:visit“) wurden auch ohne echten Besuch gespeichert und gelten nicht mehr. */
type Visit = { lat: number; lon: number; at: number }
export function readVisit(listId: string): Visit | null {
  try {
    const v = JSON.parse(localStorage.getItem(`rl:shopvisit:${listId}`) ?? 'null') as Visit | null
    return v && Date.now() - v.at < 12 * 60 * 60 * 1000 ? v : null
  } catch {
    return null
  }
}
export function saveVisit(listId: string, v: Visit | null) {
  try {
    if (v) localStorage.setItem(`rl:shopvisit:${listId}`, JSON.stringify(v))
    else localStorage.removeItem(`rl:shopvisit:${listId}`)
  } catch {
    /* egal */
  }
}

/** Gleicher Artikel = gleicher Wörterbuch-Eintrag, sonst gleicher Text (D-045) */
/**
 * Gleicher Artikel (D-045): derselbe Wörterbuch-Eintrag, aber nur wenn der Text genau dazu passt.
 * „Schwarze Schokolade“ wurde früher über das enthaltene Wort „Schokolade“ zugeordnet und darf nicht mit „Schokolade“ verschmelzen.
 */
export function dupKey(i: Item): string {
  if (i.conceptId && exactConcept(i.text, i.lang) === i.conceptId) return i.conceptId
  return normalize(i.text)
}

/** „Rückgängig“ beim automatischen Reiseland (D-040): für diese Liste und dieses Land nicht mehr automatisch wechseln */
export function countryChangeDeclined(listId: string, code: string): boolean {
  try {
    return localStorage.getItem(`rl:nocountry:${listId}:${code}`) === '1'
  } catch {
    return false
  }
}
export function declineCountryChange(listId: string, code: string) {
  try {
    localStorage.setItem(`rl:nocountry:${listId}:${code}`, '1')
  } catch {
    /* egal */
  }
}
