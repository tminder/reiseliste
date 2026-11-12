// Fehlerüberwachung (D-051): Fehler der App und des Syncs landen in der Supabase-Tabelle client_errors.
// Keine Listeninhalte: Kennungen und von der Datenbank zitierte Zeilen werden vorher entfernt.
import { ensureAuth, onSyncError, supabase } from './store'

const MAX_PER_SESSION = 20
const sent = new Set<string>()

/** Netzwerk-Aussetzer sind kein Fehler der App (offline, Funkloch) */
const NOISE = /failed to fetch|load failed|networkerror|network request failed|the internet connection appears to be offline|aborterror|fetch is aborted/i

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Entfernt alles, was Inhalte verraten könnte, und kürzt */
export function sanitize(s: string, max: number): string {
  return s
    .replace(/Failing row contains \(.*\)/gis, 'Failing row contains (…)')
    .replace(/Key \(.*?\)=\(.*?\)/gis, 'Key (…)=(…)')
    .replace(UUID, '<id>')
    .slice(0, max)
}

export function reportError(kind: 'js' | 'promise' | 'sync', message: string, stack?: string) {
  if (!supabase || !navigator.onLine || !message || NOISE.test(message)) return
  const msg = sanitize(message, 500)
  const key = `${kind}|${msg}`
  if (sent.has(key) || sent.size >= MAX_PER_SESSION) return
  sent.add(key)
  void (async () => {
    try {
      if (!(await ensureAuth())) return
      await supabase.from('client_errors').insert({
        build: __BUILD_ID__.slice(0, 40),
        kind,
        message: msg,
        stack: stack ? sanitize(stack, 2000) : null,
        path: sanitize(location.hash || '/', 100),
        agent: navigator.userAgent.slice(0, 200),
      })
    } catch {
      /* Fehlermeldung über Fehlermeldungen: nie */
    }
  })()
}

/** Einmal beim Start: globale Fehler und Sync-Fehler mitschneiden */
export function installErrorReporting() {
  window.addEventListener('error', (e) => reportError('js', e.message || String(e.error), e.error instanceof Error ? e.error.stack : undefined))
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    reportError('promise', r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined)
  })
  onSyncError((where, msg) => reportError('sync', `${where}: ${msg}`))
}
