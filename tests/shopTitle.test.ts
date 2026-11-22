import { describe, expect, it } from 'vitest'
import { shopTitle, type Shop } from '../src/lib/nearby'

const base: Shop = { id: 'n1', name: 'Coop', brand: 'Coop', lat: 47.39, lon: 8.53, distance: 50 } as Shop

describe('shopTitle (D-103)', () => {
  it('nimmt die Filiale', () => {
    expect(shopTitle({ ...base, branch: 'Wipkingen', street: 'Scheffelstrasse 3' })).toBe('Coop Wipkingen')
  })
  it('sonst die Strasse ohne Hausnummer', () => {
    expect(shopTitle({ ...base, street: 'Scheffelstrasse 3' })).toBe('Coop Scheffelstrasse')
    expect(shopTitle(base, 'Röschibachstrasse 12a')).toBe('Coop Röschibachstrasse')
  })
  it('ergänzt auch Untermarken, aber nichts doppelt', () => {
    expect(shopTitle({ ...base, name: 'Coop City', street: 'Bahnhofstrasse 57' })).toBe('Coop City Bahnhofstrasse')
    expect(shopTitle({ ...base, name: 'Migros Limmatplatz', branch: 'Limmatplatz' })).toBe('Migros Limmatplatz')
    expect(shopTitle(base)).toBe('Coop')
  })
})
