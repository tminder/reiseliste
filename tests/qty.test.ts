// Zusammenrechnen von Mengen bei doppelten Artikeln (D-045)
import { describe, expect, it } from 'vitest'
import { addQty, canAddQty, sumQty } from '../src/lib/qty'

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
    ['1 Packung', '500 g', null],
    [null, '500 g', null],
    ['2 × 100 g', '1 × 100 g', '3 × 100 g'],
    ['2 Packungen × 500 g', '2 Packungen × 500 g', '4 Packungen × 500 g'],
    ['2 × 100 g', '1 × 200 g', null],
    ['2 × 100 g', null, null],
    ['2', '2 × 100 g', null],
  ])('%s + %s = %s', (a, b, out) => {
    expect(addQty(a, b)).toBe(out)
  })
})

describe('canAddQty', () => {
  it('nur gleiche Einheiten und Packungsgrössen', () => {
    expect(canAddQty(null, '2')).toBe(true)
    expect(canAddQty('500 g', '1 kg')).toBe(true)
    expect(canAddQty('2', '2 × 100 g')).toBe(false)
    expect(canAddQty('2 × 100 g', '3 × 100 g')).toBe(true)
    expect(canAddQty('1 Packung', '500 g')).toBe(false)
  })
})

describe('sumQty', () => {
  it('fasst mehrere Mengen zusammen', () => {
    expect(sumQty([null, null, '2'])).toBe('4')
    expect(sumQty(['250 g'])).toBe('250 g')
    expect(sumQty([null])).toBeNull()
  })
})
