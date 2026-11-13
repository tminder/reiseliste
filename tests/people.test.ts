// Teilnehmer in der Listenübersicht: andere Mitglieder nach jüngster Aktivität
import { describe, expect, it } from 'vitest'
import { rankPeople } from '../src/lib/people'

const me = { name: 'Tobias', lang: 'de' as const, userId: 'u-me' }

describe('rankPeople', () => {
  it('ordnet nach jüngster Aktivität und blendet mich aus', () => {
    const members = [
      { user_id: 'u-me', name: 'Tobias', lang: 'de' as const, joined_at: '2026-11-01T10:00:00Z' },
      { user_id: 'u-a', name: 'Anna', lang: 'de' as const, joined_at: '2026-11-01T11:00:00Z' },
      { user_id: 'u-b', name: 'Bea', lang: 'es' as const, joined_at: '2026-11-02T09:00:00Z' },
      { user_id: 'u-c', name: 'Carl', lang: 'en' as const, joined_at: '2026-11-01T12:00:00Z' },
    ]
    const items = [
      { author: 'Anna', created_at: '2026-11-10T08:00:00Z', updated_at: '2026-11-10T08:00:00Z' },
      { author: 'Tobias', created_at: '2026-11-12T08:00:00Z', updated_at: '2026-11-12T08:00:00Z' },
      { author: 'Bea', claimed_by: 'Carl', created_at: '2026-11-05T08:00:00Z', updated_at: '2026-11-11T08:00:00Z' },
    ]
    expect(rankPeople(members, items, me)).toEqual(['Carl', 'Anna', 'Bea'])
  })

  it('zeigt dieselbe Person auf mehreren Geräten nur einmal, auch mich nicht doppelt', () => {
    const members = [
      { user_id: 'u-me', name: 'Tobias', lang: 'de' as const },
      { user_id: 'u-me2', name: 'Tobias', lang: 'de' as const },
      { user_id: 'u-a', name: 'Anna', lang: 'de' as const },
      { user_id: 'u-a2', name: 'Anna', lang: 'de' as const },
      { user_id: 'u-x', name: null, lang: null },
    ]
    expect(rankPeople(members, [], me)).toEqual(['Anna'])
  })

  it('nimmt ohne Mitgliederliste die Autoren der Artikel', () => {
    const items = [
      { author: 'Anna', created_at: '2026-11-01T08:00:00Z' },
      { author: 'Tobias', created_at: '2026-11-03T08:00:00Z' },
      { author: 'Bea', created_at: '2026-11-02T08:00:00Z' },
    ]
    expect(rankPeople(null, items, me)).toEqual(['Bea', 'Anna'])
  })
})
