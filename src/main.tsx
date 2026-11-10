import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { reloadIfOutdated } from './lib/hardReload'

// Nach „Neu laden“ (D-034) den Zeitstempel wieder aus der Adresse entfernen
if (new URLSearchParams(location.search).has('r')) {
  const url = new URL(location.href)
  url.searchParams.delete('r')
  history.replaceState(null, '', url.toString())
}

// Neue App-Versionen automatisch laden: Bei autoUpdate lädt die Seite neu, sobald eine neue Version bereitsteht.
// Geprüft wird beim Start, jede Stunde und immer wenn die App wieder in den Vordergrund kommt.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => {})
    }
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

// Zusätzlich (D-035): beim Start und beim Zurückkehren in die App prüfen, ob ein neuerer Build online ist –
// falls ja, hart neu laden (auch wenn der Service Worker hängt). Höchstens jede Minute.
let lastVersionCheck = 0
const versionCheck = () => {
  if (Date.now() - lastVersionCheck < 60_000) return
  lastVersionCheck = Date.now()
  void reloadIfOutdated()
}
versionCheck()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') versionCheck()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
