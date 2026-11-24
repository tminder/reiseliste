// Regeln der Ladenanzeige als reine Funktionen (S-056): ohne React, Standortabfrage oder Netz, darum einzeln testbar.
// Die Komponente ShopBar und findNearbyShops rufen sie nur auf.
import { parseOpeningHours, openState } from './openingHours'
import { CHOSEN_GRACE_MS, LEFT_SHOP_M, looksInside, meters, type Shop } from './nearby'

export type Pos = { lat: number; lon: number; accuracy: number }

/** „Im <Laden>“ höchstens so lange nach dem letzten Abhaken bzw. der Ankunft (D-078) */
export const ACTIVE_MS = 30 * 60 * 1000

/** Laut Öffnungszeiten sicher offen (unbekannte Zeiten zählen nicht, D-099) */
export function isOpenNow(shop: Shop, now = new Date()): boolean {
  const week = parseOpeningHours(shop.hours)
  return !!week && openState(week, now).open
}

/**
 * Vorgeschlagener Laden (D-099): steht man in einem Laden (inside), dieser; sonst der nächste, der sicher offen ist;
 * ist keiner sicher offen, der nächste.
 */
export function pickSuggestion(shops: Shop[], inside: boolean, now = new Date()): Shop | null {
  if (inside) return shops[0] ?? null
  return shops.find((s) => isOpenNow(s, now)) ?? shops[0] ?? null
}

/**
 * Gewählten Laden verwerfen? (D-033) Ja, wenn man weiter als limitM (mindestens die GPS-Ungenauigkeit) entfernt ist,
 * ausser in den ersten 30 Minuten nach der Wahl von Hand (oft geht man erst hin). Ohne Lage des Ladens: nie.
 */
export function shouldDropChosen(shop: Shop, chosenAt: number | null, pos: Pos, now = Date.now(), limitM = LEFT_SHOP_M): boolean {
  if (shop.lat == null || shop.lon == null) return false
  if (chosenAt && now - chosenAt < CHOSEN_GRACE_MS) return false
  return meters(pos.lat, pos.lon, shop.lat, shop.lon) > Math.max(limitM, pos.accuracy)
}

/**
 * „Im <Laden>“ statt Distanz? (D-078) Nur während des Einkaufs (bis 30 Minuten nach der letzten Aktivität) und wenn
 * der letzte Standort dieser Sitzung beim Laden liegt.
 */
export function showsInside(shop: Shop | null, activeAt: number | null, pos: Pos | null, now = Date.now()): boolean {
  if (!shop || activeAt == null || now - activeAt >= ACTIVE_MS || !pos) return false
  if (shop.lat == null || shop.lon == null) return false
  return looksInside(meters(pos.lat, pos.lon, shop.lat, shop.lon), pos.accuracy)
}

/** Ab dieser Strecke gilt man als „woanders“ (mindestens aber die GPS-Ungenauigkeit), D-033 */
export const MOVED_M = 300
/** War man in einem Laden, reicht eine kürzere Strecke */
export const MOVED_INSIDE_M = 150
/** Beim Beginn des Einkaufs (precise) schon ab hier neu suchen, D-046 */
export const MOVED_PRECISE_M = 75

/**
 * Letztes Suchergebnis wiederverwenden statt neu bei OpenStreetMap zu suchen? (D-033, D-102)
 * Ja, wenn man sich nicht wirklich bewegt hat: GPS-Sprünge in Gebäuden (Ungenauigkeit jetzt und damals) zählen nicht.
 */
export function canReuse(
  last: { at: number; lat: number; lon: number; accuracy?: number; inside: boolean },
  pos: Pos,
  opts: { precise: boolean; maxAgeMs: number; now?: number },
): boolean {
  const now = opts.now ?? Date.now()
  if (now - last.at >= opts.maxAgeMs) return false
  const moved = meters(pos.lat, pos.lon, last.lat, last.lon)
  const base = opts.precise ? MOVED_PRECISE_M : last.inside ? MOVED_INSIDE_M : MOVED_M
  const limit = Math.max(base, pos.accuracy, opts.precise ? 0 : (last.accuracy ?? 0))
  return moved <= limit
}
