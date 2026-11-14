// Reiseland „Automatisch“ braucht den Standort (D-066, D-067). Fehlt er beim Erstellen bzw. Speichern,
// erklärt dieses Blatt den Nutzen und bietet zwei Wege: „Standort freigeben“ oder „Land selbst wählen“.
// Beide führen zum Ziel: mit Standort auf „Automatisch“, sonst mit festem Land.
import { useState } from 'react'
import type { Lang } from '../data/dictionary'
import { COUNTRY_BY_CODE } from '../data/countries'
import { t } from '../i18n'
import { detectCountry } from '../lib/country'
import { CountryOptions } from './CountryOptions'
import type { LocationState } from './useLocation'

export function LocationSheet({
  loc,
  lang,
  country,
  submitLabel,
  onDone,
  onClose,
}: {
  loc: LocationState
  /** Profilsprache: Länder dieser Sprache werden nicht vorgeschlagen */
  lang: Lang
  /** vorausgewähltes Land */
  country: string
  /** Text des Knopfs nach der Landwahl, z. B. „Liste erstellen“ */
  submitLabel: string
  onDone: (country: string, auto: boolean) => void
  onClose: () => void
}) {
  // Im Browser gesperrt: gleich die Landwahl, die App kann nicht mehr fragen
  const [mode, setMode] = useState<'ask' | 'busy' | 'choose'>(loc.denied ? 'choose' : 'ask')
  const [c, setC] = useState(country)
  const [blocked, setBlocked] = useState(loc.denied)

  async function allow() {
    setMode('busy')
    const r = await loc.allow()
    if (r === 'denied') {
      setBlocked(true)
      setMode('choose')
      return
    }
    // Erlaubt: aktuelles Land übernehmen, wenn es unterstützt wird und nicht die eigene Sprache hat; sonst die Vorauswahl
    const here = r === 'granted' ? await detectCountry() : undefined
    const code = here && COUNTRY_BY_CODE.get(here)?.lang !== lang ? here : country
    onDone(code, true)
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        e.stopPropagation() // liegt über „Liste bearbeiten“: nur dieses Blatt schliessen
        onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'choose' ? t('chooseCountryTitle') : t('locSheetTitle')}</h2>
        {mode !== 'choose' ? (
          <>
            <p>{t('locSheetText')}</p>
            <p className="muted small-text">
              {t('locSheetPrivacy')} <a href="#/datenschutz">{t('privacy')}</a>
            </p>
            <div className="row">
              <button className="primary" disabled={mode === 'busy'} onClick={() => void allow()}>
                {mode === 'busy' ? '…' : t('allowLocation')}
              </button>
              <button className="ghost" disabled={mode === 'busy'} onClick={() => setMode('choose')}>
                {t('chooseCountry')}
              </button>
            </div>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              onDone(c, false)
            }}
          >
            <p className="muted small-text">{blocked ? t('locSheetBlocked') : t('locSheetFixed')}</p>
            <label>
              {t('travelCountry')}
              <select value={c} onChange={(e) => setC(e.target.value)}>
                <CountryOptions lang={lang} />
              </select>
            </label>
            <div className="row">
              <button className="primary">{submitLabel}</button>
              <button type="button" className="ghost" onClick={onClose}>
                {t('cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
