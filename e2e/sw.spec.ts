// Service Worker (D-090): Feste Dateien und Seiten kommen vom Server, nicht die App.
// Ohne abgefangene Anfragen, damit der Service Worker die Seite übernimmt.
import { expect, test } from '@playwright/test'

test('nach dem Neuladen: sitemap.xml, robots.txt und Landingpage statt App', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  for (const [path, text] of [
    ['/sitemap.xml', '<urlset'],
    ['/robots.txt', 'Sitemap:'],
  ] as const) {
    const res = await page.goto(path)
    expect(await res!.text(), path).toContain(text)
  }
  await page.goto('/de/')
  await expect(page.locator('body')).not.toContainText('Was brauchst du?')
  await expect(page.locator('h1')).toBeVisible()
  await page.goto('/datenschutz/')
  await expect(page.locator('h1')).toContainText('Datenschutz')
})
