// Regeln der Ladenanzeige (S-056): Schwellen aus D-033, D-046, D-078, D-099, D-102
import { describe, expect, it } from 'vitest'
import { canReuse, pickSuggestion, shouldDropChosen, showsInside, ACTIVE_MS } from '../src/lib/shopRules'
import type { Shop } from '../src/lib/nearby'

// 0.001° Breite ≈ 111 m
const at = (dLat: number) => ({ lat: 47.37 + dLat, lon: 8.54 })
const shop = (id: string, dLat: number, hours?: string): Shop => ({ id, name: id, brand: null, distance: Math.round(dLat * 111_000), ...at(dLat), ...(hours ? { hours } : {}) }) as Shop
const MON_11 = new Date(2026, 10, 23, 11, 0) // Montag
const SUN_11 = new Date(2026, 10, 22, 11, 0) // Sonntag

describe('pickSuggestion (D-099)', () => {
  const closedSunday = shop('nah', 0.001, 'Mo-Sa 08:00-20:00')
  const openDaily = shop('weiter', 0.003, 'Mo-Su 07:00-22:00')
  const unknown = shop('ohne', 0.002)
  it('nächster sicher offener Laden vor näherem geschlossenem', () => {
    expect(pickSuggestion([closedSunday, unknown, openDaily], false, SUN_11)?.id).toBe('weiter')
  })
  it('unter der Woche der nächste', () => {
    expect(pickSuggestion([closedSunday, unknown, openDaily], false, MON_11)?.id).toBe('nah')
  })
  it('keiner sicher offen: der nächste; im Laden: dieser', () => {
    expect(pickSuggestion([closedSunday, unknown], false, SUN_11)?.id).toBe('nah')
    expect(pickSuggestion([closedSunday, openDaily], true, SUN_11)?.id).toBe('nah')
    expect(pickSuggestion([], false)).toBeNull()
  })
})

describe('shouldDropChosen (D-033)', () => {
  const s = shop('coop', 0)
  const now = Date.now()
  it('bleibt in der Nähe, fällt weg ab 1 km', () => {
    expect(shouldDropChosen(s, null, { ...at(0.008), accuracy: 20 }, now)).toBe(false) // ~890 m
    expect(shouldDropChosen(s, null, { ...at(0.01), accuracy: 20 }, now)).toBe(true) // ~1,1 km
  })
  it('erste 30 Minuten nach der Wahl nie', () => {
    expect(shouldDropChosen(s, now - 10 * 60_000, { ...at(0.05), accuracy: 20 }, now)).toBe(false)
    expect(shouldDropChosen(s, now - 31 * 60_000, { ...at(0.05), accuracy: 20 }, now)).toBe(true)
  })
  it('beim Einkaufsbeginn schon ab 150 m, aber nicht unter der GPS-Ungenauigkeit', () => {
    expect(shouldDropChosen(s, null, { ...at(0.002), accuracy: 20 }, now, 150)).toBe(true) // ~220 m
    expect(shouldDropChosen(s, null, { ...at(0.002), accuracy: 300 }, now, 150)).toBe(false)
  })
})

describe('showsInside (D-078)', () => {
  const s = shop('coop', 0)
  const now = Date.now()
  it('nur während des Einkaufs und beim Laden', () => {
    expect(showsInside(s, now - 60_000, { ...at(0.0003), accuracy: 20 }, now)).toBe(true) // ~33 m
    expect(showsInside(s, null, { ...at(0.0003), accuracy: 20 }, now)).toBe(false)
    expect(showsInside(s, now - ACTIVE_MS, { ...at(0.0003), accuracy: 20 }, now)).toBe(false)
    expect(showsInside(s, now - 60_000, { ...at(0.002), accuracy: 20 }, now)).toBe(false) // ~220 m
    expect(showsInside(s, now - 60_000, null, now)).toBe(false)
  })
})

describe('canReuse (D-033, D-102)', () => {
  const now = Date.now()
  const last = { at: now - 60_000, ...at(0), accuracy: 20, inside: false }
  const week = 7 * 24 * 60 * 60 * 1000
  it('gleicher Ort: wiederverwenden, bis 7 Tage', () => {
    expect(canReuse(last, { ...at(0.002), accuracy: 20 }, { precise: false, maxAgeMs: week, now })).toBe(true) // ~220 m
    expect(canReuse({ ...last, at: now - week }, { ...at(0), accuracy: 20 }, { precise: false, maxAgeMs: week, now })).toBe(false)
  })
  it('ab 300 m neu, nach einem Laden ab 150 m, beim Einkaufsbeginn ab 75 m', () => {
    expect(canReuse(last, { ...at(0.003), accuracy: 20 }, { precise: false, maxAgeMs: week, now })).toBe(false) // ~330 m
    expect(canReuse({ ...last, inside: true }, { ...at(0.0015), accuracy: 20 }, { precise: false, maxAgeMs: week, now })).toBe(false) // ~170 m
    expect(canReuse(last, { ...at(0.001), accuracy: 20 }, { precise: true, maxAgeMs: week, now })).toBe(false) // ~110 m
  })
  it('GPS-Sprünge in Gebäuden zählen nicht', () => {
    expect(canReuse({ ...last, accuracy: 500 }, { ...at(0.004), accuracy: 30 }, { precise: false, maxAgeMs: week, now })).toBe(true) // ~440 m, damals ungenau
  })
})
