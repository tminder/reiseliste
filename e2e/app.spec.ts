// Hauptabläufe von Proviant im Browser (S-002). Build ohne Supabase: Listen leben nur auf dem Gerät.
import { expect, test as base, type Page } from '@playwright/test'

const LIST = '11111111-2222-3333-4444-555555555555'

/** Fremde Server sperren, Fehler und CSP-Verstösse sammeln: Am Ende jedes Tests darf es keine geben. */
const test = base.extend<{ problems: string[] }>({
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
async function seed(page: Page, items: object[] = []) {
  await page.addInitScript(
    ({ id, items }) => {
      if (localStorage.getItem('rl:seeded')) return
      localStorage.setItem('rl:seeded', '1')
      localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', home: 'CH-DE' }))
      localStorage.setItem('rl:lists', JSON.stringify([id]))
      localStorage.setItem('rl:list:' + id, JSON.stringify({ list: { id, name: 'Testing', country: 'ES', updatedAt: '2026-01-01T00:00:00Z' }, items }))
    },
    { id: LIST, items },
  )
}

const item = (n: number, text: string, conceptId: string | null, qty: string | null = null) => ({
  id: `00000000-0000-0000-0000-00000000000${n}`, listId: LIST, text, lang: 'de', conceptId, qty, localOverride: null,
  checked: false, deleted: false, author: 'Tobias', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
})

async function add(page: Page, text: string) {
  await page.locator('.add input').fill(text)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
}

const rows = (page: Page) => page.locator('.item:not(.checked) .main')

test('Profil anlegen, Liste erstellen, Artikel übersetzt', async ({ page, problems }) => {
  void problems
  await page.goto('/')
  await page.getByLabel('Dein Name').fill('Tobias')
  await page.getByRole('button', { name: /Los geht/ }).click()
  // Ohne Listen ist das Formular „Neue Liste“ schon offen
  if (!(await page.locator('form select').first().isVisible())) await page.getByRole('button', { name: /Neue Liste/ }).click()
  await page.locator('form select').first().selectOption('ES')
  await page.getByRole('button', { name: /Liste erstellen/ }).click()
  await expect(page.locator('.add input')).toBeVisible()
  await add(page, 'Milch')
  await expect(page.locator('.item').first()).toContainText('leche')
})

test('Mengen: gleiche Einheit wird addiert, andere Einheit eigene Zeile', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.goto(`/#/l/${LIST}`)
  await add(page, 'Schokolade')
  await add(page, '2 Schokolade')
  await expect(rows(page)).toHaveText(['3xSchokolade'])
  await expect(page.locator('.undo-bar')).toContainText('jetzt 3x')
  await add(page, '2 100g Schokolade')
  await add(page, '1x100g Schokolade')
  await expect(rows(page)).toHaveText(['3xSchokolade', '3 × 100 gSchokolade'])
  await add(page, 'Schwarze Schokolade')
  await expect(page.locator('.item')).toContainText(['chocolate negro'])
  await page.locator('.add input').fill('Schok')
  await expect(page.locator('.add li').first()).toContainText('✓ auf der Liste')
})

test('Abhaken schaltet in die Ladenansicht, „zurück“ schaltet nicht mehr um', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch'), item(2, 'Brot', 'brot')])
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.item').first().locator('.check').click()
  await expect(page.locator('main')).toHaveClass(/shop/)
  await expect(page.locator('.toast')).toContainText('Ladenansicht eingeschaltet')
  await page.locator('.toast').getByRole('button', { name: 'zurück' }).click()
  await expect(page.locator('main')).not.toHaveClass(/shop/)
  await page.locator('.item:not(.checked)').first().locator('.check').click()
  await page.waitForTimeout(600)
  await expect(page.locator('main')).not.toHaveClass(/shop/)
})

test('Menü, Profil ändern und abbrechen, Teilen mit QR-Code', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.goto(`/#/l/${LIST}`)
  await page.getByRole('button', { name: 'Menü' }).click()
  await expect(page.locator('.menu')).toContainText('Mitglieder')
  await expect(page.locator('.menu')).not.toContainText('Version')
  await page.getByRole('menuitem', { name: /Mein Profil/ }).click()
  await page.getByLabel('Dein Name').fill('Tobi')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('h1')).toHaveText('Testing')
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('rl:profile'))) ?? '{}').name).toBe('Tobi')
  await page.getByRole('button', { name: 'Teilen' }).click()
  await expect(page.locator('.sheet img')).toBeVisible()
})

test('Einziges Mitglied: Liste löschen mit Rückgängig und Gnadenfrist', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch')])
  await page.goto(`/#/l/${LIST}`)
  await page.getByRole('button', { name: 'Menü' }).click()
  await page.getByRole('menuitem', { name: /Liste löschen/ }).click()
  await expect(page.locator('.sheet')).toContainText('einzige Mitglied')
  await page.locator('.sheet .danger-btn').click()
  await expect(page.locator('.undo-bar')).toContainText('gelöscht')
  await expect(page.locator('.list-card')).toHaveCount(0)
  await page.locator('.undo-bar button').click()
  await expect(page.locator('.list-card')).toHaveCount(1)
  // Nochmals über den Papierkorb, diesmal die Frist ablaufen lassen
  await page.getByRole('button', { name: 'Liste entfernen' }).click()
  await page.locator('.confirm .danger-btn').click()
  await page.waitForTimeout(8_800)
  await expect(page.locator('.undo-bar')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('rl:pendingDelete'))).toBe('[]')
  await expect(page.locator('.list-card')).toHaveCount(0)
})

test('Datenschutzseite lädt nach', async ({ page, problems }) => {
  void problems
  await page.goto('/#/datenschutz')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('body')).toContainText('Fehlermeldungen')
})
