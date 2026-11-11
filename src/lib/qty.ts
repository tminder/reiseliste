// Mengen zusammenrechnen, wenn derselbe Artikel mehrmals auf die Liste kommt (D-045).
// Gerechnet wird nur, wenn es sicher geht (Stück, g/kg, ml/cl/l, gleiche Einheit), sonst „1 Packung + 500 g“.

type Parsed = { n: number; unit: string } // unit: '' = Stück, 'g', 'ml' oder die Einheit als Text

const COUNT = new Set(['', 'x', '×', 'stk', 'stück', 'st', 'pcs'])

function parse(q: string | null): Parsed | null {
  if (q === null || !q.trim()) return { n: 1, unit: '' } // ohne Menge = 1 Stück
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

/** Zwei Mengen zusammenführen. null = keine Angabe (zählt als 1 Stück). */
export function addQty(a: string | null, b: string | null): string {
  const pa = parse(a)
  const pb = parse(b)
  if (pa && pb && pa.unit === pb.unit) return format({ n: pa.n + pb.n, unit: pa.unit })
  return [a ?? '1', b ?? '1'].map((x) => x.trim()).join(' + ')
}

/** Mehrere Mengen zusammenführen (für die zusammengefasste Anzeige) */
export function sumQty(list: (string | null)[]): string | null {
  if (list.length <= 1) return list[0] ?? null
  return list.slice(1).reduce<string>((acc, q) => addQty(acc, q), list[0] ?? '1')
}
