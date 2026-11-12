// Mengen zusammenrechnen, wenn derselbe Artikel mehrmals auf die Liste kommt (D-045).
// Gerechnet wird nur, wenn es sicher geht (Stück, g/kg, ml/cl/l, gleiche Einheit bzw. Packungsgrösse).
// Passt es nicht zusammen, bleiben die Einträge getrennte Zeilen.

type Parsed = { n: number; unit: string } // unit: '' = Stück, 'g', 'ml' oder die Einheit als Text

const COUNT = new Set(['', 'x', '×', 'stk', 'stück', 'st', 'pcs'])

function parse(q: string | null): Parsed | null {
  if (q === null || !q.trim()) return { n: 1, unit: '' } // ohne Menge = 1 Stück
  // „2 × 100 g“ oder „2 Packungen × 500 g“ (D-048): Anzahl zählt, Grösse gehört zur Einheit
  const c = q.trim().match(/^(\d+)\s*(.*?×\s*.+)$/u)
  if (c) return { n: Number(c[1]), unit: c[2].trim().replace(/\s+/g, ' ') }
  const m = q.trim().match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s].*)?$/u)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  const u = (m[2] ?? '').trim().toLowerCase().replace(/\.$/, '')
  if (COUNT.has(u)) return { n, unit: '' }
  if (u === 'g' || u === 'gr') return { n, unit: 'g' }
  if (u === 'kg') return { n: n * 1000, unit: 'g' }
  if (u === 'ml') return { n, unit: 'ml' }
  if (u === 'cl') return { n: n * 10, unit: 'ml' }
  if (u === 'l') return { n: n * 1000, unit: 'ml' }
  return { n, unit: (m[2] ?? '').trim() } // z. B. „Packungen“: nur mit genau derselben Einheit addierbar
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

function format({ n, unit }: Parsed): string {
  if (unit === '') return num(n)
  if (unit === 'g') return n >= 1000 ? `${num(n / 1000)} kg` : `${num(n)} g`
  if (unit === 'ml') return n >= 1000 ? `${num(n / 1000)} l` : `${num(n)} ml`
  return `${num(n)} ${unit}`
}

/** Lassen sich zwei Mengen sauber zusammenrechnen (gleiche Einheit bzw. gleiche Packungsgrösse)? null = keine Angabe (1 Stück). */
export function canAddQty(a: string | null, b: string | null): boolean {
  const pa = parse(a)
  const pb = parse(b)
  return !!pa && !!pb && pa.unit === pb.unit
}

/** Zwei Mengen zusammenführen. null = keine Angabe (zählt als 1 Stück). Passen sie nicht zusammen: null (D-045). */
export function addQty(a: string | null, b: string | null): string | null {
  const pa = parse(a)
  const pb = parse(b)
  if (pa && pb && pa.unit === pb.unit) return format({ n: pa.n + pb.n, unit: pa.unit })
  return null
}
