// Prüft das Wörterbuch auf Formfehler (S-002). Läuft bei jedem Push vor dem Build.
import { describe, expect, it } from 'vitest'
import { BY_ID, CATEGORY_LABEL, CATEGORY_ORDER, DICTIONARY, HINTS, LANGS } from '../src/data/dictionary'
import { COUNTRIES } from '../src/data/countries'
import { THANKS, WHERE_IS } from '../src/data/phrases'
import { OFF_CATEGORY } from '../src/lib/photos'
import { normalize } from '../src/lib/translate'

describe('Wörterbuch', () => {
  it('hat eindeutige IDs', () => {
    const ids = DICTIONARY.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('hat in jeder Zeile einen Begriff pro Sprache', () => {
    const missing = DICTIONARY.flatMap((e) => LANGS.filter((l) => !e.names[l].length).map((l) => `${e.id}:${l}`))
    expect(missing).toEqual([])
  })

  it('nutzt nur bekannte Abteilungen', () => {
    const bad = DICTIONARY.filter((e) => !CATEGORY_ORDER.includes(e.category)).map((e) => `${e.id}:${e.category}`)
    expect(bad).toEqual([])
    for (const c of CATEGORY_ORDER) expect(CATEGORY_LABEL[c]).toBeTruthy()
  })

  it('hat keine Wörter, die in derselben Sprache zu zwei Artikeln passen', () => {
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const e of DICTIONARY)
      for (const l of LANGS)
        for (const n of new Set(e.names[l].map(normalize))) {
          const key = `${l}:${n}`
          const other = seen.get(key)
          if (other && other !== e.id) clashes.push(`${key} → ${other} / ${e.id}`)
          else seen.set(key, e.id)
        }
    expect(clashes).toEqual([])
  })

  it('verweist in Fotos und Tipps nur auf vorhandene Artikel', () => {
    expect(Object.keys(OFF_CATEGORY).filter((id) => !BY_ID.has(id))).toEqual([])
    expect(Object.keys(HINTS).filter((id) => !BY_ID.has(id))).toEqual([])
  })
})

describe('Länder und Sätze', () => {
  it('hat eindeutige Ländercodes mit unterstützter Sprache', () => {
    const codes = COUNTRIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(COUNTRIES.filter((c) => !LANGS.includes(c.lang)).map((c) => c.code)).toEqual([])
  })

  it('hat die Sätze der Zeigen-Karte in allen Sprachen', () => {
    for (const l of LANGS) {
      expect(WHERE_IS[l], l).toBeTruthy()
      expect(THANKS[l], l).toBeTruthy()
    }
  })
})
