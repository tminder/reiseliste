// Reiseland erkennen (D-087): Ergebnis gilt nur am gleichen Ort, nach einer Reise wird neu bestimmt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const position = vi.fn()
vi.mock('../src/lib/nearby', async (orig) => ({ ...(await orig<typeof import('../src/lib/nearby')>()), getPosition: () => position() }))
const { detectCountry } = await import('../src/lib/country')

const at = (latitude: number, longitude: number) => position.mockResolvedValue({ coords: { latitude, longitude, accuracy: 20 } })
const answer = (country_code: string, state = '') =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ address: { country_code, state } }) })

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  position.mockReset()
})

describe('detectCountry', () => {
  it('nach der Reise von Barcelona nach Zürich: sofort neu bestimmt', async () => {
    at(41.39, 2.17)
    vi.stubGlobal('fetch', answer('es'))
    expect(await detectCountry()).toBe('ES')
    at(47.37, 8.54)
    const f = answer('ch', 'Zurich')
    vi.stubGlobal('fetch', f)
    expect(await detectCountry()).toBe('CH-DE')
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('am gleichen Ort: keine neue Anfrage', async () => {
    at(41.39, 2.17)
    const f = answer('es')
    vi.stubGlobal('fetch', f)
    await detectCountry()
    at(41.392, 2.171)
    expect(await detectCountry(5 * 60 * 1000)).toBe('ES')
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('ohne Standort: letztes Ergebnis', async () => {
    at(41.39, 2.17)
    vi.stubGlobal('fetch', answer('es'))
    await detectCountry()
    position.mockRejectedValue(new Error('denied'))
    expect(await detectCountry()).toBe('ES')
  })
})
