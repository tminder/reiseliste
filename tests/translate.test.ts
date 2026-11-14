// Prüft die Zuordnung Eingabe → Wörterbuch (S-002).
import { beforeAll, describe, expect, it } from 'vitest'
import { LANGS } from '../src/data/dictionary'
import { exactConcept, findConcept, loadLanguages, nameIn, normalize, splitQuantity, suggest } from '../src/lib/translate'
import { listIdFrom } from '../src/lib/links'

beforeAll(() => loadLanguages(LANGS))

describe('normalize', () => {
  it('entfernt Akzente, ß und Satzzeichen', () => {
    expect(normalize('  Crème  Fraîche! ')).toBe('creme fraiche')
    expect(normalize('Süßkartoffeln')).toBe('susskartoffeln')
    expect(normalize('γάλα')).toBe('γαλα')
  })
})

describe('splitQuantity', () => {
  it.each([
    ['2 Milch', '2', 'Milch'],
    ['500 g Hackfleisch', '500 g', 'Hackfleisch'],
    ['Bier 6', '6', 'Bier'],
    ['1,5 l Wasser', '1,5 l', 'Wasser'],
    ['Milch', null, 'Milch'],
    // Anzahl × Grösse (D-048)
    ['2 100g Schokolade', '2 × 100 g', 'Schokolade'],
    ['2x 100g Schokolade', '2 × 100 g', 'Schokolade'],
    ['2 x 100 g Schokolade', '2 × 100 g', 'Schokolade'],
    ['2x100g Schokolade', '2 × 100 g', 'Schokolade'],
    ['Schokolade 2x100g', '2 × 100 g', 'Schokolade'],
    ['6 x 1,5 l Wasser', '6 × 1,5 l', 'Wasser'],
    ['6 x 1.5l Wasser', '6 × 1,5 l', 'Wasser'],
    ['2 Packungen à 500g Nudeln', '2 Packungen × 500 g', 'Nudeln'],
    ['3 x 250 gr de arroz', '3 × 250 g', 'arroz'],
    ['100g Schokolade', '100g', 'Schokolade'],
    // Packungswörter gehören zur Menge
    ['2 Tafeln Schokolade', '2 Tafeln', 'Schokolade'],
    ['2 bars of chocolate', '2 bars', 'chocolate'],
    ['2 paquetes de arroz', '2 paquetes', 'arroz'],
  ])('%s', (input, qty, text) => {
    expect(splitQuantity(input)).toEqual({ qty, text })
  })
})

describe('findConcept', () => {
  it.each([
    // Deutsch, Mehrzahl und Schweizer Ausdrücke
    ['Milch', 'de', 'milch'],
    ['Tomate', 'de', 'tomaten'],
    ['Tomaten', 'de', 'tomaten'],
    ['Rahm', 'de', 'sahne'],
    ['Rüebli', 'de', 'karotten'],
    ['Chriesi', 'de', 'kirschen'],
    ['Kehrichtsäcke', 'de', 'muellbeutel'],
    ['Zucchetti', 'de', 'zucchini'],
    ['Milch fettarm', 'de', 'milch'],
    ['Pappteller', 'de', 'pappteller'],
    ['Teller', 'de', 'teller'],
    ['Paprika', 'de', 'paprika'],
    // Andere Sprachen
    ['paprika', 'en', 'paprikapulver'],
    ['leche', 'es', 'milch'],
    ['crème liquide', 'fr', 'schlagsahne'],
    ['γάλα', 'el', 'milch'],
    ['sữa tươi', 'vi', 'milch'],
    ['đường', 'vi', 'zucker'],
    ['quả bơ', 'vi', 'avocado'],
    ['bơ', 'vi', 'butter'],
    ['2 hộp sữa chua', 'vi', 'joghurt'],
  ])('%s (%s) → %s', (text, lang, id) => {
    expect(findConcept(text, lang as never)).toBe(id)
  })

  it('liefert null für Unbekanntes', () => {
    expect(findConcept('Flux-Kompensator', 'de')).toBeNull()
    expect(findConcept('', 'de')).toBeNull()
  })
})

describe('nameIn und suggest', () => {
  it('zeigt die erste Variante in der Zielsprache', () => {
    expect(nameIn('milch', 'es')).toBe('leche')
    expect(nameIn('sahne', 'de')).toBe('Sahne')
    expect(nameIn('milch', 'vi')).toBe('sữa tươi')
  })

  it('Vietnamesisch: Zeichen unterscheiden Wörter, ohne Zeichen getippt helfen die Vorschläge', () => {
    expect(findConcept('bò', 'vi')).toBe('rind')
    expect(findConcept('thịt bò', 'vi')).toBe('rind')
    expect(findConcept('bơ', 'vi')).toBe('butter')
    expect(suggest('sua tuoi', 'vi').map((s) => s.id)).toContain('milch')
    expect(suggest('bo', 'vi', 20).map((s) => s.id)).toEqual(expect.arrayContaining(['butter', 'rind']))
    expect(suggest('sữa', 'vi', 20).map((s) => s.id)).not.toContain('butter')
    expect(splitQuantity('2 hộp sữa chua')).toEqual({ qty: '2 hộp', text: 'sữa chua' })
  })

  it('Chinesisch (Taiwan): ohne Leerzeichen, Zählwörter, einzelne Zeichen', () => {
    expect(findConcept('鮮奶', 'zh')).toBe('milch')
    expect(findConcept('冰鮮奶', 'zh')).toBe('milch')
    expect(findConcept('鮮奶油', 'zh')).toBe('sahne')
    expect(findConcept('奶油', 'zh')).toBe('butter')
    expect(nameIn('milch', 'zh')).toBe('鮮奶')
    expect(splitQuantity('2瓶鮮奶')).toEqual({ qty: '2瓶', text: '鮮奶' })
    expect(splitQuantity('雞蛋10顆')).toEqual({ qty: '10顆', text: '雞蛋' })
    expect(splitQuantity('500公克絞肉')).toEqual({ qty: '500公克', text: '絞肉' })
    expect(splitQuantity('3蘋果')).toEqual({ qty: '3', text: '蘋果' })
    expect(suggest('蛋', 'zh').map((x) => x.id)).toContain('eier')
    expect(nameIn(null, 'es')).toBeNull()
  })

  it('schlägt passende Artikel vor', () => {
    expect(suggest('Milc', 'de').map((e) => e.id)).toContain('milch')
    expect(suggest('x', 'de')).toEqual([])
  })
})

describe('Länder-Abweichungen (D-053)', () => {
  it('zeigt den Begriff des Landes, sonst den allgemeinen', () => {
    expect(nameIn('sahne', 'de', 'de-CH')).toBe('Rahm')
    expect(nameIn('milch', 'de', 'de-CH')).toBe('Milch')
    expect(nameIn('schinken', 'pt', 'pt-BR')).toBe('presunto')
  })

  it('erkennt Begriffe aus Abweichungen, ohne allgemeine Namen umzudeuten', () => {
    expect(findConcept('Rahm', 'de')).toBe('sahne')
    expect(findConcept('Poulet', 'de')).toBe('haehnchen')
    // „presunto“ heisst in Portugal Rohschinken und bleibt es auch, wenn pt-BR geladen ist
    expect(findConcept('presunto', 'pt')).toBe('rohschinken')
  })

  it('schlägt in der eigenen Abweichung den eigenen Begriff vor (D-056)', () => {
    expect(suggest('Sahn', 'de', 5, 'de-CH').find((s) => s.id === 'sahne')?.name).toBe('Rahm')
    expect(suggest('Rah', 'de', 5, 'de-CH').find((s) => s.id === 'sahne')?.name).toBe('Rahm')
    expect(suggest('Sahn', 'de').find((s) => s.id === 'sahne')?.name).toBe('Sahne')
    expect(suggest('Sahn', 'de', 5, 'de-AT').find((s) => s.id === 'sahne')?.name).toBe('Obers')
    expect(nameIn('quark', 'de', 'de-AT')).toBe('Topfen')
    expect(findConcept('Paradeiser', 'de')).toBe('tomaten')
  })
})

describe('listIdFrom', () => {
  it('findet die Listen-ID in Link oder Text', () => {
    const id = 'abcdef12-2222-3333-4444-555555555555'
    expect(listIdFrom(`Schau: https://tminder.github.io/reiseliste/#/l/${id.toUpperCase()} danke`)).toBe(id)
    expect(listIdFrom('kein Link')).toBeNull()
  })
})

describe('Schokoladensorten (D-045)', () => {
  it.each([
    ['Schwarze Schokolade', 'schoko_dunkel'],
    ['Zartbitterschokolade', 'schoko_dunkel'],
    ['dunkle Schoggi', 'schoko_dunkel'],
    ['Milchschokolade', 'schoko_milch'],
    ['weiße Schokolade', 'schoko_weiss'],
    ['Schokolade', 'schokolade'],
  ])('%s', (text, id) => {
    expect(findConcept(text, 'de')).toBe(id)
  })
  it('nur genaue Treffer zählen als gleicher Artikel', () => {
    expect(exactConcept('Schokolade', 'de')).toBe('schokolade')
    expect(exactConcept('feine Schokolade', 'de')).toBeNull()
  })
})
