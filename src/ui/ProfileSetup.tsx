// Profil anlegen oder ändern: Name und Sprache (D-041), auf neuem Gerät bestehendes Mitglied wählen (D-029)
import { useEffect, useState } from 'react'
import { LANG_LABEL, PROFILE_LANGS } from '../data/countries'
import { setUiLang, t } from '../i18n'
import { MAX } from '../lib/limits'
import { memberProfiles, profileStore, type Profile } from '../lib/store'
import { AppVersion } from './AppVersion'
import { guessProfileLang } from './format'
import { AppLogo } from './AppLogo'


export function ProfileSetup({ onDone, onCancel, listId }: { onDone: (p: Profile) => void; onCancel?: () => void; listId?: string }) {
  const existing = profileStore.get()
  const hasProfile = !!existing
  // Neues Gerät, Link auf eine Liste: bestehende Mitglieder zur Auswahl anbieten (D-029)
  const [known, setKnown] = useState<Profile[]>([])
  useEffect(() => {
    if (!listId || hasProfile) return
    let alive = true
    void memberProfiles(listId).then((m) => alive && setKnown(m))
    return () => {
      alive = false
    }
  }, [listId, hasProfile])
  const [name, setName] = useState(existing?.name ?? '')
  // Sprache samt Länder-Abweichung, z. B. „de-CH“ (D-056)
  const [choice, setChoiceState] = useState<string>(existing ? (existing.region ?? existing.lang) : guessProfileLang())
  const option = PROFILE_LANGS.find((o) => o.value === choice) ?? PROFILE_LANGS[0]
  const [, rerender] = useState(0)
  const setChoice = (v: string) => {
    setUiLang(PROFILE_LANGS.find((o) => o.value === v)?.lang ?? 'de') // Oberfläche wechselt sofort mit
    setChoiceState(v)
    rerender((n) => n + 1)
  }
  return (
    <main className="page narrow">
      <h1 className="brand">
        <AppLogo /> <span className="brand-name">{t('appName')}</span>
      </h1>
      {hasProfile ? (
        <p className="lead">{t('tagline')}</p>
      ) : (
        // Erster Start (D-068): zuerst die gemeinsame Einkaufsliste, dann die Übersetzung
        <>
          <h2 className="onboard-title">
            {listId ? (known[0] ? t('invitedBy', { name: known[0].name }) : t('invitedTitle')) : t('onboardTitle')}
          </h2>
          <p className="lead">{t('onboardText')}</p>
        </>
      )}
      {known.length > 0 && (
        <div className="card stack">
          <p>{t('knownMember')}</p>
          <div className="chips">
            {known.map((m) => (
              <button key={`${m.name}|${m.lang}`} className="chip" onClick={() => onDone({ name: m.name, lang: m.lang })}>
                {m.name} <span className="muted">· {LANG_LABEL[m.lang]}</span>
              </button>
            ))}
          </div>
          <p className="muted">{t('orNewProfile')}</p>
        </div>
      )}
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onDone({ name: name.trim(), lang: option.lang, ...(option.region ? { region: option.region } : {}) })
        }}
      >
        <label>
          {t('yourName')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} maxLength={MAX.personName} autoFocus />
        </label>
        <label>
          {t('whichLanguage')}
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {PROFILE_LANGS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={!name.trim()}>
          {onCancel ? t('save') : t('letsGo')}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
        )}
      </form>
      <footer className="footer">
        <a href="#/datenschutz">{t('privacy')}</a>
        <AppVersion />
      </footer>
    </main>
  )
}
