// Änderungen als Felder statt ganzer Zeilen (D-108): Ändern zwei Geräte gleichzeitig verschiedene Felder
// desselben Artikels (das eine hakt ab, das andere ändert die Menge), bleiben beide Änderungen erhalten. Nur beim selben
// Feld gilt die zuletzt gesendete. Reine Funktionen, ohne Speicher und Netz, darum einzeln getestet.

export type Table = 'lists' | 'items'
/** Ausstehende Änderung einer Zeile: Spalten wie in der Datenbank. insert = Zeile ist neu (alle Spalten dabei). */
export type Op = { table: Table; id: string; fields: Record<string, unknown>; insert?: boolean }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Neue Änderung in die Warteschlange: pro Zeile ein Eintrag, Felder zusammengeführt */
export function enqueue(ops: Op[], op: Op): Op[] {
  const i = ops.findIndex((o) => o.table === op.table && o.id === op.id)
  if (i === -1) return [...ops, op]
  const merged: Op = { ...ops[i], fields: { ...ops[i].fields, ...op.fields }, ...(ops[i].insert || op.insert ? { insert: true } : {}) }
  return ops.map((o, k) => (k === i ? merged : o))
}

/**
 * Gesendet (sent) und vom Server bestätigt: diese Felder aus der Warteschlange nehmen – ausser sie wurden inzwischen
 * erneut geändert (dann bleibt der neue Wert für den nächsten Versand). Bleibt nur der Zeitstempel übrig, ist die Zeile fertig.
 */
export function acknowledge(ops: Op[], sent: Op): Op[] {
  return ops.flatMap((o) => {
    if (o.table !== sent.table || o.id !== sent.id) return [o]
    const fields = Object.fromEntries(Object.entries(o.fields).filter(([k, v]) => !(k in sent.fields && same(v, sent.fields[k]))))
    if (!Object.keys(fields).filter((k) => k !== 'updated_at').length) return []
    const rest: Op = { table: o.table, id: o.id, fields }
    return [o.insert && !sent.insert ? { ...rest, insert: true } : rest]
  })
}

/** Ausstehende Felder über einen Stand vom Server legen: Was hier noch nicht gesendet ist, gilt vor dem Server */
export function overlay(remote: Record<string, unknown>, pending: Op | undefined): Record<string, unknown> {
  return pending ? { ...remote, ...pending.fields } : remote
}

/** Ältere Warteschlange (ganze Zeilen, vor D-108) in Felder umwandeln */
export function migrateOp(op: unknown, toRemote: (table: Table, row: { id: string }) => Record<string, unknown>): Op | null {
  const o = op as { table?: Table; row?: { id: string }; id?: string; fields?: Record<string, unknown> }
  if (!o?.table) return null
  if (o.fields && o.id) return o as Op
  if (o.row?.id) return { table: o.table, id: o.row.id, fields: toRemote(o.table, o.row), insert: true }
  return null
}
