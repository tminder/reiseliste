// Profil anlegen oder ändern: Name und Sprache (D-041), auf neuem Gerät bestehendes Mitglied wählen (D-029)
import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { LANGS, type Lang } from '../data/dictionary'
import { LANG_LABEL } from '../data/countries'
import { setUiLang, t } from '../i18n'
import { MAX } from '../lib/limits'
import { memberProfiles, profileStore, type Profile } from '../lib/store'
import { AppVersion } from './AppVersion'
import { guessLang } from './format'


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
  const [lang, setLangState] = useState<Lang>(existing?.lang ?? guessLang())
  const [, rerender] = useState(0)
  const setLang = (l: Lang) => {
    setUiLang(l) // Oberfläche wechselt sofort mit
    setLangState(l)
    rerender((n) => n + 1)
  }
  return (
    <main className="page narrow">
      <h1 className="brand">
        <ShoppingCart size={26} strokeWidth={2.2} /> {t('appName')}
      </h1>
      <p className="lead">{t('tagline')}</p>
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
          if (name.trim()) onDone({ name: name.trim(), lang })
        }}
      >
        <label>
          {t('yourName')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} maxLength={MAX.personName} autoFocus />
        </label>
        <label>
          {t('whichLanguage')}
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABEL[l]}
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
