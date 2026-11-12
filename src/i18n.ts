// Texte der Bedienoberfläche (D-053): eine JSON-Datei pro Sprache in src/locales, Format ICU MessageFormat
// („{name}“, „{n, plural, one {# Artikel} other {# Artikel}}“). Sprache = Sprache aus dem Profil; fehlt ein Text, gilt Englisch.
// Neue Sprache: src/locales/<lang>.json anlegen und in MESSAGES eintragen. Der Test meldet fehlende Schlüssel.

import type { Category, Lang } from './data/dictionary'
import de from './locales/de.json'
import en from './locales/en.json'

export type MessageKey = keyof typeof de

export const MESSAGES: Partial<Record<Lang, Partial<Record<MessageKey, string>>>> = { de, en }

let current: Lang = 'de'

/** Sprache der Oberfläche setzen (aus dem Profil). Nicht übersetzte Sprachen nutzen Englisch. */
export function setUiLang(lang: Lang) {
  current = MESSAGES[lang] ? lang : 'en'
  document.documentElement.lang = current
}

export function uiLang(): Lang {
  return current
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const msg = MESSAGES[current]?.[key] ?? (en as Record<MessageKey, string>)[key] ?? key
  return formatMessage(msg, vars ?? {}, current)
}

/** Ende der Klammer, die bei `open` beginnt (verschachtelt) */
function closing(s: string, open: number): number {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}' && --depth === 0) return i
  }
  return -1
}

/**
 * Kleiner ICU-Formatierer: „{name}“, „{n, plural, =0 {…} one {…} other {…}}“ mit „#“ für die Zahl
 * und „{x, select, a {…} other {…}}“. Unbekannte Platzhalter bleiben stehen.
 */
export function formatMessage(msg: string, vars: Record<string, string | number>, lang: string): string {
  let out = ''
  let i = 0
  while (i < msg.length) {
    const open = msg.indexOf('{', i)
    if (open < 0) break
    const end = closing(msg, open)
    if (end < 0) break
    out += msg.slice(i, open)
    const body = msg.slice(open + 1, end)
    const [name, type] = body.split(',', 2).map((x) => x.trim())
    const value = vars[name]
    if ((type === 'plural' || type === 'select') && value !== undefined) {
      const optsStart = body.indexOf(',', body.indexOf(',') + 1) + 1
      const opts = new Map<string, string>()
      let j = optsStart
      while (j < body.length) {
        const b = body.indexOf('{', j)
        if (b < 0) break
        const e = closing(body, b)
        if (e < 0) break
        opts.set(body.slice(j, b).trim(), body.slice(b + 1, e))
        j = e + 1
      }
      let chosen: string | undefined
      if (type === 'plural') {
        const n = Number(value)
        chosen = opts.get(`=${n}`) ?? opts.get(pluralRules(lang).select(n)) ?? opts.get('other')
        if (chosen !== undefined) chosen = formatMessage(chosen.replace(/#/g, n.toLocaleString(lang)), vars, lang)
      } else {
        chosen = opts.get(String(value)) ?? opts.get('other')
        if (chosen !== undefined) chosen = formatMessage(chosen, vars, lang)
      }
      out += chosen ?? ''
    } else {
      out += value !== undefined ? String(value) : msg.slice(open, end + 1)
    }
    i = end + 1
  }
  return out + msg.slice(i)
}

const rulesCache = new Map<string, Intl.PluralRules>()
function pluralRules(lang: string): Intl.PluralRules {
  let r = rulesCache.get(lang)
  if (!r) rulesCache.set(lang, (r = new Intl.PluralRules(lang)))
  return r
}

export function categoryLabel(c: Category): string {
  return t(`cat_${c}` as MessageKey)
}

/** Ländername in der Sprache der Oberfläche (über Intl), bei mehrsprachigen Ländern mit Region */
export function countryName(code: string): string {
  const [iso, region] = code.split('-')
  let name = iso
  try {
    name = new Intl.DisplayNames([current], { type: 'region' }).of(iso) ?? iso
  } catch {
    /* alter Browser */
  }
  const suffix: Record<string, MessageKey> = {
    'BE-NL': 'regionFlanders',
    'BE-FR': 'regionWallonia',
    'CH-FR': 'regionRomandy',
    'CH-IT': 'regionTicino',
    'CH-DE': 'regionGermanSwiss',
  }
  return region && suffix[code] ? `${name} (${t(suffix[code])})` : name
}
