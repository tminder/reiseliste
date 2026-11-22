// Erzeugt public/landing/<de|en>-<1|2|3>.webp aus Beispieldaten (R-001):
// 1 = Liste „Barcelona“ im Laden, 2 = Vorschläge beim Tippen, 3 = Karte „Dem Personal zeigen“.
import { test } from '@playwright/test'

const LIST = '11111111-2222-3333-4444-555555555555'
const SHOTS = {
  de: { profile: { name: 'Tobias', lang: 'de' }, typing: 'Ra', staff: /Personal/, items: [['500 g', 'Tomaten', 'tomaten'], [null, 'Brot', 'brot'], ['2', 'Milch', 'milch'], ['6', 'Eier', 'eier'], [null, 'Olivenöl', 'olivenoel'], [null, 'Himbeeren tiefgekühlt', 'himbeeren'], [null, 'Wasser', 'wasser']] },
  en: { profile: { name: 'Tobias', lang: 'en' }, typing: 'Cre', staff: /staff/, items: [['500 g', 'Tomatoes', 'tomaten'], [null, 'Bread', 'brot'], ['2', 'Milk', 'milch'], ['6', 'Eggs', 'eier'], [null, 'Olive oil', 'olivenoel'], [null, 'Frozen raspberries', 'himbeeren'], [null, 'Water', 'wasser']] },
} as const

for (const [lang, cfg] of Object.entries(SHOTS)) {
  test.describe(lang, () => {
    test.use({
      viewport: { width: 375, height: 640 },
      deviceScaleFactor: 1.5,
      locale: lang === 'de' ? 'de-CH' : 'en-GB',
      permissions: ['geolocation'],
      geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 10 },
    })
    test(`Landingpage-Fotos ${lang}`, async ({ page }) => {
      const json = (b: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) })
      await page.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()))
      await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
      await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.39002, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona', brand: 'Mercadona', opening_hours: 'Mo-Sa 09:00-21:30' } }] })))
      await page.clock.setFixedTime(new Date(2026, 10, 23, 11, 0))
      await page.addInitScript(
        ({ id, cfg }) => {
          if (sessionStorage.getItem('seeded')) return
          sessionStorage.setItem('seeded', '1')
          const now = new Date(2026, 10, 23, 10, 50).toISOString()
          const items = cfg.items.map(([qty, text, conceptId], n) => ({ id: `00000000-0000-0000-0000-0000000000${10 + n}`, listId: id, text, lang: cfg.profile.lang, conceptId, qty, localOverride: null, checked: false, deleted: false, author: 'Tobias', createdAt: now, updatedAt: now }))
          localStorage.setItem('rl:locConsent', 'yes')
          localStorage.setItem('rl:profile', JSON.stringify(cfg.profile))
          localStorage.setItem('rl:lists', JSON.stringify([id]))
          localStorage.setItem('rl:list:' + id, JSON.stringify({ list: { id, name: 'Barcelona', country: 'ES', updatedAt: now }, items }))
        },
        { id: LIST, cfg },
      )
      await page.goto(`/#/l/${LIST}`)
      // Ohne Supabase zeigt die App „nicht verbunden“: für die Fotos ausblenden
      await page.addStyleTag({ content: '.sync-badge { display: none !important }' })
      await page.waitForTimeout(1500)
      // Wasser abhaken: Einkauf beginnt, Ladenzeile zeigt „Im Mercadona“ (D-078)
      await page.locator('.item', { hasText: cfg.items[6][1] }).locator('.check').click()
      await page.waitForTimeout(2500)
      const shot = async (n: number) => {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(600)
        await page.screenshot({ path: `public/landing/${lang}-${n}.png` })
      }
      await shot(1)
      await page.locator('.add input').pressSequentially(cfg.typing, { delay: 40 })
      await shot(2)
      await page.locator('.add input').fill('')
      await page.locator('body').click({ position: { x: 5, y: 630 } })
      await page.locator('.item', { hasText: cfg.items[4][1] }).getByRole('button', { name: /Mehr|More/ }).click()
      await page.getByRole('menuitem', { name: cfg.staff }).click()
      await shot(3)
    })
  })
}
