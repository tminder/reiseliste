// Fotos aus Open Food Facts (D-010): jedes Reiseland braucht seinen Länder-Tag, sonst gibt es keine Treffer
import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../src/data/countries'
import { OFF_COUNTRY, toPhotos } from '../src/lib/photos'

describe('Länder für Open Food Facts', () => {
  it('jedes Land der App hat einen Länder-Tag', () => {
    const missing = COUNTRIES.map((c) => c.code).filter((code) => !OFF_COUNTRY[code])
    expect(missing).toEqual([])
  })
})

describe('Unpassende Unterkategorien', () => {
  it('Ketchup erscheint nicht bei Tomatensauce', () => {
    const img = 'https://images.openfoodfacts.org/x.jpg'
    const photos = toPhotos(
      [
        { code: '1', product_name: 'Ketchup', image_front_small_url: img, categories_tags: ['en:sauces', 'en:tomato-sauces', 'en:ketchup'] },
        { code: '2', product_name: 'Sugo', image_front_small_url: img, categories_tags: ['en:sauces', 'en:tomato-sauces'] },
      ],
      ['en:ketchup'],
    )
    expect(photos.map((p) => p.name)).toEqual(['Sugo'])
  })
})
