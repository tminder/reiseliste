// Änderungen als Felder (D-108)
import { describe, expect, it } from 'vitest'
import { acknowledge, enqueue, migrateOp, overlay, type Op } from '../src/lib/syncOps'

const op = (fields: Record<string, unknown>, insert = false): Op => ({ table: 'items', id: 'a', fields, ...(insert ? { insert } : {}) })

describe('Warteschlange pro Feld', () => {
  it('führt Änderungen derselben Zeile zusammen', () => {
    const q = enqueue(enqueue([], op({ text: 'Milch', checked: false }, true)), op({ checked: true }))
    expect(q).toEqual([op({ text: 'Milch', checked: true }, true)])
  })
  it('bestätigte Felder fallen weg, inzwischen geänderte bleiben', () => {
    const sent = op({ checked: true, updated_at: 't1' })
    const now = enqueue([sent], op({ qty: '2', updated_at: 't2' }))
    expect(acknowledge(now, sent)).toEqual([op({ qty: '2', updated_at: 't2' })])
    expect(acknowledge([sent], sent)).toEqual([])
  })
  it('während des Sendens erneut geändertes Feld bleibt stehen', () => {
    const sent = op({ checked: true })
    expect(acknowledge(enqueue([sent], op({ checked: false })), sent)).toEqual([op({ checked: false })])
  })
  it('noch nicht gesendete Felder gelten vor dem Server', () => {
    expect(overlay({ checked: false, qty: '1' }, op({ qty: '3' }))).toEqual({ checked: false, qty: '3' })
    expect(overlay({ checked: false }, undefined)).toEqual({ checked: false })
  })
  it('alte Einträge (ganze Zeilen) werden umgewandelt', () => {
    expect(migrateOp({ table: 'items', row: { id: 'a', text: 'Brot' } }, (_t, r) => ({ ...r }))).toEqual(op({ id: 'a', text: 'Brot' }, true))
    expect(migrateOp({ foo: 1 }, () => ({}))).toBeNull()
  })
})
