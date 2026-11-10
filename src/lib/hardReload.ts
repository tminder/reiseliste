/**
 * „Neu laden“ (nur MVP, FEATURES.reloadLink, D-034): Service Worker abmelden und den App-Cache leeren,
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
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    /* egal */
  }
  // Zeitstempel erzwingt eine frische index.html, auch an Zwischenspeichern vorbei
  const url = new URL(location.href)
  url.searchParams.set('r', String(Date.now()))
  location.replace(url.toString())
}
