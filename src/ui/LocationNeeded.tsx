// Reiseland „Automatisch“ braucht den Standort (D-066, D-067).
// LocationNeeded: Hinweis unter der Auswahl, wenn nicht – mit „Standort freigeben“, sofern das noch geht.
import { t } from '../i18n'
import type { LocationState } from './useLocation'

/** Hinweis unter der Reiseland-Auswahl, solange „Automatisch“ mangels Standort nicht wählbar ist */
export function LocationNeeded({ loc, onAllowed, hidden }: { loc: LocationState; onAllowed?: () => void; hidden?: boolean }) {
  if (loc.available || hidden) return null
  return (
    <p className="muted small-text">
      {loc.denied ? (
        t('autoNeedsLocationBlocked')
      ) : (
        <>
          {t('autoNeedsLocation')}{' '}
          <button type="button" className="link" onClick={() => void loc.allow().then((ok) => ok && onAllowed?.())}>
            {t('allowLocation')}
          </button>
        </>
      )}
    </p>
  )
}
