// Längen-Grenzen, gleich wie die check-Bedingungen in supabase/schema.sql (S-038).
// Die App kürzt Eingaben vorher, damit die Datenbank nichts ablehnen muss.
export const MAX = {
  listName: 80,
  itemText: 200,
  qty: 40,
  personName: 40,
} as const

export const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s)
export const clipOrNull = (s: string | null | undefined, max: number) => (s == null ? null : clip(s, max))
