// Oberflächentexte (D-053): vollständig pro Sprache, gleiche Platzhalter, ICU-Format korrekt.
import { describe, expect, it } from 'vitest'
import { MESSAGES, formatMessage } from '../src/i18n'
import de from '../src/locales/de.json'

const keys = Object.keys(de)
/** Platzhalter-Namen einer Meldung, z. B. „{n, plural, …}“ → n */
const placeholders = (msg: string) => [...msg.matchAll(/\{(\w+)(?=[,}])/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).sort()

describe('Oberflächentexte', () => {
  it.each(Object.keys(MESSAGES))('hat in %s alle Texte und keine überzähligen', (lang) => {
    const msgs = MESSAGES[lang as keyof typeof MESSAGES]!
    expect(keys.filter((k) => !(msgs as Record<string, string>)[k]), `fehlende Texte ${lang}`).toEqual([])
    expect(Object.keys(msgs).filter((k) => !keys.includes(k))).toEqual([])
  })

  it.each(Object.keys(MESSAGES))('nutzt in %s dieselben Platzhalter wie Deutsch', (lang) => {
    const msgs = MESSAGES[lang as keyof typeof MESSAGES] as Record<string, string>
    const bad = keys.filter((k) => msgs[k] && placeholders(msgs[k]).join() !== placeholders((de as Record<string, string>)[k]).join())
    expect(bad).toEqual([])
  })

  it.each(Object.keys(MESSAGES))('hat in %s ausgeglichene Klammern', (lang) => {
    const msgs = MESSAGES[lang as keyof typeof MESSAGES] as Record<string, string>
    const bad = Object.entries(msgs).filter(([, m]) => {
      let d = 0
      for (const ch of m) if ((d += ch === '{' ? 1 : ch === '}' ? -1 : 0) < 0) return true
      return d !== 0
    })
    expect(bad.map(([k]) => k)).toEqual([])
  })
})

describe('formatMessage', () => {
  it('setzt Platzhalter ein und lässt unbekannte stehen', () => {
    expect(formatMessage('„{name}“ gelöscht', { name: 'Milch' }, 'de')).toBe('„Milch“ gelöscht')
    expect(formatMessage('{a} und {b}', { a: 1 }, 'de')).toBe('1 und {b}')
  })

  it('wählt Einzahl und Mehrzahl', () => {
    const msg = '{n, plural, =0 {nichts} one {# item removed} other {# items removed}}'
    expect(formatMessage(msg, { n: 0 }, 'en')).toBe('nichts')
    expect(formatMessage(msg, { n: 1 }, 'en')).toBe('1 item removed')
    expect(formatMessage(msg, { n: 3 }, 'en')).toBe('3 items removed')
  })

  it('kennt Sprachen mit mehreren Mehrzahlformen', () => {
    const msg = '{n, plural, one {# artikl} few {# artikla} other {# artikala}}'
    expect(formatMessage(msg, { n: 1 }, 'hr')).toBe('1 artikl')
    expect(formatMessage(msg, { n: 3 }, 'hr')).toBe('3 artikla')
    expect(formatMessage(msg, { n: 5 }, 'hr')).toBe('5 artikala')
  })

  it('wählt bei select die passende Variante', () => {
    const msg = '{who, select, me {Du holst das} other {{who} holt das}}'
    expect(formatMessage(msg, { who: 'me' }, 'de')).toBe('Du holst das')
    expect(formatMessage(msg, { who: 'Anna' }, 'de')).toBe('Anna holt das')
  })
})
