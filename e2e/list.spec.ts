// Liste, Artikel, Teilen, Zeigen-Karte, Fotos, Umrechnen (S-002)
import { test, LIST, add, expect, item, json, rows, seed } from './helpers'

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
  // Beispiele zeigen auch Merkmale (D-098)
  await expect(page.locator('.again .chip')).toContainText(['2 Milch', 'Brot', '500 g Hackfleisch', 'Himbeeren (tiefgekühlt)', '6 Eier (Bio)'])
  await page.locator('.again .chip', { hasText: 'Himbeeren' }).click()
  await expect(page.locator('.item', { hasText: 'Himbeeren' })).toContainText('frambuesas❄️ congelado')
})

test('Übersicht zeigt die anderen Teilnehmer, jüngste Aktivität zuerst', async ({ page, problems }) => {
  void problems
  const by = (n: number, author: string, at: string) => ({ ...item(n, 'Milch', 'milch'), author, createdAt: at, updatedAt: at })
  await seed(page, [by(1, 'Anna', '2026-11-01T08:00:00Z'), by(2, 'Tobias', '2026-11-03T08:00:00Z'), by(3, 'Bea', '2026-11-02T08:00:00Z')])
  await page.goto('/')
  await expect(page.locator('.list-people')).toHaveText('Bea, Anna')
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
  await expect(page.locator('.item.checked')).toHaveCount(1)
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
  await page.locator('.item.checked .txt').click() // nochmals: wieder offen
  await expect(page.locator('.item.checked')).toHaveCount(0)
  await page.locator('.item').first().getByRole('button', { name: 'Mehr' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
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
  await expect(page.locator('.undo-bar')).toHaveCount(0, { timeout: 15_000 }) // Frist abgelaufen
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rl:pendingDelete'))).toBe('[]')
  await expect(page.locator('.list-card')).toHaveCount(0)
})

test('Datenschutzseite lädt nach', async ({ page, problems }) => {
  void problems
  await page.goto('/#/datenschutz')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('body')).toContainText('Fehlermeldungen')
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

test.describe('Fotos mit Laden (D-094)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('Open Food Facts nicht erreichbar: Countdown und automatischer neuer Versuch', async ({ page, problems }) => {
  void problems
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
      body: JSON.stringify({
        products: [
          { code: '2', product_name: 'Leche Pascual', brands: 'Pascual', image_front_small_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', stores_tags: ['carrefour'] },
          { code: '1', product_name: 'Leche entera', brands: 'Hacendado', image_front_small_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', stores_tags: ['mercadona'] },
        ],
      }),
    })
  })
  await seed(page, [item(1, 'Milch', 'milch')])
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.item', { hasText: 'Milch' }).getByRole('button', { name: 'Produktfotos' }).click()
  await expect(page.locator('.photos-note')).toHaveText(/^Fotos gerade nicht verfügbar\. Neuer Versuch in (1 Min\.|59 s)$/) // frühestens nach 60 s, ohne „jetzt“
  await page.clock.fastForward(5_000)
  await expect(page.locator('.photos-note')).toContainText(/Neuer Versuch in (54|55) s/)
  await page.clock.fastForward(56_000)
  await expect(page.locator('.photos')).toContainText('Leche entera')
  // Eine Anfrage pro Artikel: Produkte der Kette werden aus dem Landesergebnis vorgezogen (D-094)
  await expect(page.locator('.photos')).not.toContainText('Pascual')
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
  // Eigener Begriff aufgeräumt mit Marke, darunter die Landessprache (D-098)
  await expect(page.locator('.item', { hasText: 'Himbeeren' }).locator('.main')).toHaveText('Himbeeren❄️')
  await expect(page.locator('.item', { hasText: 'Himbeeren' }).locator('.local .attr')).toHaveText('❄️ congelado')
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
  // Merkmal als Marke auch zu Hause, Vorschlag mit Merkmal (D-098)
  await page.locator('.add input').fill('himbeeren tief')
  await expect(page.locator('.suggestions')).toContainText('Himbeeren (tiefgekühlt)')
  await page.locator('.add input').fill('himbeeren tiefgekühlt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.item', { hasText: 'Himbeeren' }).locator('.main')).toHaveText('Himbeeren❄️')
})

test('Angefangene Eingabe übersteht ein Neuladen (D-016)', async ({ page, problems }) => {
  void problems
  await seed(page)
  await page.goto(`/#/l/${LIST}`)
  await page.locator('.add input').fill('Oliven')
  await page.reload()
  await expect(page.locator('.add input')).toHaveValue('Oliven')
  await add(page, 'Oliven')
  await page.reload()
  await expect(page.locator('.add input')).toHaveValue('')
})
