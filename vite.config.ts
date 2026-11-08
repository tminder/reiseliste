import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH wird im GitHub-Pages-Workflow auf /<repo-name>/ gesetzt
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Registrierung in src/main.tsx (mit Update-Prüfung)
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Reiseliste – Einkaufsliste in der Landessprache',
        short_name: 'Reiseliste',
        description: 'Geteilte Einkaufsliste, die jeden Artikel in der Landessprache zeigt.',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
