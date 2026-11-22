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
  await page.getByLabel('Name', { exact: true }).fill('Barcelona')
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
  // Zeigen-Karte über das Menü „…“ (D-073)
  await page.locator('.item').first().getByRole('button', { name: 'Mehr' }).click()
  await page.getByRole('menuitem', { name: 'Dem Personal zeigen' }).click()
  await expect(page.locator('.showcard')).toBeVisible()
})

test('Ganze Karte hakt ab, Knöpfe nicht (D-073)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch')])
  await page.goto(`/#/l/${LIST}`)
  const card = page.locator('.item').first()
  await card.locator('.local').click() // auch die Übersetzung hakt ab
  await expect(page.locator('.item.checked')).toHaveCount(1)
  await page.waitForTimeout(600) // Animation abwarten (D-044)
  await page.locator('.item.checked .txt').click() // nochmals: wieder offen
  await expect(page.locator('.item.checked')).toHaveCount(0)
  await page.locator('.item').first().getByRole('button', { name: 'Mehr' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.locator('.item.checked')).toHaveCount(0)
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
  // Link kopieren als eigener Knopf (D-089)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Link kopieren' }).click()
  await expect(page.locator('.sheet')).toContainText('Kopiert')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`#/l/${LIST}`)
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

test.describe('Im Laden, GPS im Gebäude ungenau (D-078)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 80 } })

  test('„Im <Laden>“ erst nach dem ersten Abhaken', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) =>
      r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.3906, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona' } }] })),
    )
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    // Vor dem Einkauf: Entfernung
    await expect(page.locator('.shop-current')).toContainText(/Mercadona\s*\d+ m/)
    await expect(page.locator('.shop-current.here')).toHaveCount(0)
    // Erster Artikel abgehakt: Einkauf läuft
    await page.locator('.item').first().locator('.check').click()
    await expect(page.locator('.shop-current.here')).toContainText('Im Mercadona') // 67 m entfernt, GPS auf 80 m genau
    await expect(page.locator('.shop-current')).not.toContainText(/\d+ m\b/)
  })
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
    await expect(page.locator('.sheet .shop-options li')).toHaveCount(3)
    await page.locator('.shop-options button', { hasText: 'Lidl' }).click()
    await expect(page.locator('.sheet')).toHaveCount(0)
    await page.waitForTimeout(1500)
    await expect(page.locator('.shopline')).toContainText('Lidl') // 1,2 km entfernt, trotzdem gewählt
    await page.locator('.item').first().locator('.check').click() // Einkauf läuft: Laden wird genauer geprüft (D-046)
    await page.waitForTimeout(1500)
    await expect(page.locator('.shopline')).toContainText('Lidl')
  })
})

test.describe('Nicht im Reiseland (D-075)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.37, longitude: 8.54, accuracy: 20 } })
  test('keine Ladensuche, keine Ladenzeile', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
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

test('Onboarding ohne Hinweise in der Liste (D-068)', async ({ page, problems }) => {
  void problems
  await page.goto('/')
  await expect(page.locator('h2')).toContainText('Einkaufsliste für die Reise')
  await expect(page.locator('.demo-list')).toHaveCount(0) // kein Beispielbild (Wunsch des Inhabers)
  await page.getByLabel('Dein Name').fill('Tobias')
  await page.getByRole('button', { name: /Los geht/ }).click()
  await expect(page.locator('form')).toHaveCount(0) // Formular erst nach Antippen
  await expect(page.locator('.empty-home')).toContainText('Leg deine erste an')
  await expect(page.getByRole('button', { name: /Neue Liste/ })).toHaveClass(/primary/)
  await page.getByRole('button', { name: /Neue Liste/ }).click()
  await expect(page.locator('form select').first().locator('option[value="auto"]')).toHaveText('Automatisch (nach Standort)')
  await page.getByLabel('Name', { exact: true }).fill('Barcelona')
  await page.locator('form select').first().selectOption('ES')
  await page.getByRole('button', { name: /Liste erstellen/ }).click()
  await add(page, 'Milch')
  await add(page, 'Brot')
  await add(page, 'Eier')
  await expect(page.locator('.note')).toHaveCount(0) // keine Hinweise in der Liste (D-068)
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

test('Einladung ohne Erklärungstext (D-068)', async ({ page, problems }) => {
  void problems
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('h2')).toContainText('eingeladen')
  await expect(page.locator('.lead')).toHaveCount(0)
})

test('Namen bei Artikeln nur, wenn mehrere Personen schreiben (D-082)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch')])
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item').first()).toContainText('leche')
  await expect(page.locator('.item').first()).not.toContainText('Tobias')
  await add(page, 'Brot')
  await expect(page.locator('.item')).not.toContainText(['Tobias'])
})

test('Namen bei Artikeln mit zwei Schreibenden (D-082)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch'), { ...item(2, 'Brot', 'brot'), author: 'Anna' }])
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item', { hasText: 'Milch' })).toContainText('leche · Tobias')
  await expect(page.locator('.item', { hasText: 'Brot' })).toContainText('Anna')
})

test('Offenen Artikel über das Menü „…“ löschen, mit Rückgängig (D-085)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch'), item(2, 'Brot', 'brot')])
  await page.goto(`/#/l/${LIST}`)
  const milch = page.locator('.item', { hasText: 'Milch' })
  await expect(milch.getByRole('button', { name: 'Löschen' })).toHaveCount(0) // offen: kein ✕
  await milch.getByRole('button', { name: 'Mehr' }).click()
  await page.getByRole('menuitem', { name: 'Löschen' }).click()
  await expect(page.locator('.item', { hasText: 'Milch' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Rückgängig/ })).toBeVisible()
})

test.describe('Ladensuche: Fehler nur im Auswahlblatt (D-086)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })

  test('Zeile zeigt „Suche Laden …“, Blatt zeigt Fehler und Countdown', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ address: { country_code: 'es' } }) }))
    await page.route(/interpreter/, (r) => r.abort())
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shopline')).toContainText('Suche Laden')
    await page.waitForTimeout(1500)
    await expect(page.locator('.shopline')).not.toContainText('OpenStreetMap')
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.sheet')).toContainText('OpenStreetMap ist nicht erreichbar')
    await expect(page.locator('.sheet')).toContainText(/Neuer Versuch|\d+ s/)
  })
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

test('Feste Seiten mit Knopf zur App (D-090, D-091)', async ({ page, problems }) => {
  void problems
  for (const [path, cta] of [['/de/', 'App öffnen'], ['/en/', 'Open the app'], ['/datenschutz/', 'App öffnen'], ['/privacy/', 'Open the app'], ['/ueber/', 'App öffnen'], ['/about/', 'Open the app']]) {
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('link', { name: cta }).first()).toHaveAttribute('href', '/')
    for (const img of await page.locator('img').all()) expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
  }
})

test('Zeigen-Karte: Umschrift für Griechisch und Chinesisch, Vorlesen mit passender Stimme (D-092)', async ({ page, problems }) => {
  void problems
  // Stimmen nachbilden: Testbrowser haben keine
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { spoken: string[] }).spoken = spoken
    const voices = [{ lang: 'el-GR', name: 'Melina', default: false, localService: true, voiceURI: 'el' }]
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => voices, speak: (u: { text: string }) => spoken.push(u.text), cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
    })
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string
      constructor(t: string) {
        this.text = t
      }
    }
  })
  await seed(page, [item(1, 'Milch', 'milch')], 'GR')
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.item', { hasText: 'Milch' }).getByRole('button', { name: 'Mehr' }).click()
  await page.getByRole('menuitem', { name: /Personal/ }).click()
  await expect(page.locator('.showcard-term')).toContainText('γάλα')
  await expect(page.locator('.showcard-latin')).toHaveText('gála')
  await page.getByRole('button', { name: 'Vorlesen' }).click()
  expect(await page.evaluate(() => (window as unknown as { spoken: string[] }).spoken)).toEqual(['γάλα'])
  await expect(page.locator('.showcard')).toBeVisible() // Vorlesen schliesst die Karte nicht
})

test('Zeigen-Karte Taiwan: Pinyin, ohne passende Stimme kein Vorlesen (D-092)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch')], 'TW')
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.item', { hasText: 'Milch' }).getByRole('button', { name: 'Mehr' }).click()
  await page.getByRole('menuitem', { name: /Personal/ }).click()
  await expect(page.locator('.showcard-latin')).toHaveText('xiān nǎi')
  await expect(page.getByRole('button', { name: 'Vorlesen' })).toHaveCount(0)
})

test('Umrechnen: Euro in Franken, Richtung tauschen (D-093)', async ({ page, problems }) => {
  void problems
  await page.route(/api\.frankfurter\.dev\/v2\/rate\/EUR\/CHF/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ date: '2026-11-20', base: 'EUR', quote: 'CHF', rate: 0.94 }) }),
  )
  await seed(page, [item(1, 'Milch', 'milch')])
  await page.addInitScript(() => localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' })))
  await page.goto(`/#/l/${LIST}`)
  await page.getByRole('button', { name: 'Menü' }).click()
  await page.getByRole('menuitem', { name: 'Umrechnen' }).click()
  await expect(page.locator('.convert-result')).toContainText('9.40')
  await expect(page.locator('.convert-result')).toContainText('CHF')
  await page.getByRole('button', { name: 'Richtung tauschen' }).click()
  await expect(page.locator('.convert-result')).toContainText('10.64')
  await expect(page.locator('.sheet')).toContainText('20.11.2026')
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

test.describe('Fotos mit Laden (D-094)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('Open Food Facts nicht erreichbar: Countdown und automatischer neuer Versuch', async ({ page, problems }) => {
  void problems
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
  await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.3901, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona', brand: 'Mercadona' } }] })))
  await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
  await page.clock.install()
  let calls = 0
  await page.route(/openfoodfacts\.org\/api/, (r) => {
    calls++
    if (calls === 1) return r.abort()
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ products: [{ code: '1', product_name: 'Leche entera', brands: 'Hacendado', image_front_small_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }] }),
    })
  })
  await seed(page, [item(1, 'Milch', 'milch')])
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.item', { hasText: 'Milch' }).getByRole('button', { name: 'Produktfotos' }).click()
  await expect(page.locator('.photos-note')).toContainText(/Neuer Versuch in 1[45] s/)
  await page.clock.fastForward(5_000)
  await expect(page.locator('.photos-note')).toContainText(/Neuer Versuch in (9|10) s/)
  await page.clock.fastForward(11_000)
  await expect(page.locator('.photos')).toContainText('Leche entera')
  expect(calls).toBe(2)
  })
})

test('Tipp im Bereich der Fotos, nur auf Reisen (D-095)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'H-Milch', 'hmilch')])
  await page.goto(`/#/l/${LIST}`)
  const row = page.locator('.item', { hasText: 'H-Milch' })
  await row.getByRole('button', { name: 'Tipp' }).click()
  await expect(row.locator('.item-wide .hint')).toContainText('Regal')
  await expect(row).not.toHaveClass(/checked/) // Tipp öffnen hakt nicht ab
})

test('Zu Hause kein Tipp (D-095)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'H-Milch', 'hmilch')], 'CH-DE')
  await page.addInitScript(() => localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' })))
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item').first()).toContainText('H-Milch')
  await expect(page.getByRole('button', { name: 'Tipp' })).toHaveCount(0)
})

test('Vorschlag zeigt das getippte Wort: Passata, Obst (D-096)', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.addInitScript(() => localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' })))
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.add input').fill('Pass')
  await expect(page.locator('.suggestions button').first()).toHaveText(/Passata\s*→\s*tomate tamizado/)
  await page.locator('.suggestions button').first().click()
  await expect(page.locator('.item').first()).toContainText('Passata')
  await expect(page.locator('.item').first()).not.toContainText('Tomatensauce')
  await page.locator('.add input').fill('Obs')
  await expect(page.locator('.suggestions button').first()).toHaveText(/Obst\s*→\s*fruta/)
})

test('Namen bei Artikeln in den Listeneinstellungen ausschalten (D-097)', async ({ page, problems }) => {
  void problems
  await seed(page, [item(1, 'Milch', 'milch'), { ...item(2, 'Brot', 'brot'), author: 'Anna' }])
  await page.goto(`/#/l/${LIST}`)
  await expect(page.locator('.item', { hasText: 'Brot' })).toContainText('Anna')
  await page.getByRole('button', { name: 'Menü' }).click()
  await page.getByRole('menuitem', { name: /Listen-Einstellungen/ }).click()
  await page.getByLabel(/Namen bei Artikeln zeigen/).uncheck()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.locator('.item', { hasText: 'Brot' })).not.toContainText('Anna')
  await page.reload()
  await expect(page.locator('.item', { hasText: 'Brot' })).not.toContainText('Anna') // bleibt gespeichert
})

test('Merkmal „gefroren“ in der Landessprache, eigener TK-Begriff ohne Zusatz (D-098)', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.goto(`/#/l/${LIST}`)
  await add(page, 'gefrorene Himbeeren')
  await add(page, 'Tiefkühlspinat')
  await expect(page.locator('.item', { hasText: 'Himbeeren' }).locator('.attr')).toHaveText('❄️ congelado')
  await expect(page.locator('h3', { hasText: /Tiefkühl/ })).toBeVisible() // gefrorene Himbeeren bei Tiefkühl
  await expect(page.locator('.item', { hasText: 'Tiefkühlspinat' })).toContainText('espinacas congeladas')
  await expect(page.locator('.item', { hasText: 'Tiefkühlspinat' }).locator('.attr')).toHaveCount(0)
  await page.locator('.item', { hasText: 'Himbeeren' }).getByRole('button', { name: 'Mehr' }).click()
  await page.getByRole('menuitem', { name: /Personal/ }).click()
  await expect(page.locator('.showcard-attr')).toHaveText('❄️ congelado')
})

test('Zu Hause keine Übersetzung, auch bei Mundart und Teilwörtern (D-081)', async ({ page, problems }) => {
  void problems
  await seed(page, [], 'CH-DE')
  await page.addInitScript(() => localStorage.setItem('rl:profile', JSON.stringify({ name: 'Tobias', lang: 'de', region: 'de-CH' })))
  await page.goto(`/#/l/${LIST}`)
  await add(page, 'Herdöpfel')
  await add(page, 'Verpackte Äpfel')
  await expect(page.locator('.item')).toHaveCount(2)
  await expect(page.locator('.item .local')).toHaveCount(0)
})

test.describe('Öffnungszeiten (D-099)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  async function open(page: Page, when: Date) {
    await page.clock.setFixedTime(when)
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) =>
      r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona', opening_hours: 'Mo-Sa 09:00-21:30; Su off' } }] })),
    )
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
  }

  test('offen: Zeiten in der Auswahl, Zeile knapp', async ({ page, problems }) => {
    void problems
    await open(page, new Date(2026, 10, 23, 10, 0)) // Montag
    await expect(page.locator('.shop-current')).toContainText('Mercadona')
    await expect(page.locator('.shop-hours')).toHaveCount(0) // offen: Zeile bleibt knapp (D-101)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-hours-long')).toHaveText('offen bis 21:30')
  })

  test('Sonntag: „geschlossen“, im Blatt mit nächster Öffnung', async ({ page, problems }) => {
    void problems
    await open(page, new Date(2026, 10, 22, 10, 0)) // Sonntag
    await expect(page.locator('.shop-current.closed')).toBeVisible() // dezent grau (D-101)
    await expect(page.locator('.shop-hours')).toHaveText('· geschlossen')
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-hours-long')).toHaveText(/geschlossen · öffnet Mo\.? 09:00/)
    await expect(page.locator('.sheet')).toContainText('laut OpenStreetMap')
  })
})

test.describe('Kleine Läden einer Kette (D-100)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.37, longitude: 8.54, accuracy: 20 } })
  test('Denner Express 400 m entfernt wird vorgeschlagen, Kiosk ohne Marke nicht', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    let query = ''
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'ch', state: 'Zürich' } })))
    await page.route(/interpreter/, (r) => {
      query = decodeURIComponent(r.request().postData() ?? '')
      return r.fulfill(
        json({
          elements: [
            { type: 'node', id: 1, lat: 47.3736, lon: 8.54, tags: { shop: 'convenience', name: 'Denner Express', brand: 'Denner' } },
            { type: 'node', id: 2, lat: 47.3725, lon: 8.54, tags: { shop: 'convenience', name: 'Kiosk am Eck' } },
          ],
        }),
      )
    })
    await seed(page, [item(1, 'Milch', 'milch')], 'CH-DE')
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shop-current')).toContainText('Denner Express')
    expect(query).toContain('["shop"="convenience"]["brand"]')
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-options')).not.toContainText('Kiosk am Eck')
  })
})

test.describe('Vorschlag: nächster geöffneter Laden (D-099)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('Sonntag: der offene Laden statt des näheren geschlossenen', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    await page.clock.setFixedTime(new Date(2026, 10, 22, 11, 0)) // Sonntag
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) =>
      r.fulfill(
        json({
          elements: [
            { type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona', opening_hours: 'Mo-Sa 09:00-21:30; Su off' } },
            { type: 'node', id: 2, lat: 41.395, lon: 2.17, tags: { shop: 'supermarket', name: 'Carrefour Express', opening_hours: 'Mo-Su 08:00-22:00', 'addr:street': 'Carrer de Balmes', 'addr:housenumber': '12' } },
          ],
        }),
      ),
    )
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shop-current')).toContainText('Carrefour Express')
    // Ladenauswahl: Strasse und Zeiten, Link zur Karte (D-101)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-options li', { hasText: 'Carrefour' })).toContainText('Carrer de Balmes 12 · offen bis 22:00')
    await expect(page.getByRole('link', { name: 'Carrefour Express in der Karten-App öffnen' })).toHaveAttribute('href', /openstreetmap\.org\/\?mlat=41\.395&mlon=2\.17/)
  })
})

test.describe('Karten-Link auf dem iPhone (D-101)', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    permissions: ['geolocation'],
    geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 },
  })
  test('öffnet Apple Karten direkt, nicht im Browser', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona' } }] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    const link = page.getByRole('link', { name: 'Mercadona in der Karten-App öffnen' })
    await expect(link).toHaveAttribute('href', 'maps://?ll=41.392,2.17&q=Mercadona')
    await expect(link).not.toHaveAttribute('target', '_blank')
  })
})

test.describe('Adresse nachschlagen (D-101)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.37, longitude: 8.54, accuracy: 20 } })
  test('Laden ohne Adresse: nächste Adresse im Umkreis', async ({ page, problems }) => {
    void problems
    const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'ch', state: 'Zürich' } })))
    await page.route(/interpreter/, (r) => {
      const q = decodeURIComponent(r.request().postData() ?? '')
      if (q.includes('addr:housenumber'))
        return r.fulfill(json({ elements: [{ type: 'way', id: 9, center: { lat: 47.37121, lon: 8.54 }, tags: { 'addr:street': 'Bahnhofstrasse', 'addr:housenumber': '12' } }] }))
      return r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 47.3712, lon: 8.54, tags: { shop: 'supermarket', name: 'Coop' } }] }))
    })
    await seed(page, [item(1, 'Milch', 'milch')], 'CH-DE')
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await page.goto(`/#/l/${LIST}`)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-options li', { hasText: 'Coop' })).toContainText('Bahnhofstrasse 12')
  })
})
