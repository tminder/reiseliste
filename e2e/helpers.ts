// Gemeinsame Hilfen der Oberflächentests (S-002). Build ohne Supabase: Listen leben nur auf dem Gerät.
// Tests nach Bereichen: list.spec.ts, shop.spec.ts, country.spec.ts. Gewartet wird auf Zustände, nicht auf Zeit;
// feste Pausen nur dort, wo geprüft wird, dass etwas NICHT passiert (z. B. keine Suche, kein Hinweis).
import { expect, test as base, type Page } from '@playwright/test'
export { expect }

export const LIST = '11111111-2222-3333-4444-555555555555'

/** Fremde Server sperren, Fehler und CSP-Verstösse sammeln: Am Ende jedes Tests darf es keine geben. */
export const test = base.extend<{ problems: string[] }>({
  problems: async ({ page }, provide) => {
    const problems: string[] = []
    page.on('pageerror', (e) => problems.push(`JS: ${e.message}`))
    page.on('console', (m) => {
      if (/Content Security Policy/i.test(m.text())) problems.push(`CSP: ${m.text()}`)
    })
    await page.route('**/*', (r) => (r.request().url().startsWith('http://localhost') ? r.continue() : r.abort()))
    await provide(problems)
    expect(problems).toEqual([])
  },
})

/** Profil und eine leere Liste „Testing“ (Spanien) ins Gerät legen */
export async function seed(page: Page, items: object[] = [], country = 'ES') {
  await page.addInitScript(
    ({ id, items, country }) => {
      if (localStorage.getItem('rl:seeded')) return
      localStorage.setItem('rl:seeded', '1')
      localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', home: 'CH-DE' }))
      localStorage.setItem('rl:lists', JSON.stringify([id]))
      localStorage.setItem('rl:list:' + id, JSON.stringify({ list: { id, name: 'Testing', country, updatedAt: '2026-01-01T00:00:00Z' }, items }))
    },
    { id: LIST, items, country },
  )
}

export const item = (n: number, text: string, conceptId: string | null, qty: string | null = null) => ({
  id: `00000000-0000-0000-0000-00000000000${n}`, listId: LIST, text, lang: 'de', conceptId, qty, localOverride: null,
  checked: false, deleted: false, author: 'Tobias', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
})

export async function add(page: Page, text: string) {
  await page.locator('.add input').fill(text)
  await page.keyboard.press('Enter')
  await expect(page.locator('.add input')).toHaveValue('')
}

export const rows = (page: Page) => page.locator('.item:not(.checked) .main')

/** JSON-Antwort mit CORS für nachgebildete Dienste (Overpass, Nominatim, Open Food Facts …) */
export const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
