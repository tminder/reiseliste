// Feste Seiten (D-091): Datenschutz enthält denselben Text wie in der App, Links und Sprachen stimmen
import { describe, expect, it } from 'vitest'
import { PRIVACY_DE, PRIVACY_EN } from '../src/privacyText'
import { staticPages } from '../src/staticPages'

const pages = staticPages()

describe('staticPages', () => {
  it('erzeugt Datenschutz und „Über“ in beiden Sprachen', () => {
    expect(Object.keys(pages).sort()).toEqual(['about/index.html', 'datenschutz/index.html', 'privacy/index.html', 'ueber/index.html'])
  })

  it('Datenschutz mit allen Abschnitten aus der App', () => {
    for (const [file, text] of [['datenschutz/index.html', PRIVACY_DE], ['privacy/index.html', PRIVACY_EN]] as const)
      for (const s of text.sections) expect(pages[file]).toContain(s.h.replace(/&/g, '&amp;'))
  })

  it('Sprachangaben und Sprachwechsel', () => {
    expect(pages['ueber/index.html']).toContain('<html lang="de">')
    expect(pages['ueber/index.html']).toContain('href="/about/"')
    expect(pages['about/index.html']).toContain('hreflang="x-default" href="https://cartontheroad.app/about/"')
    expect(pages['privacy/index.html']).toContain('<link rel="canonical" href="https://cartontheroad.app/privacy/" />')
  })

  it('kein JavaScript, Texte maskiert', () => {
    for (const html of Object.values(pages)) {
      expect(html).not.toMatch(/<script/i)
      expect(html).toContain("script-src 'none'")
    }
  })
})
