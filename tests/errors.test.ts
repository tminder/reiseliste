// Fehlerüberwachung (D-051): keine Listeninhalte in Meldungen
import { describe, expect, it } from 'vitest'
import { sanitize } from '../src/lib/errors'

describe('sanitize', () => {
  it('entfernt zitierte Zeilen, Schlüsselwerte und Kennungen', () => {
    const msg =
      'new row for relation "items" violates check constraint "items_len" Failing row contains (5b0c…, Milch, 2x, de). Key (list_id)=(aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa) at #/l/11111111-2222-3333-4444-555555555555'
    const out = sanitize(msg, 500)
    expect(out).not.toContain('Milch')
    expect(out).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/)
    expect(out).toContain('Failing row contains (…)')
    expect(out).toContain('#/l/<id>')
  })
  it('kürzt', () => {
    expect(sanitize('x'.repeat(900), 500)).toHaveLength(500)
  })
})
