// Merkmale wie „gefroren“ (D-098)
import { beforeAll, describe, expect, it } from 'vitest'
import { LANGS } from '../src/data/dictionary'
import { attributesFor } from '../src/lib/attributes'
import { findConcept, loadLanguages, nameIn } from '../src/lib/translate'

beforeAll(() => loadLanguages(LANGS))

const show = (text: string, lang: 'de' | 'en' | 'es', target: 'es' | 'fr' | 'el') => {
  const id = findConcept(text, lang)
  return { id, term: nameIn(id, target), attrs: attributesFor(text, lang, id, target).map((a) => a.text) }
}

describe('Merkmale', () => {
  it('gefrorene Himbeeren → frambuesas + ❄️ congelado', () => {
    expect(show('gefrorene Himbeeren', 'de', 'es')).toEqual({ id: 'himbeeren', term: expect.any(String), attrs: ['❄️ congelado'] })
  })

  it('auch nachgestellt und mit Tippfehlern', () => {
    for (const t of ['Himbeeren tiefgekühlt', 'Himbeeren (tiefgekühlt)', 'gefrohrene Himbeeren', 'Himbeeren teifgekühlt', 'TK-Himbeeren'])
      expect(show(t, 'de', 'es'), t).toEqual({ id: 'himbeeren', term: expect.any(String), attrs: ['❄️ congelado'] })
  })

  it('eigener TK-Begriff: kein Zusatz', () => {
    expect(show('Tiefkühlspinat', 'de', 'es')).toEqual({ id: 'tkspinat', term: 'espinacas congeladas', attrs: [] })
    expect(show('gefrorene Beeren', 'de', 'es').attrs).toEqual([])
  })

  it('Bio, laktosefrei, mehrere Merkmale', () => {
    expect(show('Bio-Joghurt', 'de', 'fr').attrs).toEqual(['bio'])
    expect(show('laktosefreie Milch', 'de', 'es').attrs).toEqual([]) // eigener Begriff „laktosefrei“
    expect(show('vegane Bio-Butter', 'de', 'el').attrs).toEqual(['βιολογικό', 'vegan'])
    expect(show('frozen organic raspberries', 'en', 'es').attrs).toEqual(['❄️ congelado', 'ecológico'])
  })

  it('kein Merkmal: nichts', () => {
    expect(show('Milch', 'de', 'es').attrs).toEqual([])
    expect(show('Biber', 'de', 'es').attrs).toEqual([]) // kein Artikel
  })
})

describe('Merkmale beim Tippen und beim eigenen Begriff', async () => {
  const { splitAttributes, suggestWithAttributes } = await import('../src/lib/attributes')
  it('zerlegt in Rest und Merkmale', () => {
    expect(splitAttributes('himbeeren tiefgekühlt', 'de')).toEqual({ rest: 'himbeeren', ids: ['frozen'] })
    expect(splitAttributes('Himbeeren (tiefgekühlt)', 'de')).toEqual({ rest: 'Himbeeren', ids: ['frozen'] })
    expect(splitAttributes('TK-Himbeeren', 'de')).toEqual({ rest: 'Himbeeren', ids: ['frozen'] })
    expect(splitAttributes('Bio-Milch fettarm', 'de')).toEqual({ rest: 'Milch fettarm', ids: ['organic'] })
  })
  it('Vorschläge mit Merkmal, auch angefangen', () => {
    expect(suggestWithAttributes('himbeeren tiefgekühlt', 'de')).toContainEqual({ id: 'himbeeren', name: 'Himbeeren (tiefgekühlt)' })
    expect(suggestWithAttributes('himbeeren tief', 'de')).toContainEqual({ id: 'himbeeren', name: 'Himbeeren (tiefgekühlt)' })
    expect(suggestWithAttributes('gefrorene himb', 'de')).toContainEqual({ id: 'himbeeren', name: 'Himbeeren (tiefgekühlt)' })
    expect(suggestWithAttributes('bio jogh', 'de')[0]).toEqual({ id: 'joghurt', name: 'Joghurt (Bio)' })
    expect(suggestWithAttributes('spinat tief', 'de')[0].id).toBe('tkspinat') // eigener Begriff zuerst, ohne Zusatz
  })
})
