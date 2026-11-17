// Sprache beim ersten Start aus der Gerätesprache (D-071)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guessLang, guessProfileLang } from '../src/ui/format'

const as = (language: string, languages: string[] = [language]) => vi.stubGlobal('navigator', { language, languages })
const zone = (timeZone: string) =>
  vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({ resolvedOptions: () => ({ timeZone }) } as unknown as Intl.DateTimeFormat)
afterEach(() => vi.restoreAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('guessProfileLang', () => {
  it.each([
    ['de-CH', 'de-CH'],
    ['de-LI', 'de-CH'],
    ['de', 'de'],
    ['de-ES', 'de'],
    ['de-DE', 'de'],
    ['de-AT', 'de-AT'],
    ['es-ES', 'es'],
    ['fr-CH', 'fr'],
    ['ja-JP', 'en'],
  ])('%s → %s', (language, expected) => {
    as(language)
    zone('UTC')
    expect(guessProfileLang()).toBe(expected)
  })

  it('iPhone meldet nur de-DE, Zeitzone Zürich → Deutsch (Schweiz)', () => {
    as('de-DE')
    zone('Europe/Zurich')
    expect(guessProfileLang()).toBe('de-CH')
  })

  it('de-CH steht erst weiter hinten in der Sprachliste', () => {
    as('de-DE', ['de-DE', 'de-CH', 'en'])
    zone('Europe/Madrid')
    expect(guessProfileLang()).toBe('de-CH')
  })

  it('Zeitzone Wien → Deutsch (Österreich), Zeitzone Madrid → Deutsch (Deutschland)', () => {
    as('de')
    zone('Europe/Vienna')
    expect(guessProfileLang()).toBe('de-AT')
    vi.restoreAllMocks()
    zone('Europe/Madrid')
    expect(guessProfileLang()).toBe('de')
  })

  it('Französisch in Zürich bleibt Französisch', () => {
    as('fr-CH')
    zone('Europe/Zurich')
    expect(guessProfileLang()).toBe('fr')
  })

  it('Oberfläche ohne passende Sprache: Englisch', () => {
    as('ko-KR')
    expect(guessLang()).toBe('en')
  })
})
