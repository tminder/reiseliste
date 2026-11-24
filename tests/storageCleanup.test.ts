// Gerätespeicher aufräumen (D-106)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tidyStorage } from '../src/lib/storageCleanup'

let store: Map<string, string>
beforeEach(() => {
  store = new Map()
  vi.stubGlobal('localStorage', {
    get length() {
      return store.size
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

const DAY = 24 * 60 * 60 * 1000

describe('tidyStorage', () => {
  it('löscht Altes und Abgelaufenes, behält Listen und Warteschlange', () => {
    const now = Date.now()
    store.set('rl:lists', JSON.stringify(['a']))
    store.set('rl:list:a', '{}')
    store.set('rl:queue', '[]')
    store.set('rl:profile', '{}')
    store.set('rl:nearby4', '{}')
    store.set('rl:photos2:ES:*:x', '{}')
    store.set('rl:photos4:ES:alt', JSON.stringify({ at: now - 100 * DAY, photos: [] }))
    store.set('rl:photos4:ES:neu', JSON.stringify({ at: now, photos: [] }))
    store.set('rl:rate:EUR-CHF', JSON.stringify({ rate: 0.94, at: now - 200 * DAY }))
    store.set('rl:shop:a', '{}')
    store.set('rl:shop:weg', '{}')
    store.set('rl:nocountry:weg:FR', '1')
    tidyStorage()
    expect([...store.keys()].sort()).toEqual(['rl:list:a', 'rl:lists', 'rl:photos4:ES:neu', 'rl:profile', 'rl:queue', 'rl:shop:a'])
  })

  it('begrenzt die Fotos auf die neuesten 300', () => {
    for (let i = 0; i < 310; i++) store.set(`rl:photos4:ES:${i}`, JSON.stringify({ at: Date.now() - i * 1000, photos: [] }))
    tidyStorage()
    const left = [...store.keys()].filter((k) => k.startsWith('rl:photos4:'))
    expect(left).toHaveLength(300)
    expect(left).not.toContain('rl:photos4:ES:309')
  })

  it('Speicher voll: alle Zwischenspeicher weg', () => {
    store.set('rl:queue', '[]')
    store.set('rl:photos4:ES:neu', JSON.stringify({ at: Date.now(), photos: [] }))
    store.set('rl:streets', '{"n/1":"Bahnhofstrasse 1"}')
    store.set('rl:nearby5', '{}')
    tidyStorage(true)
    expect([...store.keys()]).toEqual(['rl:queue'])
  })
})
