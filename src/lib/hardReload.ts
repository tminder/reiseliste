/**
 * Hart neu laden (D-035): Service Worker abmelden und den App-Cache leeren,
 * damit HTML, CSS und Skripte frisch vom Server kommen. Listen, Profil und Warteschlange (localStorage) bleiben.
 */
export async function hardReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* egal */
  }
  try {
    const keys = (await caches?.keys()) ?? []
    // Offline-Produktfotos behalten, nur den App-Code verwerfen
    await Promise.all(keys.filter((k) => k !== 'off-images').map((k) => caches.delete(k)))
  } catch {
    /* egal */
  }
  // Zeitstempel erzwingt eine frische index.html, auch an Zwischenspeichern vorbei
  const url = new URL(location.href)
  url.searchParams.set('r', String(Date.now()))
  location.replace(url.toString())
}

const TRIED_KEY = 'rl:reloadFor'

/**
 * Neue Version auf allen Geräten erzwingen (D-035): version.json am Service Worker vorbei laden.
 * Ist dort ein anderer Build als der laufende, hart neu laden. Schutz vor Schleifen: pro Build höchstens
 * ein Versuch alle 10 Minuten.
 */
export async function reloadIfOutdated() {
  if (!navigator.onLine || import.meta.env.DEV) return
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { id } = (await res.json()) as { id?: string }
    if (!id || id === __BUILD_ID__) return
    const tried = JSON.parse(localStorage.getItem(TRIED_KEY) ?? 'null') as { id: string; at: number } | null
    if (tried?.id === id && Date.now() - tried.at < 10 * 60 * 1000) return
    localStorage.setItem(TRIED_KEY, JSON.stringify({ id, at: Date.now() }))
    await hardReload()
  } catch {
    /* offline o. ä. – beim nächsten Mal */
  }
}
