// Pinyin für alle chinesischen Begriffe des Wörterbuchs erzeugen (D-092).
// Aufruf nach Änderungen an src/data/dictionary/zh.json:  node scripts/pinyin.mjs
// Ergebnis: src/data/zh-pinyin.json (Begriff → Pinyin mit Tonzeichen). Der Test meldet fehlende Einträge.
import { readFileSync, writeFileSync } from 'node:fs'
import { pinyin } from 'pinyin-pro'

const zh = JSON.parse(readFileSync('src/data/dictionary/zh.json', 'utf8'))
const terms = [...new Set(Object.values(zh).flat())].sort()
const out = Object.fromEntries(terms.map((t) => [t, pinyin(t, { nonZh: 'consecutive' })]))
writeFileSync('src/data/zh-pinyin.json', JSON.stringify(out, null, 1) + '\n')
console.log(`${terms.length} Begriffe`)
