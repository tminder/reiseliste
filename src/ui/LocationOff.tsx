// Hinweis unter „Reiseland: Automatisch“, wenn der Standort mit „Nicht jetzt“ abgelehnt wurde (D-066):
// erklärt die Folge und lässt den Standort nachträglich freigeben.
import { useState } from 'react'
import { t } from '../i18n'
import { getPosition, locationConsent, setLocationConsent } from '../lib/nearby'

export function LocationOff({ onAllowed }: { onAllowed?: () => void }) {
  const [off, setOff] = useState(() => locationConsent() === 'no')
  if (!off) return null
  return (
    <p className="muted small-text">
      {t('autoNoLocation')}{' '}
      <button
        type="button"
        className="link"
        onClick={() => {
          setLocationConsent('yes')
          setOff(false)
          if (onAllowed) onAllowed()
          else void getPosition().catch(() => undefined) // löst die Rückfrage des Browsers gleich aus
        }}
      >
        {t('allowLocation')}
      </button>
    </p>
  )
}
