// Fotos aus Open Food Facts (D-010): jedes Reiseland braucht seinen Länder-Tag, sonst gibt es keine Treffer
import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../src/data/countries'
import { OFF_COUNTRY, pick } from '../src/lib/photos'

describe('Länder für Open Food Facts', () => {
  it('jedes Land der App hat einen Länder-Tag', () => {
    const missing = COUNTRIES.map((c) => c.code).filter((code) => !OFF_COUNTRY[code])
    expect(missing).toEqual([])
  })
})

describe('Produkte der Kette vorziehen', () => {
  const p = (code: string, stores: string[]) => ({ code, name: code, brand: '', image: '', url: '', stores })
  const all = [p('1', ['lidl']), p('2', ['carrefour']), p('3', ['carrefour-express'])]
  it('genauer Name oder erstes Wort der Kette', () => {
    expect(pick(all, 'carrefour-express').photos.map((x) => x.code)).toEqual(['2', '3'])
    expect(pick(all, 'carrefour-express').fromStore).toBe(true)
  })
  it('ohne Treffer: die üblichen im Land', () => {
    expect(pick(all, 'mercadona')).toEqual({ photos: all, fromStore: false })
  })
})
