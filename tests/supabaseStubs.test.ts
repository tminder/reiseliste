// supabase-js mit Platzhaltern für Speicher und Functions (vite.config.ts): Client entsteht, Datenbank-Teile da
import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('supabase-js ohne Speicher und Functions', () => {
  it('Client lässt sich anlegen, Abfragen, Echtzeit und Anmeldung sind vorhanden', () => {
    const c = createClient('https://example.supabase.co', 'sb_publishable_test', { auth: { persistSession: false } })
    expect(typeof c.from('lists').select).toBe('function')
    expect(typeof c.rpc).toBe('function')
    expect(typeof c.channel).toBe('function')
    expect(typeof c.auth.signInAnonymously).toBe('function')
    expect(() => c.storage.from('x')).toThrow(/nicht eingebunden/)
  })
})
