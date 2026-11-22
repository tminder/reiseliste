// Öffnungszeiten aus OpenStreetMap (D-099)
import { describe, expect, it } from 'vitest'
import { openState, parseOpeningHours } from '../src/lib/openingHours'

// Sonntag, 22.11.2026; Montag 23.11.
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m)
const state = (raw: string, now: Date) => {
  const w = parseOpeningHours(raw)
  if (!w) return null
  const s = openState(w, now)
  const t = (x: Date | null) => (x ? `${x.getDate()}. ${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}` : null)
  return s.open ? `offen bis ${t(s.until)}` : `zu, öffnet ${t(s.next)}`
}

describe('Öffnungszeiten', () => {
  const coop = 'Mo-Fr 08:00-12:30,14:00-18:30; Sa 08:00-17:00; Su off'
  it.each([
    [coop, at(23, 9), 'offen bis 23. 12:30'],
    [coop, at(23, 13), 'zu, öffnet 23. 14:00'],
    [coop, at(22, 10), 'zu, öffnet 23. 8:00'], // Sonntag
    [coop, at(28, 18), 'zu, öffnet 30. 8:00'], // Samstag nach Ladenschluss
    ['Mo-Su 22:00-02:00', at(23, 1), 'offen bis 23. 2:00'], // über Mitternacht
    ['24/7', at(23, 3), 'offen bis null'],
    ['08:00-21:30', at(22, 21, 45), 'zu, öffnet 23. 8:00'],
    ['Mo-Sa 09:00-21:00; PH off', at(24, 20), 'offen bis 24. 21:00'],
  ])('%s @ %s', (raw, now, expected) => expect(state(raw, now)).toBe(expected))

  it('unbekannte Formate: nichts anzeigen', () => {
    expect(parseOpeningHours('Jan-Mar Mo-Fr 08:00-17:00')).toBeNull()
    expect(parseOpeningHours('sunrise-sunset')).toBeNull()
    expect(parseOpeningHours('')).toBeNull()
  })
})
