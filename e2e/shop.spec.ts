// Ladensuche, Öffnungszeiten, Karten-Links (S-002)
import { type Page } from '@playwright/test'
import { test, LIST, expect, item, json, seed } from './helpers'

test.describe('Im Laden, GPS im Gebäude ungenau (D-078)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 80 } })

  test('„Im <Laden>“ erst nach dem ersten Abhaken', async ({ page, problems }) => {
    void problems
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

test.describe('Ladensuche: Fehler nur im Auswahlblatt (D-086)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })

  test('Zeile zeigt „Suche Laden …“, Blatt zeigt Fehler und Countdown', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ address: { country_code: 'es' } }) }))
    let failed = 0
    await page.route(/interpreter/, (r) => (failed++, r.abort()))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shopline')).toContainText('Suche Laden')
    await expect.poll(() => failed).toBe(2) // beide Server gescheitert
    await expect(page.locator('.shopline')).not.toContainText('OpenStreetMap')
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.sheet')).toContainText('OpenStreetMap ist nicht erreichbar')
    await expect(page.locator('.sheet')).toContainText(/Neuer Versuch|\d+ s/)
  })

  test('Läuft der neue Versuch, verschwinden Fehler und Countdown', async ({ page, problems }) => {
    void problems
    await page.clock.install()
    await page.route(/nominatim/, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ address: { country_code: 'es' } }) }))
    let fail = true
    await page.route(/interpreter/, (r) => (fail ? r.abort() : undefined)) // danach hängt die Anfrage
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.sheet')).toContainText('Neuer Versuch in')
    fail = false
    await page.clock.runFor(35_000)
    await expect(page.locator('.sheet')).toContainText('Suche')
    await expect(page.locator('.sheet')).not.toContainText('Neuer Versuch')
    await expect(page.locator('.sheet')).not.toContainText('nicht erreichbar')
  })
})

test.describe('Weitsuche nur ohne Laden in der Nähe (D-100)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('bis 1 km nichts: zweite Anfrage bis 20 km, ohne Namenssuche', async ({ page, problems }) => {
    void problems
    const queries: string[] = []
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => {
      const q = decodeURIComponent(r.request().postData() ?? '')
      queries.push(q)
      return r.fulfill(json({ elements: q.includes('around:20000') ? [{ type: 'node', id: 9, lat: 41.44, lon: 2.17, tags: { shop: 'supermarket', name: 'Bonpreu' } }] : [] }))
    })
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shop-current')).toContainText('Bonpreu')
    expect(queries).toHaveLength(2)
    expect(queries[1]).not.toContain('"name"~')
  })
})

test.describe('Overpass mit Zeitüberschreitung (D-100)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('Antwort mit „runtime error“ gilt als Fehler, der zweite Server wird gefragt', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/overpass-api\.de/, (r) => r.fulfill(json({ elements: [], remark: 'runtime error: Query timed out in "query" at line 3 after 26 seconds.' })))
    await page.route(/private\.coffee/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona' } }] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shop-current')).toContainText('Mercadona')
  })
})

test.describe('Öffnungszeiten (D-099)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
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
    let query = ''
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'ch', state: 'Zürich' } })))
    await page.route(/interpreter/, (r) => {
      query = decodeURIComponent(r.request().postData() ?? '')
      return r.fulfill(
        json({
          elements: [
            { type: 'node', id: 1, lat: 47.3736, lon: 8.54, tags: { shop: 'convenience', name: 'Denner Express' } }, // ohne Marke, nur Name (wie Landenbergstrasse)
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
    expect(query).toContain('["shop"="convenience"]["name"~"^(Denner|')
    // Kleine erste Anfrage (D-100): kurze Zeit- und Speichergrenze, keine Weitsuche, weil bis 1 km ein Laden liegt
    expect(query).toMatch(/\[timeout:10\]\[maxsize:\d+\]/)
    expect(query).not.toContain('around:20000')
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-options')).not.toContainText('Kiosk am Eck')
  })
})

test.describe('Vorschlag: nächster geöffneter Laden (D-099)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('Sonntag: der offene Laden statt des näheren geschlossenen', async ({ page, problems }) => {
    void problems
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
    await expect(page.locator('.shop-current')).toContainText('Carrefour Express Carrer de Balmes') // Strasse dazu (D-103)
    // Ladenauswahl: Strasse und Zeiten, Link zur Karte (D-101)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-options li', { hasText: 'Carrefour' })).toContainText('Carrer de Balmes 12offen bis 22:00') // eigene Zeilen
    await expect(page.locator('.shop-options li', { hasText: 'Carrefour' })).toContainText(/\d+ m/) // Distanz auch beim gewählten Laden
    await expect(page.locator('.shop-options li', { hasText: 'Carrefour' }).locator('.shop-check')).toBeVisible()
    // Geschlossen: grau (D-101)
    await expect(page.locator('.shop-options li', { hasText: 'Mercadona' }).locator('button').first()).toHaveClass(/closed/)
    await expect(page.locator('.shop-options li', { hasText: 'Mercadona' })).toContainText(/\d+ m/) // Distanz bleibt in der Auswahl
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
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona' } }] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    const link = page.getByRole('link', { name: 'Mercadona in der Karten-App öffnen' })
    await page.evaluate(() => localStorage.setItem('rl:mapApp', 'apple'))
    await page.reload()
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(link).toHaveAttribute('href', 'maps://?ll=41.392,2.17&q=Mercadona')
    await expect(link).not.toHaveAttribute('target', '_blank')
  })
})

test.describe('Adresse nachschlagen (D-101)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.37, longitude: 8.54, accuracy: 20 } })
  test('Laden ohne Adresse: nächste Adresse im Umkreis', async ({ page, problems }) => {
    void problems
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

test.describe('Karten-App auf dem iPhone wählen (D-101)', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    permissions: ['geolocation'],
    geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 },
  })
  test('erst fragen, dann Google Maps direkt', async ({ page, problems }) => {
    void problems
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona' } }] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await page.getByRole('link', { name: 'Mercadona in der Karten-App öffnen' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mit welcher Karten-App öffnen?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Google Maps' })).toHaveAttribute('href', /^comgooglemaps:\/\/\?q=41\.392,2\.17/)
    await expect(dialog.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute('href', /openstreetmap\.org\/\?mlat=41\.392/)
    // Wahl speichern, ohne wirklich zu navigieren
    await page.evaluate(() => localStorage.setItem('rl:mapApp', 'google'))
    await page.reload()
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.getByRole('link', { name: 'Mercadona in der Karten-App öffnen' })).toHaveAttribute('href', /^comgooglemaps:/)
    await expect(page.locator('.sheet')).toContainText('Karten-App: Google Maps.')
    // Ändern: Auswahl erscheint direkt, Wahl wird übernommen
    await page.locator('.sheet').getByRole('button', { name: 'Ändern' }).click()
    const pick = page.getByRole('dialog', { name: 'Karten-App wählen' })
    await pick.getByRole('button', { name: 'OpenStreetMap' }).click()
    await expect(pick).toHaveCount(0)
    await expect(page.locator('.sheet')).toContainText('Karten-App: OpenStreetMap.')
    await expect(page.getByRole('link', { name: 'Mercadona in der Karten-App öffnen' })).toHaveAttribute('href', /openstreetmap\.org/)
  })
})

test.describe('Schliesst bald (D-099)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('weniger als eine Stunde vor Ladenschluss: „schliesst 21:30“', async ({ page, problems }) => {
    void problems
    await page.clock.setFixedTime(new Date(2026, 10, 23, 20, 45)) // Montag
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) => r.fulfill(json({ elements: [{ type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona', opening_hours: 'Mo-Sa 09:00-21:30' } }] })))
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shop-hours')).toHaveText('· schliesst 21:30')
  })
})

test.describe('Läden ohne Öffnungszeiten (D-099)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 41.39, longitude: 2.17, accuracy: 20 } })
  test('nicht vorgezogen, in der Auswahl „Öffnungszeiten unbekannt“', async ({ page, problems }) => {
    void problems
    await page.clock.setFixedTime(new Date(2026, 10, 22, 11, 0)) // Sonntag
    await page.route(/nominatim/, (r) => r.fulfill(json({ address: { country_code: 'es' } })))
    await page.route(/interpreter/, (r) =>
      r.fulfill(
        json({
          elements: [
            { type: 'node', id: 1, lat: 41.392, lon: 2.17, tags: { shop: 'supermarket', name: 'Mercadona', opening_hours: 'Mo-Sa 09:00-21:30; Su off' } },
            { type: 'node', id: 2, lat: 41.394, lon: 2.17, tags: { shop: 'supermarket', name: 'Dia' } },
            { type: 'node', id: 3, lat: 41.396, lon: 2.17, tags: { shop: 'supermarket', name: 'Carrefour Express', opening_hours: 'Mo-Su 08:00-22:00' } },
          ],
        }),
      ),
    )
    await page.addInitScript(() => localStorage.setItem('rl:locConsent', 'yes'))
    await seed(page, [item(1, 'Milch', 'milch')])
    await page.goto(`/#/l/${LIST}`)
    await expect(page.locator('.shop-current')).toContainText('Carrefour Express') // sicher offen, vor dem näheren Dia ohne Zeiten
    await page.getByRole('button', { name: 'Laden ändern' }).click()
    await expect(page.locator('.shop-options li', { hasText: 'Dia' })).toContainText('Öffnungszeiten unbekannt')
    await expect(page.locator('.shop-options li', { hasText: 'Dia' }).locator('button').first()).toHaveClass(/closed/) // grau wie geschlossen
    await expect(page.locator('.shop-options li', { hasText: 'Dia' })).toContainText(/\d+ m/) // Distanz bleibt
  })
})
