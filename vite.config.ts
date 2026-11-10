import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Kennung dieses Builds (D-035): steckt im Code und in version.json. Weichen beide ab, lädt die App neu.
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || new Date().toISOString()

const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
  },
})

// BASE_PATH wird im GitHub-Pages-Workflow auf /<repo-name>/ gesetzt
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    versionFile(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Registrierung in src/main.tsx (mit Update-Prüfung)
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      workbox: {
        // Einmal angesehene Produktfotos bleiben offline verfügbar
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'off-images',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Proviant – Einkaufsliste für Reisen',
        short_name: 'Proviant',
        description: 'Geteilte Einkaufsliste, die jeden Artikel in der Landessprache zeigt.',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
