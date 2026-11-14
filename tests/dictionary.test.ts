// Prüft das Wörterbuch auf Formfehler und fehlende Übersetzungen (S-002, D-053). Läuft bei jedem Push vor dem Build.
import { beforeAll, describe, expect, it } from 'vitest'
import { CATEGORY_LABEL, CATEGORY_ORDER, CONCEPT_BY_ID, CONCEPTS, LANGS, VARIANTS, loadLangFiles, type Lang, type Names } from '../src/data/dictionary'
import { COUNTRIES, PROFILE_LANGS } from '../src/data/countries'
import { THANKS, WHERE_IS } from '../src/data/phrases'
import { OFF_CATEGORY } from '../src/lib/photos'
import { normalize } from '../src/lib/translate'

const base = {} as Record<Lang, Names>
const variants: Record<string, Names> = {}
beforeAll(async () => {
  for (const l of LANGS) {
    const files = await loadLangFiles(l)
    base[l] = files.base
    Object.assign(variants, files.variants)
  }
})

describe('Wörterbuch', () => {
  it('hat eindeutige IDs', () => {
    const ids = CONCEPTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(LANGS)('hat jeden Artikel auf %s', (l) => {
    const missing = CONCEPTS.filter((c) => !base[l][c.id]?.length).map((c) => c.id)
    expect(missing, `fehlende Übersetzungen ${l}`).toEqual([])
  })

  it.each(LANGS)('kennt in %s nur vorhandene Artikel', (l) => {
    expect(Object.keys(base[l]).filter((id) => !CONCEPT_BY_ID.has(id))).toEqual([])
  })

  it('hat in den Länder-Abweichungen nur vorhandene Artikel und keine leeren Einträge', () => {
    const bad = Object.entries(variants).flatMap(([v, names]) =>
      Object.entries(names).filter(([id, list]) => !CONCEPT_BY_ID.has(id) || !list.length).map(([id]) => `${v}:${id}`),
    )
    expect(bad).toEqual([])
  })

  it('verweist von jedem Land nur auf vorhandene Abweichungen der eigenen Sprache', () => {
    const bad = COUNTRIES.filter((c) => c.variant && !VARIANTS[c.lang]?.includes(c.variant)).map((c) => c.code)
    expect(bad).toEqual([])
  })

  it('bietet im Profil jede Sprache an, Abweichungen nur mit vorhandener Datei (D-056)', () => {
    expect(LANGS.filter((l) => !PROFILE_LANGS.some((o) => o.value === l))).toEqual([])
    expect(PROFILE_LANGS.filter((o) => o.region && !VARIANTS[o.lang]?.includes(o.region)).map((o) => o.value)).toEqual([])
  })

  it('nutzt nur bekannte Abteilungen', () => {
    const bad = CONCEPTS.filter((e) => !CATEGORY_ORDER.includes(e.category)).map((e) => `${e.id}:${e.category}`)
    expect(bad).toEqual([])
    for (const c of CATEGORY_ORDER) expect(CATEGORY_LABEL[c]).toBeTruthy()
  })

  it('hat keine Wörter, die in derselben Sprache zu zwei Artikeln passen', () => {
    const clashes: string[] = []
    for (const l of LANGS) {
      const seen = new Map<string, string>()
      for (const c of CONCEPTS)
        for (const n of new Set((base[l][c.id] ?? []).map((x) => normalize(x, l)))) {
          const other = seen.get(n)
          if (other && other !== c.id) clashes.push(`${l}:${n} → ${other} / ${c.id}`)
          else seen.set(n, c.id)
        }
    }
    expect(clashes).toEqual([])
  })

  it('hat keine Wörter, die innerhalb einer Länder-Abweichung zu zwei Artikeln passen', () => {
    const clashes: string[] = []
    for (const [v, names] of Object.entries(variants)) {
      const seen = new Map<string, string>()
      for (const [id, list] of Object.entries(names))
        for (const n of new Set(list.map(normalize))) {
          const other = seen.get(n)
          if (other && other !== id) clashes.push(`${v}:${n} → ${other} / ${id}`)
          else seen.set(n, id)
        }
    }
    expect(clashes).toEqual([])
  })

  it('verweist in Fotos und Tipps nur auf vorhandene Artikel und Sprachen', () => {
    expect(Object.keys(OFF_CATEGORY).filter((id) => !CONCEPT_BY_ID.has(id))).toEqual([])
    const badHints = CONCEPTS.flatMap((c) => Object.keys(c.hint ?? {}).filter((l) => !LANGS.includes(l as Lang)).map((l) => `${c.id}:${l}`))
    expect(badHints).toEqual([])
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
