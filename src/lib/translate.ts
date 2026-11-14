import { CONCEPTS, LANGS, loadLangFiles, type Lang, type Names } from '../data/dictionary'

/**
 * Vergleichsform eines Begriffs: klein, ohne Satzzeichen, ohne Akzente.
 * Vietnamesisch behält seine Zeichen (lang = 'vi'): Dort unterscheiden sie Wörter (bơ = Butter, bò = Rind).
 */
export function normalize(s: string, lang?: Lang): string {
  const lower = s.toLowerCase()
  const plain =
    lang === 'vi'
      ? lower.normalize('NFC')
      : lower
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Akzente entfernen (auch griechische Tonos)
          .replace(/đ/g, 'd') // Vietnamesisch ohne Zeichen: đ zerfällt nicht in Grundbuchstabe + Zeichen
  return plain
    .replace(/ß/g, 'ss')
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Grobe Plural-/Endungsvarianten, damit "Tomate" und "Tomaten" beide treffen. */
function stems(word: string, lang?: Lang): string[] {
  const out = new Set([word])
  if (lang === 'vi') return [...out] // keine Endungen
  for (const suf of ['en', 'n', 'e', 's', 'es']) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) out.add(word.slice(0, -suf.length))
  }
  return [...out]
}

interface IndexHit {
  id: string
  lang: Lang
}

// Geladene Sprachen (D-053): Anzeige-Namen pro Sprache, Abweichungen pro Land, Suchindizes
const BASE = new Map<Lang, Names>()
const REGION = new Map<string, Names>()
const exactIndex = new Map<string, IndexHit[]>()
const stemIndex = new Map<string, IndexHit[]>()
// Aliase pro Sprache, längste zuerst – für die Suche nach enthaltenen Wörtern ("Milch fettarm")
const aliasesByLang = new Map<Lang, { alias: string; id: string }[]>()

function push(map: Map<string, IndexHit[]>, key: string, hit: IndexHit) {
  const list = map.get(key) ?? []
  if (!list.some((h) => h.id === hit.id && h.lang === hit.lang)) list.push(hit)
  map.set(key, list)
}

/**
 * Sprache in die Suchindizes aufnehmen. Erkannt werden alle Namen, auch die Länder-Abweichungen –
 * diese aber nur, wenn sie nicht schon einen anderen Artikel bezeichnen (Brasilien „presunto“ = gekochter Schinken,
 * Portugal „presunto“ = Rohschinken: in Portugiesisch bleibt der allgemeine Name massgebend).
 */
function addLanguage(lang: Lang, base: Names, variants: Record<string, Names>) {
  BASE.set(lang, base)
  for (const [code, names] of Object.entries(variants)) REGION.set(code, names)
  const arr = aliasesByLang.get(lang) ?? []
  const owner = new Map<string, string>() // normalisierter Name → Artikel (allgemeine Namen)
  const add = (id: string, name: string) => {
    const n = normalize(name, lang)
    push(exactIndex, n, { id, lang })
    for (const st of stems(n, lang)) push(stemIndex, st, { id, lang })
    arr.push({ alias: n, id })
  }
  for (const c of CONCEPTS)
    for (const name of base[c.id] ?? []) {
      owner.set(normalize(name, lang), c.id)
      add(c.id, name)
    }
  for (const names of Object.values(variants))
    for (const [id, list] of Object.entries(names))
      for (const name of list) {
        const n = normalize(name, lang)
        if (owner.has(n)) continue // gleicher Name: schon erfasst oder gehört einem anderen Artikel
        owner.set(n, id)
        add(id, name)
      }
  arr.sort((x, y) => y.alias.length - x.alias.length)
  aliasesByLang.set(lang, arr)
}

const loading = new Map<Lang, Promise<void>>()
const listeners = new Set<() => void>()

/** Sprachen nachladen (eigene Sprache, Landessprache, Sprachen der Mitglieder). Mehrfach aufrufbar. */
export function loadLanguages(langs: Iterable<Lang>): Promise<void> {
  const jobs: Promise<void>[] = []
  for (const lang of new Set(langs)) {
    if (!LANGS.includes(lang)) continue
    let job = loading.get(lang)
    if (!job) {
      job = loadLangFiles(lang).then(({ base, variants }) => {
        addLanguage(lang, base, variants)
        for (const fn of listeners) fn()
      })
      // Fehlgeschlagen (z. B. offline und noch nicht zwischengespeichert): später neu versuchen
      job.catch(() => loading.delete(lang))
      loading.set(lang, job)
    }
    jobs.push(job)
  }
  return Promise.all(jobs).then(() => undefined)
}

export const isLoaded = (lang: Lang) => BASE.has(lang)
/** Benachrichtigung, sobald eine Sprache geladen ist (für React) */
export function onLanguagesLoaded(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Namen eines Artikels in einer Sprache (leer, wenn die Sprache nicht geladen ist) */
export const namesIn = (id: string, lang: Lang): string[] => BASE.get(lang)?.[id] ?? []

function pick(hits: IndexHit[] | undefined, lang: Lang): string | null {
  if (!hits?.length) return null
  return (hits.find((h) => h.lang === lang) ?? hits[0]).id
}

const QTY_UNITS = '(?:x|×|kg|g|gr|l|ml|cl|stk|stück|st|pack|packung|packungen|pkg|flasche|flaschen|dose|dosen|bund|becher|glas|gläser|pcs|pack|bottles?|cans?)'
const LEADING_QTY = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*${QTY_UNITS}?\\.?)\\s+(.+)$`, 'iu')
const TRAILING_QTY = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?\\s*${QTY_UNITS}?\\.?)$`, 'iu')

// Anzahl × Grösse, z. B. „2 100g Schokolade“, „2x 100 g“, „6 x 1,5 l Wasser“, „2 Packungen à 500g Nudeln“ (D-048)
const NUM = '\\d+(?:[.,]\\d+)?'
const SIZE = `(${NUM})\\s*(kg|gr|g|ml|cl|l)\\.?`
/** Packungswörter, die zur Menge gehören („2 Tafeln Schokolade“). Werden nicht übersetzt. */
const PACK =
  '(?:tafeln?|packungen?|packs?|päckchen|pkg|flaschen?|dosen?|beutel|tüten?|becher|gläser|glas|bund|netze?|schalen?|kisten?|rollen?|stück|stk|bars?|bottles?|cans?|bags?|boxe?s?|jars?|paquetes?|botellas?|latas?|bolsas?|paquets?|bouteilles?|boîtes?|sachets?|confezion[ei]|bottiglie|bottiglia|lattin[ae]|pacchi|pacco|hộp|chai|gói|lon|túi|bịch|vỉ|thùng|lốc)'
// Zwischen Anzahl und Grösse steht „x“/„×“ oder ein Leerzeichen (sonst wäre „100g“ = 1 × 00 g)
const SEP = `(?:\\s*[x×]\\s*|\\s+(?:(?:à|a|je|zu|of|de)\\s+)?)`
const COMPOUND_LEAD = new RegExp(`^(\\d+)(?:\\s*(${PACK}))?${SEP}${SIZE}\\s+(?:(?:of|de|di|d')\\s*)?(.+)$`, 'iu')
const COMPOUND_TRAIL = new RegExp(`^(.+?)\\s+(\\d+)(?:\\s*(${PACK}))?\\s*[x×à]\\s*${SIZE}$`, 'iu')
const PACK_LEAD = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${PACK})\\.?\\s+(?:(?:of|de|di|du|des|d')\\s*)?(.+)$`, 'iu')

function sizeText(n: string, unit: string): string {
  const u = unit.toLowerCase()
  return `${n.replace('.', ',')} ${u === 'gr' ? 'g' : u}`
}

function compoundQty(count: string, pack: string | undefined, n: string, unit: string): string {
  return `${count}${pack ? ` ${pack}` : ''} × ${sizeText(n, unit)}`
}

/**
 * Trennt eine Mengenangabe ab: "2 Packungen Milch" → { qty: "2 Packungen", text: "Milch" }.
 * Anzahl und Grösse werden einheitlich als „2 × 100 g“ gespeichert (D-048).
 */
export function splitQuantity(input: string): { qty: string | null; text: string } {
  const s = input.trim().replace(/\s+/g, ' ')
  let m = s.match(COMPOUND_LEAD)
  if (m) return { qty: compoundQty(m[1], m[2], m[3], m[4]), text: m[5].trim() }
  m = s.match(COMPOUND_TRAIL)
  if (m) return { qty: compoundQty(m[2], m[3], m[4], m[5]), text: m[1].trim() }
  m = s.match(PACK_LEAD)
  if (m) return { qty: `${m[1]} ${m[2]}`, text: m[3].trim() }
  m = s.match(LEADING_QTY)
  if (m) return { qty: m[1].trim(), text: m[2].trim() }
  m = s.match(TRAILING_QTY)
  if (m) return { qty: m[2].trim(), text: m[1].trim() }
  return { qty: null, text: s }
}

/** Findet den Wörterbuch-Eintrag zu einer Eingabe. Die Sprache des Eingebenden wird bevorzugt. */
export function findConcept(text: string, lang: Lang): string | null {
  const n = normalize(text, lang)
  if (!n) return null

  const exact = pick(exactIndex.get(n), lang)
  if (exact) return exact

  for (const s of stems(n, lang)) {
    const hit = pick(stemIndex.get(s), lang)
    if (hit) return hit
  }

  // Enthaltenes Wort, nur in der eigenen Sprache und ab 3 Zeichen ("Milch fettarm", "frische Tomaten")
  const padded = ` ${n} `
  for (const { alias, id } of aliasesByLang.get(lang) ?? []) {
    if (alias.length < 3) continue
    for (const variant of [alias, ...stems(alias, lang)]) {
      if (variant.length >= 3 && padded.includes(` ${variant} `)) return id
    }
  }
  return null
}

/** Nur genaue Treffer (Name oder Endungsvariante), ohne „enthaltenes Wort“. Für den Vergleich doppelter Artikel (D-045). */
export function exactConcept(text: string, lang: Lang): string | null {
  const n = normalize(text, lang)
  if (!n) return null
  const exact = pick(exactIndex.get(n), lang)
  if (exact) return exact
  for (const s of stems(n, lang)) {
    const hit = pick(stemIndex.get(s), lang)
    if (hit) return hit
  }
  return null
}

/**
 * Anzeige-Name eines Artikels. region: Länder-Abweichung (z. B. "es-MX"), gilt vor dem allgemeinen Namen.
 * null, wenn der Artikel unbekannt oder die Sprache nicht geladen ist.
 */
export function nameIn(conceptId: string | null | undefined, lang: Lang, region?: string): string | null {
  if (!conceptId) return null
  return (region && REGION.get(region)?.[conceptId]?.[0]) || namesIn(conceptId, lang)[0] || null
}

/** Vorschläge beim Tippen: Artikel, deren Name (in der eigenen Sprache) mit der Eingabe beginnt oder sie enthält. */
/** Vorschläge beim Tippen. region: eigene Länder-Abweichung (z. B. de-CH) – deren Namen werden angezeigt und erkannt */
export function suggest(input: string, lang: Lang, limit = 5, region?: string): { id: string; name: string }[] {
  const text = splitQuantity(input).text
  const n = normalize(text, lang)
  if (n.length < 2) return []
  // Vietnamesisch ohne Zeichen getippt („sua“): mit den Namen ohne Zeichen vergleichen, die Vorschläge zeigen sie mit
  const plain = lang === 'vi' && n === normalize(text)
  const norm = (x: string) => (plain ? normalize(x) : normalize(x, lang))
  const starts: { id: string; name: string }[] = []
  const contains: { id: string; name: string }[] = []
  for (const c of CONCEPTS) {
    const own = (region && REGION.get(region)?.[c.id]) || []
    const raw = [...own, ...namesIn(c.id, lang)]
    if (!raw.length) continue
    const names = raw.map(norm)
    if (names.some((x) => x.startsWith(n))) starts.push({ id: c.id, name: raw[0] })
    else if (names.some((x) => x.includes(n))) contains.push({ id: c.id, name: raw[0] })
  }
  return [...starts, ...contains].slice(0, limit)
}
