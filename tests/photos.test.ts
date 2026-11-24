// Fotos aus Open Food Facts (D-010): jedes Reiseland braucht seinen Länder-Tag, sonst gibt es keine Treffer
import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../src/data/countries'
import { OFF_COUNTRY } from '../src/lib/photos'

describe('Länder für Open Food Facts', () => {
  it('jedes Land der App hat einen Länder-Tag', () => {
    const missing = COUNTRIES.map((c) => c.code).filter((code) => !OFF_COUNTRY[code])
    expect(missing).toEqual([])
  })
})
