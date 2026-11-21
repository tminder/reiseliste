// Untere Blätter der Liste: Mitglieder, Liste bearbeiten, Teilen
import { useEffect, useState } from 'react'
import { Copy, UserMinus } from 'lucide-react'
import { type Lang } from '../../data/dictionary'
import { COUNTRY_BY_CODE, LANG_LABEL } from '../../data/countries'
import { countryLabel, t } from '../../i18n'
import { CountryOptions } from '../CountryOptions'
import { LocationSheet } from '../LocationSheet'
import { useLocation } from '../useLocation'
import { listUrl } from '../../lib/links'
import { MAX } from '../../lib/limits'
import { ListStore, supabase, type Profile } from '../../lib/store'

export function MembersSheet({ store, profile, onClose }: { store: ListStore; profile: Profile; onClose: () => void }) {
  type Member = { name: string | null; lang: Lang | null; me: boolean }
  const [members, setMembers] = useState<Member[] | null>(null)
  // Mitglied entfernen (D-084): erst nachfragen, dann entfernen
  const [asking, setAsking] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    store.members().then(setMembers, () => setMembers([]))
  }, [store])
  const list = members?.length ? members : [{ name: profile.name, lang: profile.lang, me: true }]
  const same = (a: Member, b: Member) => a.name === b.name && a.lang === b.lang
  async function remove(m: Member) {
    setBusy(true)
    setFailed(false)
    try {
      await store.removeMember(m.name, m.lang)
      setMembers((all) => (all ?? []).filter((x) => !same(x, m)))
      setAsking(null)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
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
                  <span className="muted member-lang">{m.lang ? LANG_LABEL[m.lang] : ''}</span>
                </span>
                {!m.me && supabase ? (
                  <button className="ghost small" aria-label={t('removeMemberLabel', { name: m.name ?? t('unknown') })} onClick={() => setAsking(m)}>
                    <UserMinus size={17} />
                  </button>
                ) : (
                  <span />
                )}
                {asking && same(asking, m) && (
                  <div className="member-confirm">
                    <p>{t('removeMemberAsk', { name: m.name ?? t('unknown') })}</p>
                    {failed && <p className="error-text small-text">{t('removeMemberFailed')}</p>}
                    <div className="row-gap">
                      <button className="danger-btn" disabled={busy} onClick={() => void remove(m)}>
                        {t('removeMember')}
                      </button>
                      <button className="ghost small" onClick={() => setAsking(null)}>
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
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
  // Wechsel auf „Automatisch“ ohne Standort: erst fragen (D-066, D-067)
  const loc = useLocation()
  const [askLocation, setAskLocation] = useState(false)
  const [ac, setAc] = useState(autoClear)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (auto && !autoCountry && !loc.available) return setAskLocation(true)
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
            <option value="auto">{t('autoCountry', { country: `${COUNTRY_BY_CODE.get(c)?.flag ?? ''} ${countryLabel(c, COUNTRY_BY_CODE.get(c)?.lang ?? 'en')}` })}</option>
            <CountryOptions lang={lang} />
          </select>
        </label>
        <p className="muted small-text">{auto ? t('autoCountryHint') : t('countryChangeHint')}</p>
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
      {askLocation && (
        <LocationSheet
          loc={loc}
          lang={lang}
          country={c}
          submitLabel={t('save')}
          onDone={(country, a) => onSave(n.trim() || name, country, ac, a)}
          onClose={() => setAskLocation(false)}
        />
      )}
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
        {/* Link mit Knopf „Kopieren“ in einer Zeile (D-089), z. B. für E-Mail oder Desktop */}
        <div className="copy-row">
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
          <button
            className="ghost"
            aria-label={t('copyLink')}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              } catch {
                /* Zwischenablage nicht erlaubt: Link steht im Feld zum Markieren */
              }
            }}
          >
            {!copied && <Copy size={16} />} {copied ? t('copied') : t('copy')}
          </button>
        </div>
        <p className="muted small-text">{t('shareIosHint')}</p>
        <div className="row">
          <button
            className="primary"
            onClick={async () => {
              try {
                // Listenname im geteilten Text (D-076): Link-Vorschauen zeigen sonst nur den App-Namen
                if (navigator.share) await navigator.share({ title: name, text: t('shareText', { name }), url })
                else {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2000)
                }
              } catch {
                /* abgebrochen */
              }
            }}
          >
            {t('shareLink')}
          </button>
          <button className="ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
