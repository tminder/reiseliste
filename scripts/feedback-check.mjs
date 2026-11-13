// Rückmeldungen zum Wörterbuch (D-059) aufbereiten: JSON aus Supabase → docs/woerterbuch-feedback.csv
// und bei „Begriff stimmt nicht“ mit Vorschlag nachsehen, ob die Begriffe in Produktnamen von Open Food Facts
// im Reiseland vorkommen (Zahl der Produkte). Läuft im Workflow „Wörterbuch-Feedback exportieren“.
// Aufruf: node scripts/feedback-check.mjs <eingabe.json> <ausgabe.csv> [--no-off]
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output, flag] = process.argv.slice(2)
const rows = JSON.parse(readFileSync(input, 'utf8'))
const checkOff = flag !== '--no-off'

// Länder → Open-Food-Facts-Tag, aus src/lib/photos.ts gelesen (eine Quelle)
const photos = readFileSync(new URL('../src/lib/photos.ts', import.meta.url), 'utf8')
const block = photos.slice(photos.indexOf('const OFF_COUNTRY'), photos.indexOf('}', photos.indexOf('const OFF_COUNTRY')))
const OFF_COUNTRY = Object.fromEntries([...block.matchAll(/'?([A-Z]{2}(?:-[A-Z]{2})?)'?: 'en:([a-z-]+)'/g)].map((m) => [m[1], m[2]]))

const MAX_LOOKUPS = 40 // Open Food Facts erlaubt rund 10 Suchen pro Minute
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cache = new Map()
let lookups = 0
async function offCount(term, country) {
  const tag = OFF_COUNTRY[country]
  if (!term || !tag) return ''
  const key = `${term}|${tag}`
  if (cache.has(key)) return cache.get(key)
  if (lookups >= MAX_LOOKUPS) return 'nicht geprüft'
  lookups++
  const params = new URLSearchParams({
    search_terms: term, search_simple: '1', json: '1', page_size: '1', fields: 'code',
    tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: tag,
  })
  let result = 'Fehler'
  try {
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { headers: { 'User-Agent': 'CartOnTheRoad-Feedback/1.0 (github.com/tminder/reiseliste)' } })
    if (res.ok) result = String((await res.json()).count ?? 0)
  } catch {
    /* bleibt „Fehler“ */
  }
  cache.set(key, result)
  await sleep(6500)
  return result
}

const cell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const head = ['kind', 'users', 'total', 'item_lang', 'item_text', 'concept_id', 'country', 'target_lang', 'term', 'suggestion', 'off_term', 'off_suggestion', 'last_at']
const lines = [head.join(',')]
for (const r of rows) {
  const wrong = r.kind === 'wrong'
  const offTerm = checkOff && wrong && r.suggestion ? await offCount(r.term, r.country) : ''
  const offSuggestion = checkOff && wrong && r.suggestion ? await offCount(r.suggestion, r.country) : ''
  lines.push([r.kind, r.users, r.total, r.item_lang, r.item_text, r.concept_id, r.country, r.target_lang, r.term, r.suggestion, offTerm, offSuggestion, r.last_at].map(cell).join(','))
}
writeFileSync(output, lines.join('\n') + '\n')
console.log(`${rows.length} Rückmeldungen, ${lookups} Abfragen bei Open Food Facts → ${output}`)
