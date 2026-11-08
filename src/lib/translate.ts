import { BY_ID, DICTIONARY, LANGS, type Entry, type Lang } from '../data/dictionary'

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Akzente entfernen (auch griechische Tonos)
    .replace(/ß/g, 'ss')
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Grobe Plural-/Endungsvarianten, damit "Tomate" und "Tomaten" beide treffen. */
function stems(word: string): string[] {
  const out = new Set([word])
  for (const suf of ['en', 'n', 'e', 's', 'es']) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) out.add(word.slice(0, -suf.length))
  }
  return [...out]
}

interface IndexHit {
  id: string
  lang: Lang
}

const exactIndex = new Map<string, IndexHit[]>()
const stemIndex = new Map<string, IndexHit[]>()
// Aliase pro Sprache, längste zuerst – für die Suche nach enthaltenen Wörtern ("Milch fettarm")
const aliasesByLang = new Map<Lang, { alias: string; id: string }[]>()

function push(map: Map<string, IndexHit[]>, key: string, hit: IndexHit) {
  const list = map.get(key) ?? []
  if (!list.some((h) => h.id === hit.id && h.lang === hit.lang)) list.push(hit)
  map.set(key, list)
}

for (const entry of DICTIONARY) {
  for (const lang of LANGS) {
    for (const name of entry.names[lang]) {
      const n = normalize(name)
      push(exactIndex, n, { id: entry.id, lang })
      for (const s of stems(n)) push(stemIndex, s, { id: entry.id, lang })
      const arr = aliasesByLang.get(lang) ?? []
      arr.push({ alias: n, id: entry.id })
      aliasesByLang.set(lang, arr)
    }
  }
}
for (const arr of aliasesByLang.values()) arr.sort((a, b) => b.alias.length - a.alias.length)

function pick(hits: IndexHit[] | undefined, lang: Lang): string | null {
  if (!hits?.length) return null
  return (hits.find((h) => h.lang === lang) ?? hits[0]).id
}

const QTY_UNITS = '(?:x|×|kg|g|gr|l|ml|cl|stk|stück|st|pack|packung|packungen|pkg|flasche|flaschen|dose|dosen|bund|becher|glas|gläser|pcs|pack|bottles?|cans?)'
const LEADING_QTY = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*${QTY_UNITS}?\\.?)\\s+(.+)$`, 'iu')
const TRAILING_QTY = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?\\s*${QTY_UNITS}?\\.?)$`, 'iu')

/** Trennt eine Mengenangabe ab: "2 Packungen Milch" → { qty: "2 Packungen", text: "Milch" } */
export function splitQuantity(input: string): { qty: string | null; text: string } {
  const s = input.trim().replace(/\s+/g, ' ')
  let m = s.match(LEADING_QTY)
  if (m) return { qty: m[1].trim(), text: m[2].trim() }
  m = s.match(TRAILING_QTY)
  if (m) return { qty: m[2].trim(), text: m[1].trim() }
  return { qty: null, text: s }
}

/** Findet den Wörterbuch-Eintrag zu einer Eingabe. Die Sprache des Eingebenden wird bevorzugt. */
export function findConcept(text: string, lang: Lang): string | null {
  const n = normalize(text)
  if (!n) return null

  const exact = pick(exactIndex.get(n), lang)
  if (exact) return exact

  for (const s of stems(n)) {
    const hit = pick(stemIndex.get(s), lang)
    if (hit) return hit
  }

  // Enthaltenes Wort, nur in der eigenen Sprache und ab 3 Zeichen ("Milch fettarm", "frische Tomaten")
  const padded = ` ${n} `
  for (const { alias, id } of aliasesByLang.get(lang) ?? []) {
    if (alias.length < 3) continue
    for (const variant of [alias, ...stems(alias)]) {
      if (variant.length >= 3 && padded.includes(` ${variant} `)) return id
    }
  }
  return null
}

export function nameIn(conceptId: string | null | undefined, lang: Lang): string | null {
  if (!conceptId) return null
  return BY_ID.get(conceptId)?.names[lang][0] ?? null
}

/** Vorschläge beim Tippen: Einträge, deren Name (in der eigenen Sprache) mit der Eingabe beginnt oder sie enthält. */
export function suggest(input: string, lang: Lang, limit = 5): Entry[] {
  const n = normalize(splitQuantity(input).text)
  if (n.length < 2) return []
  const starts: Entry[] = []
  const contains: Entry[] = []
  for (const entry of DICTIONARY) {
    const names = entry.names[lang].map(normalize)
    if (names.some((x) => x.startsWith(n))) starts.push(entry)
    else if (names.some((x) => x.includes(n))) contains.push(entry)
  }
  return [...starts, ...contains].slice(0, limit)
}
