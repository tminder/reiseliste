// Prüftabellen für Muttersprachler (D-053, S-001): eine CSV-Datei pro Sprache in review/.
// Aufruf: npm run review:export            (alle Sprachen)
//         npm run review:export -- es pt   (nur diese)
// Spalten: Artikel-ID, Abteilung, Deutsch, Englisch, Begriffe in der Sprache, Länder-Abweichungen,
// dann leer zum Ausfüllen: „Richtig? (ja/nein)“, „Besserer Begriff“, „Bemerkung“.
// Die CSV öffnet sich in Excel, Numbers und Google Sheets (UTF-8 mit BOM, Semikolon).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'src/data/dictionary'
const OUT = 'review'
const read = (name) => JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8'))

const concepts = read('concepts')
const files = readdirSync(DIR).map((f) => f.replace(/\.json$/, '')).filter((f) => f !== 'concepts')
const langs = files.filter((f) => !f.includes('-'))
const wanted = process.argv.slice(2)
const de = read('de')
const en = read('en')

const cell = (v) => {
  const s = String(v ?? '')
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const row = (cells) => cells.map(cell).join(';')

mkdirSync(OUT, { recursive: true })
for (const lang of langs) {
  if (wanted.length && !wanted.includes(lang)) continue
  const base = read(lang)
  const variants = files.filter((f) => f.startsWith(`${lang}-`)).map((v) => [v, read(v)])
  const lines = [
    row(['id', 'Abteilung', 'Deutsch', 'English', `Begriffe ${lang} (erster = Anzeige)`, 'Länder-Abweichungen', 'Hinweis', 'Richtig? (ja/nein)', 'Besserer Begriff', 'Bemerkung']),
  ]
  for (const c of concepts) {
    const names = base[c.id] ?? []
    const vars = variants.filter(([, n]) => n[c.id]).map(([v, n]) => `${v}: ${n[c.id].join(', ')}`)
    lines.push(row([c.id, c.category, de[c.id]?.[0], en[c.id]?.[0], names.join(', ') || '⚠ FEHLT', vars.join(' | '), c.hint?.[lang] ?? '', '', '', '']))
  }
  const path = join(OUT, `woerterbuch-${lang}.csv`)
  writeFileSync(path, '﻿' + lines.join('\r\n') + '\r\n')
  console.log(`${path}: ${concepts.length} Artikel`)
}
