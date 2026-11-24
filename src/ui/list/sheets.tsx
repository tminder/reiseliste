// Untere Blätter der Liste: Mitglieder, Liste bearbeiten, Teilen
import { useEffect, useState } from 'react'
import { ArrowUpDown, Copy, UserMinus } from 'lucide-react'
import { type Lang } from '../../data/dictionary'
import { COUNTRY_BY_CODE, LANG_LABEL } from '../../data/countries'
import { countryLabel, t, uiLang } from '../../i18n'
import { CountryOptions } from '../CountryOptions'
import { LocationSheet } from '../LocationSheet'
import { cachedCountry } from '../../lib/country'
import { countryChangeDeclined } from './helpers'
import { useLocation } from '../useLocation'
import { listUrl } from '../../lib/links'
import { MAX } from '../../lib/limits'
import { CURRENCIES, countryCurrency, formatMoney, getRate, homeCurrency, setHomeCurrency, type Rate } from '../../lib/currency'
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
  id,
  name,
  country,
  autoClear,
  showNames,
  autoCountry,
  lang,
  onSave,
  onClose,
}: {
  id: string
  name: string
  /** Sprache des Profils (für die vorgeschlagenen Länder) */
  lang: Lang
  country: string
  autoClear: boolean
  /** Namen bei Artikeln zeigen (D-097), nur auf diesem Gerät */
  showNames: boolean
  /** Reiseland automatisch nach Standort (D-057) */
  autoCountry: boolean
  onSave: (name: string, country: string, autoClear: boolean, autoCountry: boolean, showNames: boolean) => void
  onClose: () => void
}) {
  const [n, setN] = useState(name)
  const [c, setC] = useState(country)
  const [auto, setAuto] = useState(autoCountry)
  // Wechsel auf „Automatisch“ ohne Standort: erst fragen (D-066, D-067)
  const loc = useLocation()
  const [askLocation, setAskLocation] = useState(false)
  const [ac, setAc] = useState(autoClear)
  // Was „Automatisch“ jetzt ergäbe (D-057): das erkannte Land, sonst das bisherige der Liste. Nicht das eben fest
  // gewählte Land (das stand früher in Klammern, wenn man auf ein Land und zurück auf „Automatisch“ wechselte).
  // Ohne Standort kein Land in Klammern, es wäre nur geraten (D-067).
  const here = cachedCountry()
  const autoPreview = here && COUNTRY_BY_CODE.has(here) && !countryChangeDeclined(id, here) ? here : country
  const [names, setNames] = useState(showNames)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (auto && !autoCountry && !loc.available) return setAskLocation(true)
          // Automatisch: das bisherige Land speichern; den Wechsel ins erkannte Land macht die Liste mit Hinweis und „Rückgängig“ (D-040)
          onSave(n.trim() || name, auto ? country : c, ac, auto, names)
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
            <option value="auto">
              {loc.available
                ? t('autoCountry', { country: `${COUNTRY_BY_CODE.get(autoPreview)?.flag ?? ''} ${countryLabel(autoPreview, COUNTRY_BY_CODE.get(autoPreview)?.lang ?? 'en')}` })
                : t('autoCountryPlain')}
            </option>
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
        <label className="check-row">
          <input type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} />
          <span>
            {t('showNames')}
            <span className="muted small-text block">{t('showNamesHint')}</span>
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
          country={country}
          submitLabel={t('save')}
          onDone={(country, a) => onSave(n.trim() || name, country, ac, a, names)}
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

/** Währung umrechnen (D-093): Betrag in der Währung des Reiselands ↔ eigene Währung */
export function ConverterSheet({ country, profile, onClose }: { country: string; profile: Profile; onClose: () => void }) {
  const local = countryCurrency(country) ?? 'EUR'
  const [home, setHome] = useState(() => homeCurrency(profile))
  const [toHome, setToHome] = useState(true)
  const [amount, setAmount] = useState('10')
  const [rate, setRate] = useState<Rate | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    void getRate(local, home).then((r) => alive && setRate(r))
    return () => {
      alive = false
    }
  }, [local, home])
  const locale = profile.region ?? uiLang()
  const from = toHome ? local : home
  const to = toHome ? home : local
  const value = Number(amount.replace(/['’\s]/g, '').replace(',', '.'))
  const result = rate && Number.isFinite(value) ? (toHome ? value * rate.rate : value / rate.rate) : null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('convert')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('convert')}</h2>
        <div className="convert">
          <label className="convert-from">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={t('convertAmount', { currency: from })} />
            <span>{from}</span>
          </label>
          <button className="ghost" aria-label={t('convertSwap')} onClick={() => setToHome(!toHome)}>
            <ArrowUpDown size={18} />
          </button>
          <p className="convert-result" aria-live="polite">
            {rate === undefined ? '…' : result != null ? `≈ ${formatMoney(result, to, locale)}` : '–'}
          </p>
        </div>
        <label>
          {t('yourCurrency')}
          <select
            value={home}
            onChange={(e) => {
              setRate(undefined)
              setHome(e.target.value)
              setHomeCurrency(e.target.value)
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small-text">
          {rate === null ? t('rateMissing') : rate && rate.date ? t('rateFrom', { date: new Date(rate.date).toLocaleDateString(locale) }) : ''}
        </p>
        <button className="ghost" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  )
}
