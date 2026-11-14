// Startseite: alle Listen, neue Liste anlegen, Liste beitreten (QR-Code oder Link)
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { UserPlus, ClipboardPaste, ScanLine, Plus, Trash2, Users, X } from 'lucide-react'
import { COUNTRY_BY_CODE, profileLangLabel, profileLangShort } from '../data/countries'
import { AppLogo } from './AppLogo'
import { CountryOptions } from './CountryOptions'
import { LocationSheet } from './LocationSheet'
import { useLocation } from './useLocation'
import { countryName, t } from '../i18n'
import { listIdFrom } from '../lib/links'
import { detectCountry } from '../lib/country'
import { MAX } from '../lib/limits'
import { ListStore, DELETE_GRACE_MS, flushDeletes, recentDelete, scheduleDelete, undoDelete, isSoleMember, knownSole, knownLists, leaveList, localLastChange, localPeople, remoteOverview, supabase, type Profile } from '../lib/store'
import { AppVersion } from './AppVersion'
import { formatWhen, go } from './format'


export function Home({ profile, onEditProfile }: { profile: Profile; onEditProfile: () => void }) {
  const [name, setName] = useState('')
  // Vorauswahl: kein Land mit der eigenen Sprache, dort braucht es keine Übersetzung (D-041)
  const [country, setCountry] = useState(() => ['ES', 'IT', 'FR'].find((c) => COUNTRY_BY_CODE.get(c)?.lang !== profile.lang) ?? 'ES')
  const touched = useRef(false)
  // Reiseland: standardmässig automatisch nach Standort (D-057), sonst fest gewähltes Land
  // „Automatisch“ ist immer die Vorauswahl; fehlt der Standort, fragt „Liste erstellen“ zuerst danach (D-066, D-067)
  const loc = useLocation()
  const [auto, setAuto] = useState(true)
  const [askLocation, setAskLocation] = useState(false)
  const [lists, setLists] = useState(knownLists)
  // „Neue Liste“ und „Liste beitreten“ sind eingeklappt, bis man sie antippt (D-068)
  const [panel, setPanel] = useState<'new' | 'join' | 'link' | null>(null)
  const [scan, setScan] = useState(false)
  const showNew = panel === 'new'
  const setShowNew = (v: boolean) => setPanel(v ? 'new' : null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  // Einziges Mitglied? Dann „Löschen“ statt „Entfernen“ (D-036).
  // undefined = wird noch geprüft (keine Warnung zeigen, sonst wechselt der Text), null = nicht feststellbar (offline)
  const [sole, setSole] = useState<boolean | null | undefined>(undefined)
  // „Gelöscht · Rückgängig“ während der Gnadenfrist (D-036)
  const [deleted, setDeleted] = useState(() => recentDelete())
  useEffect(() => {
    if (!deleted) return
    const timer = window.setTimeout(() => {
      setDeleted(null)
      void flushDeletes()
    }, deleted.leftMs)
    return () => window.clearTimeout(timer)
  }, [deleted])
  const askRemove = (listId: string | null) => {
    setConfirmRemove(listId)
    setSole(listId ? knownSole(listId) : undefined)
    if (listId) void isSoleMember(listId).then((v) => setSole(v))
  }
  // Letzte Änderung pro Liste (D-036): sofort aus dem Gerät, dann aktuell aus Supabase
  const [changed, setChanged] = useState<Record<string, string>>(() =>
    Object.fromEntries(lists.map((l) => [l.id, localLastChange(l.id)]).filter((e): e is [string, string] => !!e[1])),
  )
  // Teilnehmer pro Liste, jüngste Aktivität zuerst: sofort aus dem Gerät, dann aktuell aus Supabase
  const [people, setPeople] = useState<Record<string, string[]>>(() => Object.fromEntries(lists.map((l) => [l.id, localPeople(l.id, profile)])))
  useEffect(() => {
    let alive = true
    void remoteOverview(
      lists.map((l) => l.id),
      profile,
    ).then((remote) => {
      if (!alive) return
      setChanged((c) => {
        const next = { ...c }
        for (const [id, at] of Object.entries(remote.changed)) if (!next[id] || at > next[id]) next[id] = at
        return next
      })
      setPeople((p) => ({ ...p, ...remote.people }))
    })
    return () => {
      alive = false
    }
  }, [lists, profile])
  const sorted = [...lists].sort((a, b) => (changed[b.id] ?? '').localeCompare(changed[a.id] ?? ''))

  // Bist du schon im Ausland, wird das aktuelle Land vorgeschlagen (änderbar)
  useEffect(() => {
    let alive = true
    void detectCountry().then((code) => {
      if (!alive || !code || COUNTRY_BY_CODE.get(code)?.lang === profile.lang) return // eigene Sprache: kein Vorschlag
      if (!touched.current) setCountry(code)
    })
    return () => {
      alive = false
    }
  }, [profile.lang])

  function make(c: string, a: boolean) {
    const id = crypto.randomUUID()
    const store = new ListStore(id)
    void store.create(name.trim(), c, a)
    go(`/l/${id}`)
  }

  function create(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (auto && !loc.available) return setAskLocation(true)
    make(country, auto)
  }

  return (
    <main className="page narrow">
      <header className="topbar">
        <h1 className="brand">
          <AppLogo /> <span className="brand-name">{t('appName')}</span>
        </h1>
        <button className="ghost small" onClick={onEditProfile} title={profileLangLabel(profile)}>
          {profile.name} · {profileLangShort(profile)}
        </button>
      </header>

      {/* Neu / Öffnen als waagrechte, scrollbare Knopfleiste; das Formular erscheint darunter */}
      <div className="action-row">
        {/* Ohne Listen ist „Neue Liste“ der hervorgehobene nächste Schritt (D-068) */}
        <button className={`${lists.length === 0 ? 'primary' : 'ghost'} ${panel === 'new' ? 'active' : ''}`} onClick={() => setPanel(panel === 'new' ? null : 'new')}>
          <Plus size={18} /> {t('newList')}
        </button>
        {/* Beitreten: QR-Code scannen oder Link einfügen (D-037, D-038) */}
        <button className={`ghost ${panel === 'join' || panel === 'link' ? 'active' : ''}`} onClick={() => setPanel(panel === 'join' || panel === 'link' ? null : 'join')}>
          <UserPlus size={18} /> {t('joinList')}
        </button>
      </div>
      {/* Noch keine Liste: kurz sagen, wie es losgeht (D-068) */}
      {lists.length === 0 && !panel && <p className="muted empty-home">{t('noListsYet')}</p>}
      {scan && (
        <Suspense fallback={null}>
          <QrScanner
            onFound={(id) => go(`/l/${id}`)}
            onClose={() => setScan(false)}
            onPasteLink={() => {
              setScan(false)
              setPanel('link')
            }}
          />
        </Suspense>
      )}
      {(panel === 'join' || panel === 'link') && (
        <JoinList onClose={() => setPanel(null)} onScan={() => setScan(true)} focusLink={panel === 'link'} />
      )}
      {showNew && (
        <form className="card stack" onSubmit={create}>
          <div className="row-between">
            <h2>{t('newList')}</h2>
            <button type="button" className="ghost small" aria-label={t('close')} onClick={() => setShowNew(false)}>
              <X size={16} />
            </button>
          </div>
          {/* Name zuerst und Pflicht (D-058) */}
          <label>
            {t('name')}
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('listNamePlaceholder')} maxLength={MAX.listName} required />
          </label>
          <label>
            {t('travelCountry')}
            <select
              value={auto ? 'auto' : country}
              onChange={(e) => {
                if (e.target.value === 'auto') return setAuto(true)
                touched.current = true
                setAuto(false)
                setCountry(e.target.value)
              }}
            >
              {/* Ohne Standort kein Land in Klammern: es wäre nur geraten (D-067) */}
              <option value="auto">
                {loc.available ? t('autoCountry', { country: `${COUNTRY_BY_CODE.get(country)?.flag ?? ''} ${countryName(country)}` }) : t('autoCountryPlain')}
              </option>
              <CountryOptions lang={profile.lang} />
            </select>
          </label>
          <button className="primary" disabled={!name.trim()}>
            {t('createList')}
          </button>
        </form>
      )}
      {askLocation && (
        <LocationSheet loc={loc} lang={profile.lang} country={country} submitLabel={t('createList')} onDone={make} onClose={() => setAskLocation(false)} />
      )}

      {lists.length > 0 && (
        <section className="stack">
          <h2>{t('yourLists')}</h2>
          {sorted.map((l) => {
            const c = COUNTRY_BY_CODE.get(l.country)
            return (
              <div key={l.id} className="card list-card">
                <div className="row-between">
                  <a href={`#/l/${l.id}`} className="list-link">
                    <span className="flag">{c?.flag}</span> {l.name}
                    {changed[l.id] && <span className="list-changed">{t('lastChange', { when: formatWhen(changed[l.id]) })}</span>}
                    {!!people[l.id]?.length && (
                      <span className="list-people" title={people[l.id].join(', ')}>
                        <Users size={13} aria-hidden /> {people[l.id].join(', ')}
                      </span>
                    )}
                  </a>
                  <button className="ghost small" aria-label={t('removeList')} onClick={() => askRemove(confirmRemove === l.id ? null : l.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                {confirmRemove === l.id && (
                  <div className="confirm">
                    <p className="small-text warn-text">{sole === undefined ? '…' : sole ? t('deleteListConfirm') : t('removeListConfirm')}</p>
                    <div className="row-gap">
                      <button
                        className="danger-btn small"
                        disabled={sole === undefined}
                        onClick={() => {
                          if (sole) {
                            scheduleDelete(l.id, l.name)
                            setDeleted({ id: l.id, name: l.name, leftMs: DELETE_GRACE_MS })
                          } else void leaveList(l.id)
                          setConfirmRemove(null)
                          setLists(knownLists())
                        }}
                      >
                        {sole ? t('deleteYes') : t('removeYes')}
                      </button>
                      <button className="ghost small" onClick={() => setConfirmRemove(null)}>
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {!supabase && <p className="note">{t('demoMode')}</p>}
      {deleted && (
        <div className="undo-bar" role="status">
          <span>{t('listDeleted', { name: deleted.name })}</span>
          <button
            className="link"
            onClick={() => {
              undoDelete(deleted.id)
              setDeleted(null)
              setLists(knownLists())
            }}
          >
            {t('undo')}
          </button>
        </div>
      )}
      <footer className="footer">
        <a href="#/datenschutz">{t('privacy')}</a>
        <AppVersion />
      </footer>
    </main>
  )
}

const QrScanner = lazy(() => import('../QrScanner'))

/** Liste über einen eingefügten Link öffnen (D-037) */
/** „Liste beitreten“ (D-037/D-038): primär QR-Code scannen, alternativ Link einfügen */
function JoinList({ onClose, onScan, focusLink }: { onClose: () => void; onScan: () => void; focusLink?: boolean }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  const openId = (value: string) => {
    const id = listIdFrom(value)
    if (id) go(`/l/${id}`)
    else setError(true)
  }
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault()
        openId(text)
      }}
    >
      <div className="row-between">
        <h2>{t('joinList')}</h2>
        <button type="button" className="ghost small" aria-label={t('close')} onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <button type="button" className="primary join-scan" onClick={onScan}>
        <ScanLine size={20} /> {t('scanQr')}
      </button>
      <p className="join-or muted small-text">{t('orPasteLink')}</p>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(false)
        }}
        placeholder={t('linkPlaceholder')}
        autoFocus={focusLink}
      />
      {error && <p className="small-text error-text">{t('linkInvalid')}</p>}
      <div className="row-gap">
        <button className="ghost" disabled={!text.trim()}>
          {t('openList')}
        </button>
        {navigator.clipboard?.readText && (
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              try {
                const clip = await navigator.clipboard.readText()
                setText(clip)
                if (listIdFrom(clip)) openId(clip)
              } catch {
                /* Einfügen abgelehnt */
              }
            }}
          >
            <ClipboardPaste size={16} /> {t('paste')}
          </button>
        )}
      </div>
    </form>
  )
}

