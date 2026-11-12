import { t } from '../i18n'
import { reducedMotion } from '../lib/motion'

/** Version der laufenden App (Build-Kennung, D-035) und ob Animationen aus sind (D-044) – hilft bei der Fehlersuche */
export function AppVersion() {
  const id = __BUILD_ID__.length > 12 ? __BUILD_ID__.slice(0, 16).replace('T', ' ') : __BUILD_ID__.slice(0, 7)
  return (
    <span className="app-version">
      {t('version')} {id}
      {reducedMotion() ? ` · ${t('motionOff')}` : ''}
    </span>
  )
}
