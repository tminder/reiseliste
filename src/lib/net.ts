// Netzwerk-Hilfen

/** Zeitlimit für eine Anfrage (D-094). AbortSignal.timeout fehlt in älteren Browsern. */
export function timeout(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}
