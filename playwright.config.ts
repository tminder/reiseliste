// Oberflächen-Tests (S-002): spielen die wichtigsten Abläufe im Browser durch.
// Laufen gegen einen eigenen Build ohne Supabase („nur auf diesem Gerät“), alle fremden Server sind gesperrt.
// Lokal: npm run e2e   (CHROME_PATH=/pfad/zu/chrome, falls kein Playwright-Chromium installiert ist)
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4180',
    locale: 'de-DE',
    viewport: { width: 390, height: 760 },
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: 'npm run build:e2e && npx vite preview --outDir dist-e2e --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
