// Bildschirmfotos für die Landingpages neu erzeugen (R-001): npm run landing:shots
// Nutzt denselben Build ohne Supabase wie die Oberflächentests.
import { defineConfig } from '@playwright/test'
import base from '../playwright.config'

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'landing-shots.ts',
  retries: 0,
  reporter: 'list',
  // Befehl im Projektordner ausführen, nicht in scripts/
  webServer: { ...(base.webServer as object), cwd: '..' } as typeof base.webServer,
})
