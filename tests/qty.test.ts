// Zusammenrechnen von Mengen bei doppelten Artikeln (D-045)
import { describe, expect, it } from 'vitest'
import { addQty, sumQty } from '../src/lib/qty'

describe('addQty', () => {
  it.each([
    [null, null, '2'],
    [null, '2', '3'],
    ['2', '3', '5'],
    ['2x', '1', '3'],
    ['500 g', '1 kg', '1,5 kg'],
    ['200 g', '300 g', '500 g'],
    ['1,5 l', '500 ml', '2 l'],
    ['33 cl', '33 cl', '660 ml'],
    ['2 Packungen', '1 Packungen', '3 Packungen'],
    ['1 Packung', '500 g', '1 Packung + 500 g'],
    [null, '500 g', '1 + 500 g'],
  ])('%s + %s = %s', (a, b, out) => {
    expect(addQty(a, b)).toBe(out)
  })
})

describe('sumQty', () => {
  it('fasst mehrere Mengen zusammen', () => {
    expect(sumQty([null, null, '2'])).toBe('4')
    expect(sumQty(['250 g'])).toBe('250 g')
    expect(sumQty([null])).toBeNull()
  })
})
