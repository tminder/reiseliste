// Umschrift (D-092): Griechisch nach Aussprache, Pinyin für alle chinesischen Begriffe
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { greek, loadRomanization, romanize } from '../src/lib/romanize'

describe('greek', () => {
  it.each([
    ['γάλα', 'gála'],
    ['ψωμί', 'psomí'],
    ['αυγά', 'avgá'],
    ['αυτοκίνητο', 'aftokínito'],
    ['ελαιόλαδο', 'eleólado'],
    ['μπύρα', 'bíra'],
    ['ντομάτες', 'domátes'],
    ['πατάτες', 'patátes'],
    ['τυρί', 'tirí'],
    ['κρασί', 'krasí'],
    ['μουστάρδα', 'mustárda'],
    ['καφές', 'kafés'],
    ['οδοντόκρεμα', 'odondókrema'],
    ['τσάι', 'tsái'],
    ['κέικ', 'kéik'],
    ['αγγούρι', 'angúri'],
    ['γιαούρτι', 'yaúrti'],
  ])('%s → %s', (gr, lat) => expect(greek(gr)).toBe(lat))

  it('lateinische Schrift: keine Umschrift', () => expect(greek('milk')).toBeNull())
})

describe('Pinyin', () => {
  it('jeder chinesische Begriff hat Pinyin (sonst: npm run dict:pinyin)', () => {
    const zh = JSON.parse(readFileSync('src/data/dictionary/zh.json', 'utf8')) as Record<string, string[]>
    const py = JSON.parse(readFileSync('src/data/zh-pinyin.json', 'utf8')) as Record<string, string>
    const missing = Object.values(zh).flat().filter((t) => !py[t])
    expect(missing).toEqual([])
  })

  it('romanize nach dem Laden', async () => {
    await loadRomanization('zh')
    expect(romanize('鮮奶', 'zh')).toBe('xiān nǎi')
    expect(romanize('leche', 'es')).toBeNull()
  })
})
