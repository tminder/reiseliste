// Umschrift für fremde Schriften (D-092): unter dem Begriff auf der Zeigen-Karte, damit man ihn lesen und nachsprechen kann.
// Chinesisch: Pinyin aus src/data/zh-pinyin.json (erzeugt mit `npm run dict:pinyin`).
// Griechisch: Regeln nach der Aussprache (nicht buchstabengetreu), mit Betonung: „γάλα“ → „gála“, „αυγά“ → „avgá“, „ου“ → „u“.
import type { Lang } from '../data/dictionary'

let pinyinMap: Record<string, string> | null = null

/** Pinyin-Tabelle erst laden, wenn sie gebraucht wird (kleineres Start-Bundle) */
export async function loadRomanization(lang: Lang): Promise<void> {
  if (lang === 'zh' && !pinyinMap) pinyinMap = (await import('../data/zh-pinyin.json')).default as Record<string, string>
}

/** Umschrift oder null (lateinische Schrift, unbekannter Begriff, Tabelle noch nicht geladen) */
export function romanize(term: string, lang: Lang): string | null {
  if (lang === 'zh') return pinyinMap?.[term.trim()] ?? null
  if (lang === 'el') return greek(term)
  return null
}

// ---------- Griechisch ----------

const VOWEL: Record<string, string> = {
  α: 'a', ά: 'á', ε: 'e', έ: 'é', η: 'i', ή: 'í', ι: 'i', ί: 'í', ϊ: 'i', ΐ: 'í',
  ο: 'o', ό: 'ó', υ: 'i', ύ: 'í', ϋ: 'i', ΰ: 'í', ω: 'o', ώ: 'ó',
}
const CONSONANT: Record<string, string> = {
  β: 'v', γ: 'g', δ: 'd', ζ: 'z', θ: 'th', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', φ: 'f', χ: 'ch', ψ: 'ps',
}
/** Zweibuchstabige Vokale: [ohne Betonung, betont] */
const DIGRAPH: Record<string, [string, string]> = { ου: ['u', 'ú'], αι: ['e', 'é'], ει: ['i', 'í'], οι: ['i', 'í'], υι: ['i', 'í'] }
const STRESSED = new Set(['ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', 'ΐ', 'ΰ'])
const DIAERESIS = new Set(['ϊ', 'ϋ', 'ΐ', 'ΰ'])
/** Vor diesen Lauten (stimmlos) oder am Wortende wird αυ/ευ zu af/ef, sonst av/ev */
const VOICELESS = new Set(['θ', 'κ', 'ξ', 'π', 'σ', 'ς', 'τ', 'φ', 'χ', 'ψ'])
const unstress = (c: string) => ({ ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω', ΐ: 'ι', ΰ: 'υ', ϊ: 'ι', ϋ: 'υ' })[c] ?? c

export function greek(term: string): string | null {
  const s = term.toLowerCase()
  if (!/[Ͱ-Ͽ]/.test(s)) return null
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const n = s[i + 1] ?? ''
    const start = i === 0 || !/[Ͱ-Ͽ]/.test(s[i - 1])
    // Zweibuchstabige Vokale. Getrennt gesprochen, wenn der zweite ein Trema hat („αϊ“) oder der erste betont ist („τσάι“ = tsá-i)
    const pair = unstress(c) + unstress(n)
    if (DIGRAPH[pair] && !DIAERESIS.has(n) && !STRESSED.has(c)) {
      out += DIGRAPH[pair][STRESSED.has(n) ? 1 : 0]
      i++
      continue
    }
    // αυ, ευ: av/ev bzw. af/ef
    if ((unstress(c) === 'α' || unstress(c) === 'ε') && unstress(n) === 'υ' && !DIAERESIS.has(n) && !STRESSED.has(c)) {
      const next = s[i + 2] ?? ''
      const base = (STRESSED.has(n) ? { α: 'á', ε: 'é' } : { α: 'a', ε: 'e' })[unstress(c) as 'α' | 'ε']
      out += base + (!next || VOICELESS.has(next) || !/[Ͱ-Ͽ]/.test(next) ? 'f' : 'v')
      i++
      continue
    }
    // γι vor Vokal: wie „j“, geschrieben „y“ („γιαούρτι“ → „yaúrti“)
    if (c === 'γ' && unstress(n) === 'ι' && !STRESSED.has(n) && VOWEL[s[i + 2] ?? '']) { out += 'y'; i++; continue }
    // Konsonantenpaare: am Wortanfang stimmhaft (μπ → b), sonst mit Nasal (μπ → mb)
    if (c === 'μ' && n === 'π') { out += start ? 'b' : 'mb'; i++; continue }
    if (c === 'ν' && n === 'τ') { out += start ? 'd' : 'nd'; i++; continue }
    if (c === 'γ' && n === 'κ') { out += start ? 'g' : 'ng'; i++; continue }
    if (c === 'γ' && n === 'γ') { out += 'ng'; i++; continue }
    if (c === 'γ' && (n === 'χ' || n === 'ξ')) { out += 'n'; continue }
    if (c === 'τ' && n === 'ζ') { out += 'tz'; i++; continue }
    if (c === 'τ' && n === 'σ') { out += 'ts'; i++; continue }
    out += VOWEL[c] ?? CONSONANT[c] ?? c
  }
  return out
}
