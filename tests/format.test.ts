// Sprache beim ersten Start aus der Gerätesprache (D-071)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guessLang, guessProfileLang } from '../src/ui/format'

const as = (language: string) => vi.stubGlobal('navigator', { language })
afterEach(() => vi.unstubAllGlobals())

describe('guessProfileLang', () => {
  it.each([
    ['de-CH', 'de-CH'],
    ['de-LI', 'de-CH'],
    ['de', 'de-CH'],
    ['de-ES', 'de-CH'],
    ['de-DE', 'de'],
    ['de-AT', 'de-AT'],
    ['es-ES', 'es'],
    ['fr-CH', 'fr'],
    ['ja-JP', 'en'],
  ])('%s → %s', (language, expected) => {
    as(language)
    expect(guessProfileLang()).toBe(expected)
  })

  it('Oberfläche ohne passende Sprache: Englisch', () => {
    as('ko-KR')
    expect(guessLang()).toBe('en')
  })
})
