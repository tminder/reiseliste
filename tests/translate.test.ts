// Prüft die Zuordnung Eingabe → Wörterbuch (S-002).
import { describe, expect, it } from 'vitest'
import { exactConcept, findConcept, nameIn, normalize, splitQuantity, suggest } from '../src/lib/translate'
import { listIdFrom } from '../src/lib/links'

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
    expect(nameIn(null, 'es')).toBeNull()
  })

  it('schlägt passende Artikel vor', () => {
    expect(suggest('Milc', 'de').map((e) => e.id)).toContain('milch')
    expect(suggest('x', 'de')).toEqual([])
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
