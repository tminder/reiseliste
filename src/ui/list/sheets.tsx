// Untere Blätter der Liste: Mitglieder, Liste bearbeiten, Teilen
import { useEffect, useState } from 'react'
import { type Lang } from '../../data/dictionary'
import { COUNTRY_BY_CODE, LANG_LABEL } from '../../data/countries'
import { countryName, t } from '../../i18n'
import { CountryOptions } from '../CountryOptions'
import { LocationOff } from '../LocationOff'
import { listUrl } from '../../lib/links'
import { MAX } from '../../lib/limits'
import { ListStore, supabase, type Profile } from '../../lib/store'

export function MembersSheet({ store, profile, onClose }: { store: ListStore; profile: Profile; onClose: () => void }) {
  const [members, setMembers] = useState<{ name: string | null; lang: Lang | null; me: boolean }[] | null>(null)
  useEffect(() => {
    store.members().then(setMembers, () => setMembers([]))
  }, [store])
  const list = members?.length ? members : [{ name: profile.name, lang: profile.lang, me: true }]
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t('members')}</h2>
        {!members && <p className="muted">{t('loading')}</p>}
        {members && (
          <ul className="members">
            {list.map((m, i) => (
              <li key={i}>
                <span className="avatar">{(m.name ?? '?').slice(0, 1).toUpperCase()}</span>
                <span>
                  {m.name ?? t('unknown')}
                  {m.me && <span className="muted"> ({t('you')})</span>}
                </span>
                <span className="muted">{m.lang ? LANG_LABEL[m.lang] : ''}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small-text">{t('membersHint')}</p>
        <button className="ghost" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  )
}

export function EditSheet({
  name,
  country,
  autoClear,
  autoCountry,
  lang,
  onSave,
  onClose,
}: {
  name: string
  /** Sprache des Profils (für die vorgeschlagenen Länder) */
  lang: Lang
  country: string
  autoClear: boolean
  /** Reiseland automatisch nach Standort (D-057) */
  autoCountry: boolean
  onSave: (name: string, country: string, autoClear: boolean, autoCountry: boolean) => void
  onClose: () => void
}) {
  const [n, setN] = useState(name)
  const [c, setC] = useState(country)
  const [auto, setAuto] = useState(autoCountry)
  const [ac, setAc] = useState(autoClear)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(n.trim() || name, c, ac, auto)
        }}
      >
        <h2>{t('editListTitle')}</h2>
        <label>
          {t('name')}
          <input value={n} onChange={(e) => setN(e.target.value)} maxLength={MAX.listName} />
        </label>
        <label>
          {t('travelCountry')}
          <select
            value={auto ? 'auto' : c}
            onChange={(e) => {
              if (e.target.value === 'auto') return setAuto(true)
              setAuto(false)
              setC(e.target.value)
            }}
          >
            <option value="auto">{t('autoCountry', { country: `${COUNTRY_BY_CODE.get(c)?.flag ?? ''} ${countryName(c)}` })}</option>
            <CountryOptions lang={lang} />
          </select>
        </label>
        <p className="muted small-text">{auto ? t('autoCountryHint') : t('countryChangeHint')}</p>
        {auto && <LocationOff />}
        <label className="check-row">
          <input type="checkbox" checked={ac} onChange={(e) => setAc(e.target.checked)} />
          <span>
            {t('autoClear')}
            <span className="muted small-text block">{t('autoClearHint')}</span>
          </span>
        </label>
        <div className="row">
          <button className="primary">{t('save')}</button>
          <button type="button" className="ghost" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

export function ShareSheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const url = listUrl(id)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    // QR-Code-Bibliothek erst beim Teilen laden (kleineres Start-Bundle, S-021)
    void import('qrcode').then((m) => m.default.toDataURL(url, { margin: 1, width: 560 })).then(setQr, () => setQr(''))
  }, [url])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t('shareList')}</h2>
        {!supabase && <p className="note">{t('demoShare')}</p>}
        {qr && <img src={qr} alt={t('qrAlt')} className="qr" />}
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
        <p className="muted small-text">{t('shareIosHint')}</p>
        <div className="row">
          <button
            className="primary"
            onClick={async () => {
              try {
                if (navigator.share) await navigator.share({ title: name, url })
                else {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                }
              } catch {
                /* abgebrochen */
              }
            }}
          >
            {copied ? t('copied') : t('shareLink')}
          </button>
          <button className="ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
