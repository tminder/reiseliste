// Hauptabläufe von Cart on the Road im Browser (S-002). Build ohne Supabase: Listen leben nur auf dem Gerät.
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
async function seed(page: Page, items: object[] = [], country = 'ES') {
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
  if (!(await page.locator('form select').first().isVisible())) await page.getByRole('button', { name: /Neue Liste/ }).click()
  await expect(page.getByRole('button', { name: /Liste erstellen/ })).toBeDisabled() // Name ist Pflicht (D-058)
  await page.getByLabel('Name').fill('Barcelona')
  await page.locator('form select').first().selectOption('ES')
  await page.getByRole('button', { name: /Liste erstellen/ }).click()
  await expect(page.locator('.add input')).toBeVisible()
  await add(page, 'Milch')
  await expect(page.locator('.item').first()).toContainText('leche')
})

test('Übersicht zeigt die anderen Teilnehmer, jüngste Aktivität zuerst', async ({ page, problems }) => {
  void problems
  const by = (n: number, author: string, at: string) => ({ ...item(n, 'Milch', 'milch'), author, createdAt: at, updatedAt: at })
  await seed(page, [by(1, 'Anna', '2026-11-01T08:00:00Z'), by(2, 'Tobias', '2026-11-03T08:00:00Z'), by(3, 'Bea', '2026-11-02T08:00:00Z')])
  await page.goto('/')
  await expect(page.locator('.list-people')).toHaveText('Bea, Anna')
})

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

test('Ohne „Schon mal gekauft“: Beispiele unter dem Eingabefeld (D-030)', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.add input')).toHaveAttribute('placeholder', 'Was brauchst du?')
  await page.locator('.add input').click()
  await page.locator('.again .chip', { hasText: '2 Milch' }).click()
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

test('Eine Ansicht (D-055): Eingabe immer da, Löschen nur bei Abgehakten, Zeigen-Karte', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch'), item(2, 'Brot', 'brot')])
  await page.goto(`/#/l/${LIST}`)
  const first = page.locator('.item').first()
  await expect(first.getByRole('button', { name: 'Löschen' })).toHaveCount(0)
  await first.locator('.check').click()
  await page.waitForTimeout(600)
  await expect(page.locator('.add input')).toBeVisible()
  const checked = page.locator('.item.checked').first()
  await checked.getByRole('button', { name: 'Löschen' }).click()
  await expect(page.locator('.undo-bar')).toContainText('gelöscht')
  // Begriff in der Landessprache antippen → Zeigen-Karte
  await page.locator('.item').first().locator('.term-btn').click()
  await expect(page.locator('.showcard')).toBeVisible()
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

test.describe('Laden', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })

  test('Laden von Hand wählen bleibt, auch weiter weg und nach dem ersten Abhaken (D-033)', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) =>
      r.fulfill(
        json({
          elements: [
            { type: 'node', id: 1, lat: 41.3927, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona' } },
            { type: 'node', id: 2, lat: 41.3935, lon: 2.17, tags: { shop: 'supermarket', name: 'Dia' } },
            { type: 'node', id: 3, lat: 41.401, lon: 2.17, tags: { shop: 'supermarket', name: 'Lidl' } },
          ],
        }),
      ),
    )
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shopline')).toContainText('Mercadona')
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await page.locator('.shop-alts .chip', { hasText: 'Lidl' }).click()
    await page.waitForTimeout(1500)
    await expect(page.locator('.shopline')).toContainText('Lidl') // 1,2 km entfernt, trotzdem gewählt
    await page.locator('.item').first().locator('.check').click() // Einkauf läuft: Laden wird genauer geprüft (D-046)
    await page.waitForTimeout(1500)
    await expect(page.locator('.shopline')).toContainText('Lidl')
  })
})

test.describe('Reiseland nach Sprache (D-041)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })

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
    await expect(page.locator('form select').first().locator('option:checked')).toHaveText(/Automatisch \(🇪🇸 Spanien\)/, { timeout: 10_000 })
  })

  test('Spanischsprachig in Spanien: Liste bleibt beim bisherigen Land', async ({ page, problems }) => {
    void problems
    await open(page, 'es')
    await page.waitForTimeout(3000)
    await expect(page.locator('.topbar .sub')).toContainText(/Ital/)
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
  await expect(page.locator('.list-sub, header')).toContainText('Tiếng Việt')
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
  await expect(page.locator('header')).toContainText('繁體中文')
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
  await page.getByLabel('Name').fill('Rundreise')
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
    await page.getByLabel('Name').fill('Barcelona')
    await page.getByRole('button', { name: /Liste erstellen/ }).click()
    await expect(page.locator('.add input')).toBeVisible()
    await expect(page.locator('.sheet')).toHaveCount(0)
  })
})

test('Onboarding: Beispiel-Liste vorne, Hinweise im Ablauf (D-068)', async ({ page, problems }) => {
  void problems
  await page.goto('/')
  await expect(page.locator('h2')).toContainText('gemeinsame Einkaufsliste')
  await expect(page.locator('.demo-list')).toHaveCount(0) // kein Beispielbild (Wunsch des Inhabers)
  await page.getByLabel('Dein Name').fill('Tobias')
  await page.getByRole('button', { name: /Los geht/ }).click()
  await expect(page.locator('form')).toHaveCount(0) // Formular erst nach Antippen
  await expect(page.locator('.empty-home')).toContainText('Leg deine erste an')
  await expect(page.getByRole('button', { name: /Neue Liste/ })).toHaveClass(/primary/)
  await page.getByRole('button', { name: /Neue Liste/ }).click()
  await expect(page.locator('form select').first().locator('option[value="auto"]')).toHaveText('Automatisch (nach Standort)')
  await page.getByLabel('Name').fill('Barcelona')
  await page.locator('form select').first().selectOption('ES')
  await page.getByRole('button', { name: /Liste erstellen/ }).click()
  await add(page, 'Milch')
  await expect(page.locator('.note')).toContainText('wie er im Laden des Reiselands heisst')
  await page.getByRole('button', { name: 'Verstanden' }).click()
  await add(page, 'Brot')
  await add(page, 'Eier')
  await expect(page.locator('.note')).toContainText('Teile die Liste')
  await page.locator('.note').getByRole('button', { name: 'Teilen' }).click()
  await expect(page.locator('.sheet')).toBeVisible()
})
