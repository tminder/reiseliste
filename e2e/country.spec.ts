// Reiseland, Sprache, Standort (S-002)
import { type Page } from '@playwright/test'
import { test, LIST, add, expect, item, json, rows, seed } from './helpers'

test('Länder-Abweichung: in Mexiko „crema“ statt „nata“, Wörterbuch wird nachgeladen (D-053)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Sahne', 'sahne')], 'MX')
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item').first()).toContainText('crema')
  await expect(page.locator('.item').first()).not.toContainText('nata')
  // Schweizer Wort aus de-CH wird erkannt und zum selben Artikel gezählt
  await add(page, 'Rahm')
  await expect(page.locator('.undo-bar')).toContainText('war schon auf der Liste')
  await expect(rows(page)).toHaveCount(1)
})

test('Profil Deutsch (Schweiz): Artikel anderer erscheinen mit Schweizer Begriff (D-056)', async ({ page, problems }) => {
  void problems
  await seed(page, [{ ...item(1, 'Sahne', 'sahne'), author: 'Anna' }, item(2, 'Schwarze Schokolade', 'schokolade')])
  await page.addInitScript(() => localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' })))
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item .main').first()).toContainText('Rahm')
  await expect(page.locator('.item .main', { hasText: 'Schwarze Schokolade' })).toHaveCount(1)
  await page.locator('a.back').click()
  await expect(page.locator('header')).toContainText('Tobias · 🇨🇭 DE')
})

test.describe('Nicht im Reiseland (D-075)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.37, longitude: 8.54, accuracy: 20 } })
  test('keine Ladensuche, keine Ladenzeile', async ({ page, problems }) => {
    void problems
    let overpass = 0
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'ch', state: 'Zürich' } })))
    await page.route(/interpreter/, (r) => {
      overpass++
      return r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 47.3701, lon: 8.54, tags: { shop: 'supermarket', name: 'Coop' } }] }))
    })
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.addInitScript((id) => {
      localStorage.setItem('rl:locConsent', 'yes')
      // Fest gewähltes Reiseland Spanien, sonst wechselt die Liste in die Schweiz (D-040)
      const key = 'rl:list:' + id
      const data = JSON.parse(localStorage.getItem(key)!)
      data.list.autoCountry = false
      localStorage.setItem(key, JSON.stringify(data))
    }, LIST)
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.add input')).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.locator('.shopline')).toHaveCount(0)
    expect(overpass).toBe(0)
  })
})

test.describe('Reiseland nach Sprache (D-041)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })

  async function open(page: Page, lang: string, autoCountry?: boolean) {
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [] })))
    await page.addInitScript(
      ({ id, lang, autoCountry }) => {
        if (localStorage.getItem('rl:seeded')) return
        localStorage.setItem('rl:seeded', '1')
        // Altes Profil mit Wohnland Spanien: darf keine Rolle mehr spielen
        localStorage.setItem('rl:profile', JSON.stringify({ name: 'Anna', lang, home: 'ES' }))
        localStorage.setItem('rl:lists', JSON.stringify([id]))
        localStorage.setItem('rl:list:' + id, JSON.stringify({ list: { id, name: 'Wochenende', country: 'IT', autoCountry, updatedAt: '2026-01-01T00:00:00Z' }, items: [] }))
      },
      { id: LIST, lang, autoCountry },
    )
    await page.goto(`/#/l/${LIST}`)
  }

  test('Expat (Deutsch, wohnt in Spanien): Liste wechselt auf Spanien', async ({ page, problems }) => {
    void problems
    await open(page, 'de')
    await expect(page.locator('.topbar .sub')).toContainText('Spanien', { timeout: 10_000 })
    await expect(page.locator('.toast')).toContainText('Reiseland')
  })

  test('Fest gewähltes Reiseland (D-057): Liste bleibt bei Italien', async ({ page, problems }) => {
    void problems
    await open(page, 'de', false)
    await page.waitForTimeout(3000)
    await expect(page.locator('.topbar .sub')).toContainText(/Ital/)
  })

  test('Neue Liste: Reiseland steht auf „Automatisch (🇪🇸 Spanien)“', async ({ page, problems }) => {
    void problems
    await open(page, 'de')
    await page.locator('a.back').click()
    if (!(await page.locator('form select').first().isVisible())) await page.getByRole('button', { name: /Neue Liste/ }).click()
    await expect(page.locator('form select').first().locator('option:checked')).toHaveText(/Automatisch \(🇪🇸 Spanien – Spanisch\)/, { timeout: 10_000 })
  })

  test('Spanischsprachig in Spanien: Liste wechselt auch ins eigene Sprachgebiet (D-040)', async ({ page, problems }) => {
    void problems
    await open(page, 'es')
    await expect(page.locator('.toast')).toBeVisible({ timeout: 10_000 }) // Meldung zum Länderwechsel
    await expect(page.locator('.topbar .sub')).toHaveCount(0) // zu Hause: kein Untertitel (D-081)
  })
})

test.describe('iPhone in Safari (D-061)', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' })

  test('Eigene Liste: kein Tipp „Home-Bildschirm“, vorübergehend aus (D-061)', async ({ page, problems }) => {
    void problems
    await seed(page)
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.add input')).toBeVisible()
    await expect(page.locator('.ios-hint', { hasText: 'Home-Bildschirm' })).toHaveCount(0)
  })

  test('Fremder Link: Hinweis „Link in die App holen“', async ({ page, problems }) => {
    void problems
    // Ohne Supabase lädt nur eine zwischengespeicherte Liste; sie steht aber nicht in „Deine Listen“ (wie neu über den Link)
    await seed(page)
    await page.addInitScript(() => {
      if (!localStorage.getItem('rl:once')) localStorage.setItem('rl:lists', '[]')
      localStorage.setItem('rl:once', '1')
    })
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.ios-hint')).toContainText('Du bist im Browser')
    await expect(page.locator('.ios-hint').getByRole('button', { name: 'Link kopieren' })).toBeVisible()
  })
})

test('Liste für Vietnam: Artikel auf Vietnamesisch (D-062)', async ({ page, problems }) => {
  void problems
  await seed(page, [], 'VN')
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.list-sub, header')).toContainText('Vietnam – Vietnamesisch')
  await expect(page).toHaveTitle('Testing · Cart on the Road') // Seitentitel = Listenname (D-076)
  await add(page, 'Milch')
  await add(page, 'Butter')
  await expect(page.locator('.item').filter({ hasText: 'Milch' })).toContainText('sữa tươi')
  await expect(page.locator('.item').filter({ hasText: 'Butter' })).toContainText('bơ')
})

test('Reiseland-Auswahl: Vorschläge oben, dann alphabetisch (D-063)', async ({ page, problems }) => {
  void problems
  await seed(page, [], 'IT')
  await page.goto(`/#/l/${LIST}`)
  await page.locator('a.back').click()
  if (!(await page.locator('form select').first().isVisible())) await page.getByRole('button', { name: /Neue Liste/ }).click()
  const select = page.locator('form select').first()
  await expect(select.locator('optgroup[label="Vorschläge"] option')).toHaveText([/Italien/])
  const all = await select.locator('optgroup[label="Alle Länder"] option').allTextContents()
  const names = all.map((s) => s.replace(/^\S+\s/, '').split(' – ')[0])
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'de')))
  expect(names[0]).toBe('Argentinien')
})

test('Liste für Taiwan: Artikel auf traditionellem Chinesisch (D-064)', async ({ page, problems }) => {
  void problems
  await seed(page, [], 'TW')
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('header')).toContainText('Taiwan – Chinesisch (traditionell)')
  await add(page, '2 Milch')
  await add(page, 'Eier')
  await expect(page.locator('.item').filter({ hasText: 'Milch' })).toContainText('鮮奶')
  await expect(page.locator('.item').filter({ hasText: 'Eier' })).toContainText('雞蛋')
})

test('Neue Liste auf „Automatisch“ ohne Standort: Blatt mit „Land selbst wählen“ (D-066, D-067)', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.goto(`/#/l/${LIST}`)
  await page.locator('a.back').click()
  if (!(await page.locator('form select').first().isVisible())) await page.getByRole('button', { name: /Neue Liste/ }).click()
  expect(await page.locator('form select').first().inputValue()).toBe('auto') // immer die Vorauswahl
  await page.getByLabel('Name', { exact: true }).fill('Rundreise')
  await page.getByRole('button', { name: /Liste erstellen/ }).click()
  const sheet = page.locator('.sheet')
  await expect(sheet).toContainText('wechselt das Reiseland mit deinem Standort')
  await sheet.getByRole('button', { name: 'Land selbst wählen' }).click()
  await sheet.locator('select').selectOption('IT')
  await sheet.getByRole('button', { name: 'Liste erstellen' }).click()
  await expect(page.locator('.add input')).toBeVisible()
  await expect(page.locator('header')).toContainText('Italien')
})

test.describe('Standort schon erlaubt', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('„Automatisch“ ohne Zwischenschritt (D-067)', async ({ page, problems }) => {
    void problems
    await seed(page)
    await page.route(/nominatim/, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { country_code: 'es' } }) }))
    await page.goto(`/#/l/${LIST}`)
    await page.locator('a.back').click()
    if (!(await page.locator('form select').first().isVisible())) await page.getByRole('button', { name: /Neue Liste/ }).click()
    expect(await page.locator('form select').first().inputValue()).toBe('auto')
    await page.getByLabel('Name', { exact: true }).fill('Barcelona')
    await page.getByRole('button', { name: /Liste erstellen/ }).click()
    await expect(page.locator('.add input')).toBeVisible()
    await expect(page.locator('.sheet')).toHaveCount(0)
  })
})

test('Im eigenen Sprachraum keine Übersetzung, Untertitel ohne doppelte Sprache (D-081)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch')], 'CH-DE')
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item').first()).toContainText('Milch')
  await expect(page.locator('.item .local')).toHaveCount(0)
  await expect(page.locator('.item .missing')).toHaveCount(0)
  await expect(page.locator('.topbar .sub')).toHaveText(/^🇨🇭 Schweiz – Deutsch\s*$/)
  await expect(page.locator('.topbar .sub')).not.toContainText('Deutschschweiz')
})

test.describe('Neue Liste zu Hause in der Schweiz (D-087)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.37, longitude: 8.54, accuracy: 20 } })

  test('„Automatisch“ zeigt die Schweiz, nicht Spanien', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ address: { country_code: 'ch', state: 'Zürich' } }) }),
    )
    await page.addInitScript(() => {
      localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' }))
      localStorage.setItem('rl:locConsent', 'yes')
      // Von der Reise: Spanien vor einer Stunde erkannt
      localStorage.setItem('rl:here', JSON.stringify({ at: Date.now() - 3_600_000, code: 'ES', lat: 41.39, lon: 2.17 }))
    })
    await page.goto('/')
    await page.getByRole('button', { name: /Neue Liste/ }).click()
    await expect(page.locator('form select').first().locator('option:checked')).toHaveText(/Automatisch \(🇨🇭 Schweiz – Deutsch\)/)
  })
})

test('Zu Hause: kein Reiseland unter dem Listennamen (D-081)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch')], 'CH-DE')
  await page.addInitScript(() => localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' })))
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item').first()).toContainText('Milch')
  await expect(page.locator('.topbar .sub')).toHaveCount(0)
  await page.getByRole('button', { name: 'Menü' }).click()
  await expect(page.getByRole('menuitem', { name: 'Umrechnen' })).toHaveCount(0) // gleiche Währung
})

test.describe('„Automatisch (…)“ in den Listen-Einstellungen (D-057)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('zeigt, was automatisch gilt, nicht das zuletzt fest gewählte Land', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await page.getByRole('button', { name: 'Menü' }).click()
    await page.getByRole('menuitem', { name: /Listen-Einstellungen/ }).click()
    const select = page.getByLabel('Reiseland')
    await select.selectOption('IT')
    await select.selectOption('auto')
    await expect(select.locator('option[value="auto"]')).toContainText('Spanien')
    await expect(page.locator('.sheet')).toContainText('auch zu Hause')
  })

  test('fest gewähltes Land → „Automatisch“: neues Land ohne Hinweis „Reiseland geändert“', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')], 'IT')
    await page.addInitScript((id) => {
      const raw = JSON.parse(localStorage.getItem('rl:list:' + id)!)
      raw.list.autoCountry = false
      localStorage.setItem('rl:list:' + id, JSON.stringify(raw))
    }, LIST)
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.item').first()).toContainText('latte')
    await page.getByRole('button', { name: 'Menü' }).click()
    await page.getByRole('menuitem', { name: /Listen-Einstellungen/ }).click()
    await page.getByLabel('Reiseland').selectOption('auto')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.locator('.item').first()).toContainText('leche')
    await page.waitForTimeout(800)
    await expect(page.getByText(/Reiseland auf/)).toHaveCount(0)
  })
})
