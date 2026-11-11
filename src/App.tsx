import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  ArrowLeft,
  Shield,
  UserPlus,
  Users,
  CloudAlert,
  CloudOff,
  Camera,
  Check,
  ClipboardPaste,
  Hand,
  Lightbulb,
  RotateCcw,
  ScanLine,
  List,
  LocateFixed,
  MapPin,
  Menu,
  Pencil,
  Plus,
  Share2,
  ShoppingCart,
  Store as StoreIcon,
  Trash2,
  X,
} from 'lucide-react'
import { CATEGORY_ORDER, BY_ID, HINTS, LANGS, type Category, type Lang } from './data/dictionary'
import { COUNTRIES, COUNTRY_BY_CODE, guessHome, LANG_LABEL } from './data/countries'
import { categoryLabel, countryName, setUiLang, t, uiLang } from './i18n'
import Privacy from './Privacy'
import { THANKS, WHERE_IS } from './data/phrases'
import { FEATURES } from './features'
import { flash, reducedMotion, slideOut, useFlip } from './lib/motion'
import { addQty, sumQty } from './lib/qty'
import { isIos, isStandalone, listIdFrom, listUrl } from './lib/links'
import { findConcept, nameIn, normalize, splitQuantity, suggest } from './lib/translate'
import { autoShopModeBlocked, blockAutoShopMode, FAR_RADIUS_M, findNearbyShops, getPosition, isInsideSupermarket, formatDistance, getChosenShop, LEFT_SHOP_M, meters, NearbyError, recentSuggestion, setChosenShop, shopTag, type Shop } from './lib/nearby'
import { detectCountry } from './lib/country'
import { hasPhotos, loadPhotos, PhotoError, type Photo } from './lib/photos'
import { ListStore, knownLists, lastList, leaveList, localLastChange, remoteLastChanges, memberProfiles, setLastList, lastSyncError, profileStore, supabase, type Item, type Profile, type SyncState } from './lib/store'

// ---------- Routing über den Hash (funktioniert auf GitHub Pages ohne Server) ----------

// Beim Öffnen der App ohne Ziel (Startseite) direkt zur zuletzt geöffneten Liste (D-028).
// Nur einmal beim Laden – „Alle Listen“ führt danach normal zur Übersicht.
if (location.hash === '' || location.hash === '#/' || location.hash === '#') {
  const last = lastList()
  if (last) history.replaceState(null, '', `#/l/${last}`)
}

function useRoute() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  if (hash.startsWith('#/datenschutz')) return { page: 'privacy' as const }
  const m = hash.match(/^#\/l\/([0-9a-f-]{36})/i)
  return m ? { page: 'list' as const, id: m[1] } : { page: 'home' as const }
}

const go = (path: string) => (location.hash = path)

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(profileStore.get())
  const route = useRoute()
  // Sprache der Oberfläche = Sprache aus dem Profil (vor der Einrichtung: Browsersprache)
  setUiLang(profile?.lang ?? guessLang())

  if (route.page === 'privacy') return <Privacy />
  if (!profile)
    return (
      <ProfileSetup
        listId={route.page === 'list' && 'id' in route ? route.id : undefined}
        onDone={(p) => {
          profileStore.set(p)
          setProfile(p)
        }}
      />
    )
  return route.page === 'list' && 'id' in route ? (
    <ListView key={route.id} id={route.id} profile={profile} />
  ) : (
    <Home profile={profile} onEditProfile={() => setProfile(null)} />
  )
}

// ---------- Profil ----------

function guessLang(): Lang {
  const l = navigator.language.slice(0, 2) as Lang
  return LANGS.includes(l) ? l : 'de'
}

function ProfileSetup({ onDone, listId }: { onDone: (p: Profile) => void; listId?: string }) {
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
  // Wohnland = „zu Hause“ (D-041); Vorschlag aus Browsersprache, änderbar
  const [home, setHome] = useState<string>(() => (existing?.home !== undefined ? existing.home : guessHome(existing?.lang ?? guessLang())) ?? '')
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
              <button key={`${m.name}|${m.lang}`} className="chip" onClick={() => onDone({ ...m, home: guessHome(m.lang) })}>
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
          if (name.trim()) onDone({ name: name.trim(), lang, home: home || null })
        }}
      >
        <label>
          {t('yourName')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} autoFocus />
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
        <label>
          {t('homeCountry')}
          <select value={home} onChange={(e) => setHome(e.target.value)}>
            {[...COUNTRIES]
              .sort((a, b) => countryName(a.code).localeCompare(countryName(b.code)))
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {countryName(c.code)}
                </option>
              ))}
            <option value="">{t('homeOther')}</option>
          </select>
          <span className="muted small-text">{t('homeHint')}</span>
        </label>
        <button className="primary" disabled={!name.trim()}>
          {t('letsGo')}
        </button>
      </form>
      <footer className="footer">
        <a href="#/datenschutz">{t('privacy')}</a>
      </footer>
    </main>
  )
}

// ---------- Startseite ----------

function Home({ profile, onEditProfile }: { profile: Profile; onEditProfile: () => void }) {
  const [name, setName] = useState('')
  const home = profile.home !== undefined ? profile.home : guessHome(profile.lang)
  // Vorauswahl: nie das eigene Wohnland (D-041)
  const [country, setCountry] = useState(home === 'ES' ? 'IT' : 'ES')
  const [detected, setDetected] = useState<string | null>(null)
  const touched = useRef(false)
  const [lists, setLists] = useState(knownLists)
  // „Neue Liste“ ist eingeklappt, sobald es Listen gibt; ohne Listen direkt offen
  const [panel, setPanel] = useState<'new' | 'join' | 'link' | null>(lists.length === 0 ? 'new' : null)
  const [scan, setScan] = useState(false)
  const showNew = panel === 'new'
  const setShowNew = (v: boolean) => setPanel(v ? 'new' : null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  // Letzte Änderung pro Liste (D-036): sofort aus dem Gerät, dann aktuell aus Supabase
  const [changed, setChanged] = useState<Record<string, string>>(() =>
    Object.fromEntries(lists.map((l) => [l.id, localLastChange(l.id)]).filter((e): e is [string, string] => !!e[1])),
  )
  useEffect(() => {
    let alive = true
    void remoteLastChanges(lists.map((l) => l.id)).then((remote) => {
      if (!alive) return
      setChanged((c) => {
        const next = { ...c }
        for (const [id, at] of Object.entries(remote)) if (!next[id] || at > next[id]) next[id] = at
        return next
      })
    })
    return () => {
      alive = false
    }
  }, [lists])
  const sorted = [...lists].sort((a, b) => (changed[b.id] ?? '').localeCompare(changed[a.id] ?? ''))

  // Bist du schon im Ausland, wird das aktuelle Land vorgeschlagen (änderbar)
  useEffect(() => {
    let alive = true
    void detectCountry().then((code) => {
      if (!alive || !code || code === home) return // zu Hause: kein Vorschlag
      setDetected(code)
      if (!touched.current) setCountry(code)
    })
    return () => {
      alive = false
    }
  }, [home])

  function create(e: FormEvent) {
    e.preventDefault()
    const id = crypto.randomUUID()
    const store = new ListStore(id)
    void store.create(name.trim() || t('defaultListName', { country: countryName(country) }), country)
    go(`/l/${id}`)
  }

  return (
    <main className="page narrow">
      <header className="topbar">
        <h1 className="brand">
          <ShoppingCart size={26} strokeWidth={2.2} /> {t('appName')}
        </h1>
        <button className="ghost small" onClick={onEditProfile}>
          {profile.name} · {home ? `${COUNTRY_BY_CODE.get(home)?.flag ?? ''} ` : ''}{LANG_LABEL[profile.lang]}
        </button>
      </header>

      {/* Neu / Öffnen als waagrechte, scrollbare Knopfleiste; das Formular erscheint darunter */}
      <div className="action-row">
        <button className={`ghost ${panel === 'new' ? 'active' : ''}`} onClick={() => setPanel(panel === 'new' ? null : 'new')}>
          <Plus size={18} /> {t('newList')}
        </button>
        {/* Beitreten: QR-Code scannen oder Link einfügen (D-037, D-038) */}
        <button className={`ghost ${panel === 'join' || panel === 'link' ? 'active' : ''}`} onClick={() => setPanel(panel === 'join' || panel === 'link' ? null : 'join')}>
          <UserPlus size={18} /> {t('joinList')}
        </button>
      </div>
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
            {lists.length > 0 && (
              <button type="button" className="ghost small" aria-label={t('close')} onClick={() => setShowNew(false)}>
                <X size={16} />
              </button>
            )}
          </div>
          <label>
            {t('travelCountry')}
            <select
              value={country}
              onChange={(e) => {
                touched.current = true
                setCountry(e.target.value)
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {countryName(c.code)} – {LANG_LABEL[c.lang]}
                </option>
              ))}
            </select>
            {detected && detected === country && <span className="hint-ok">
                <LocateFixed size={14} /> {t('currentLocation')}
              </span>}
          </label>
          <label>
            {t('nameOptional')}
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('listNamePlaceholder')} />
          </label>
          <button className="primary">{t('createList')}</button>
        </form>
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
                  </a>
                  <button className="ghost small" aria-label={t('removeList')} onClick={() => setConfirmRemove(confirmRemove === l.id ? null : l.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                {confirmRemove === l.id && (
                  <div className="confirm">
                    <p className="small-text warn-text">{t('removeListConfirm')}</p>
                    <div className="row-gap">
                      <button
                        className="danger-btn small"
                        onClick={() => {
                          void leaveList(l.id)
                          setConfirmRemove(null)
                          setLists(knownLists())
                        }}
                      >
                        {t('removeYes')}
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
      <LocationNotice />
      <footer className="footer">
        <a href="#/datenschutz">{t('privacy')}</a>
      </footer>
    </main>
  )
}

const QrScanner = lazy(() => import('./QrScanner'))

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

/** In Safari auf dem iPhone geöffneter Listen-Link: Hinweis, wie man die Liste in die Home-Bildschirm-App holt (D-037) */
function IosAppHint({ id }: { id: string }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return !isIos() || isStandalone() || localStorage.getItem('rl:iosHint') === '1'
    } catch {
      return true
    }
  })
  const [copied, setCopied] = useState(false)
  if (hidden) return null
  return (
    <div className="note info ios-hint">
      <p>{t('iosHint')}</p>
      <div className="row-gap">
        <button
          className="primary small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(listUrl(id))
              setCopied(true)
            } catch {
              /* egal */
            }
          }}
        >
          {copied ? t('copied') : t('copyLink')}
        </button>
        <button
          className="ghost small"
          onClick={() => {
            try {
              localStorage.setItem('rl:iosHint', '1')
            } catch {
              /* egal */
            }
            setHidden(true)
          }}
        >
          {t('iosHintDismiss')}
        </button>
      </div>
    </div>
  )
}

/** Einmaliger Hinweis zum Standort (bis „OK“ getippt) */
function LocationNotice() {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem('rl:locnotice') === '1'
    } catch {
      return true
    }
  })
  if (seen) return null
  return (
    <div className="note info">
      <MapPin size={15} /> {t('locationNotice')} <a href="#/datenschutz">{t('privacy')}</a>
      <button
        className="link"
        onClick={() => {
          try {
            localStorage.setItem('rl:locnotice', '1')
          } catch {
            /* egal */
          }
          setSeen(true)
        }}
      >
        {t('ok')}
      </button>
    </div>
  )
}

// ---------- Liste ----------

function useStore(id: string, profile: Profile) {
  const store = useMemo(() => new ListStore(id), [id])
  useEffect(() => {
    void store.start(profile)
    return () => store.stop()
  }, [store, profile])
  const version = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => `${store.items.length}|${store.items.map((i) => i.updatedAt).join()}|${store.list?.updatedAt}|${store.sync}|${store.notFound}`,
  )
  return { store, version }
}

/** Sync-Zustand: im Normalfall unsichtbar, nur bei offline/Fehler ein kleines Symbol mit Erklärung auf Antippen */
function SyncBadge({ state, error }: { state: SyncState; error: string | null }) {
  const [open, setOpen] = useState(false)
  if (state === 'synced' || state === 'syncing') return null
  const isError = state === 'error'
  const text =
    state === 'offline' ? t('syncOffline') : state === 'local-only' ? t('syncLocal') : t('syncError')
  return (
    <div className="menu-wrap">
      <button
        className={`icon-btn sync-badge ${isError ? 'warn' : ''}`}
        aria-label={isError ? t('syncErrorLabel') : t('offline')}
        onClick={() => setOpen(!open)}
      >
        {isError ? <CloudAlert size={20} /> : <CloudOff size={20} />}
      </button>
      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="menu sync-pop" role="status">
            <p>{text}</p>
            {isError && error && <p className="sync-detail">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}

function ListView({ id, profile }: { id: string; profile: Profile }) {
  const { store } = useStore(id, profile)
  useEffect(() => setLastList(id), [id])
  const [input, setInput] = useState('')
  // „Gelöscht · Rückgängig“ für 5 Sekunden (D-042)
  // Leiste unten mit Hinweis und Aktionen („Rückgängig“, „Separat hinzufügen“)
  const [undo, setUndo] = useState<{ label: string; actions: { label: string; run: () => void }[] } | null>(null)
  const undoTimer = useRef<number | undefined>(undefined)
  const showBar = (label: string, actions: { label: string; run: () => void }[]) => {
    window.clearTimeout(undoTimer.current)
    setUndo({ label, actions })
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000)
  }
  const showUndo = (ids: string[], label: string) => showBar(label, [{ label: t('undo'), run: () => void store.restore(ids) }])
  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  // ---- Weiche Übergänge (D-044) ----
  const mainRef = useRef<HTMLElement>(null)
  const localChanges = useRef(new Map<string, number>())
  const markLocal = (itemId: string) => localChanges.current.set(itemId, Date.now())
  useFlip(
    mainRef,
    (itemId) => Date.now() - (localChanges.current.get(itemId) ?? 0) < 5000,
    (els) => {
      // Selbst hinzugefügter Artikel ausserhalb des sichtbaren Bereichs: kurz hinscrollen
      const el = els[els.length - 1]
      const r = el.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    },
  )

  // ---- Erledigte automatisch entfernen (D-043): nach 1 Tag oder beim Verlassen des Ladens ----
  const autoClear = store.list ? store.list.autoClear !== false : false
  const showUndoRef = useRef(showUndo)
  showUndoRef.current = showUndo
  // Nach 1 Tag: beim Öffnen und alle 5 Minuten, solange die Liste offen ist
  useEffect(() => {
    if (!autoClear) return
    const run = () =>
      void store.removeChecked(DAY_MS).then((ids) => ids.length && showUndoRef.current(ids, t('autoClearedDay', { n: ids.length })))
    run()
    const iv = window.setInterval(run, 5 * 60 * 1000)
    return () => window.clearInterval(iv)
  }, [autoClear, store])
  // „Schon mal gekauft“ nur, solange das Eingabefeld aktiv ist (D-030)
  const [inputFocused, setInputFocused] = useState(false)
  const blurTimer = useRef<number | undefined>(undefined)
  const [shopMode, setShopModeState] = useState(false)
  const setShopMode = (v: boolean) => {
    if (!v) setAutoShop(null)
    setShopModeState(v)
  }
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [shop, setShop] = useState<Shop | null>(() => getChosenShop(id))
  // Für die Fotos zählt der gewählte Laden, sonst der angezeigte Vorschlag
  const [suggested, setSuggested] = useState<Shop | null>(null)
  const photoShop = shop ?? suggested

  // Automatisch in die Ladenansicht, wenn beim Öffnen ein Supermarkt sehr nahe ist (D-020)
  const [mountedAt] = useState(() => Date.now())
  const [autoShop, setAutoShop] = useState<Shop | null>(null)
  const inputRef = useRef('')
  const shopModeRef = useRef(false)
  inputRef.current = input
  shopModeRef.current = shopMode
  const onArrived = (s: Shop) => {
    if (Date.now() - mountedAt > 30_000) return // nur direkt nach dem Öffnen der Liste
    if (inputRef.current.trim() || shopModeRef.current || autoShopModeBlocked(s.id)) return
    setShopMode(true)
    setAutoShop(s)
  }
  const chooseShop = (s: Shop | null) => {
    setChosenShop(id, s)
    setShop(s)
  }

  // Laden verlassen (D-043): War man in der Ladenansicht bei einem Laden, merkt sich die App den Besuch.
  // Ist man später (beim Zurückkehren in die App oder alle 2 Minuten) weiter als 150 m weg, werden Erledigte entfernt.
  const visitShop = shopMode ? (autoShop ?? photoShop) : null
  useEffect(() => {
    if (visitShop?.lat != null && visitShop.lon != null) saveVisit(id, { lat: visitShop.lat, lon: visitShop.lon, at: Date.now() })
  }, [id, visitShop?.id, visitShop?.lat, visitShop?.lon])
  useEffect(() => {
    if (!autoClear) return
    let busy = false
    const check = async () => {
      const visit = readVisit(id)
      if (!visit || busy || document.visibilityState !== 'visible') return
      busy = true
      try {
        const { latitude, longitude, accuracy } = (await getPosition(10_000)).coords
        if (meters(latitude, longitude, visit.lat, visit.lon) > Math.max(150, accuracy)) {
          saveVisit(id, null)
          const ids = await store.removeChecked()
          if (ids.length) showUndoRef.current(ids, t('autoClearedShop', { n: ids.length }))
        }
      } catch {
        /* ohne Standort: später nochmals, spätestens greift die 1-Tages-Regel */
      } finally {
        busy = false
      }
    }
    const iv = window.setInterval(() => void check(), 2 * 60 * 1000)
    const onVisible = () => void check()
    document.addEventListener('visibilitychange', onVisible)
    void check()
    return () => {
      window.clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [autoClear, id, store])

  const list = store.list

  // Reiseland automatisch anpassen, wenn man in einem anderen unterstützten Land ist (D-040).
  // Zu Hause (Wohnland aus dem Profil, D-041) oder in einem nicht unterstützten Land: keine Änderung.
  const home = profile.home !== undefined ? profile.home : guessHome(profile.lang)
  const [countryMoved, setCountryMoved] = useState<{ from: string; to: string } | null>(null)
  const listCountry = list?.country
  useEffect(() => {
    if (!listCountry) return
    let alive = true
    void detectCountry(30 * 60 * 1000).then((code) => {
      if (!alive || !code || code === listCountry || code === home || !COUNTRY_BY_CODE.has(code)) return
      if (countryChangeDeclined(id, code)) return
      void store.updateList({ country: code })
      setCountryMoved({ from: listCountry, to: code })
    })
    return () => {
      alive = false
    }
    // Nur beim Öffnen der Liste bzw. wenn sie geladen ist
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!listCountry])

  const country = list ? COUNTRY_BY_CODE.get(list.country) : undefined
  const target: Lang = country?.lang ?? 'en'
  const items = store.items.filter((i) => !i.deleted)
  const suggestions = suggest(input, profile.lang)

  function add(text: string, conceptId?: string) {
    const { qty, text: clean } = splitQuantity(text)
    if (!clean) return
    const data = { text: clean, qty, lang: profile.lang, conceptId: conceptId ?? findConcept(clean, profile.lang), author: profile.name }
    setInput('')
    // Steht derselbe Artikel schon offen auf der Liste: Menge erhöhen statt neuer Zeile (D-045)
    const key = data.conceptId ?? normalize(clean)
    const existing = store.items.find((i) => !i.deleted && !i.checked && dupKey(i) === key)
    if (!existing) {
      void store.addItem(data)
      return
    }
    const before = existing.qty
    const merged = addQty(before, qty)
    void store.updateItem(existing.id, { qty: merged })
    window.setTimeout(() => {
      const el = mainRef.current?.querySelector(`[data-item-id="${existing.id}"]`)
      if (el) flash(el)
    }, 30)
    showBar(t('qtyMerged', { name: nameIn(existing.conceptId, profile.lang) ?? existing.text, qty: formatQty(merged) }), [
      { label: t('undo'), run: () => void store.updateItem(existing.id, { qty: before }) },
      {
        label: t('addSeparately'),
        run: () => {
          void store.updateItem(existing.id, { qty: before })
          void store.addItem(data)
        },
      },
    ])
  }

  if (!list) {
    return (
      <main className="page narrow">
        <a href="#/" className="back">
          <ArrowLeft size={18} /> {t('allLists')}
        </a>
        <div className="card">
          {store.notFound ? t('listNotFound') : supabase ? t('listLoading') : t('listNotOnDevice')}
        </div>
      </main>
    )
  }

  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)
  // Schon mal gekauft (D-030): entfernte Artikel dieser Liste, die gerade nicht auf der Liste stehen
  const keyOf = (i: Item) => i.conceptId ?? i.text.trim().toLowerCase()
  const onList = new Set(items.map(keyOf))
  const again: Item[] = []
  for (const i of [...store.items].filter((x) => x.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const k = keyOf(i)
    if (onList.has(k) || again.some((a) => keyOf(a) === k)) continue
    again.push(i)
    if (again.length >= 8) break
  }
  // Pro Abteilung; doppelte offene Einträge desselben Artikels werden zu einer Zeile zusammengefasst (D-045)
  const groups = new Map<Category | 'sonstiges', Item[][]>()
  for (const item of open) {
    const cat = (item.conceptId && BY_ID.get(item.conceptId)?.category) || 'sonstiges'
    const list = groups.get(cat) ?? []
    const same = list.find((g) => dupKey(g[0]) === dupKey(item))
    if (same) same.push(item)
    else list.push([item])
    groups.set(cat, list)
  }
  const openKeys = new Set(open.map(dupKey))
  const order: (Category | 'sonstiges')[] = [...CATEGORY_ORDER, 'sonstiges']

  return (
    <main ref={mainRef} className={`page ${shopMode ? 'shop' : ''}`}>
      <header className="topbar">
        <a href="#/" className="back" aria-label={t('allLists')}>
          <ArrowLeft size={22} />
        </a>
        <div className="title">
          <h1>{list.name}</h1>
          <span className="sub">
            {country?.flag} {countryName(list.country)} · {LANG_LABEL[target]}
          </span>
          <ShopBar shop={shop} onChoose={chooseShop} onSuggest={setSuggested} onArrived={onArrived} />
        </div>
        <SyncBadge state={store.sync} error={lastSyncError} />
        <div className="menu-wrap">
          <button className="ghost icon" aria-label={t('menu')} aria-expanded={showMenu} onClick={() => setShowMenu(!showMenu)}>
            <Menu size={20} />
          </button>
          {showMenu && (
            <>
              <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
              <div className="menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false)
                    setShowShare(true)
                  }}
                >
                  <Share2 size={18} /> {t('share')}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false)
                    setShowMembers(true)
                  }}
                >
                  <Users size={18} /> {t('members')}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false)
                    setShopMode(!shopMode)
                  }}
                >
                  <ShoppingCart size={18} /> {shopMode ? t('shopModeEnd') : t('shopMode')}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false)
                    setShowEdit(true)
                  }}
                >
                  <Pencil size={18} /> {t('editList')}
                </button>
                <button role="menuitem" onClick={() => go('/')}>
                  <List size={18} /> {t('allLists')}
                </button>
                <button role="menuitem" onClick={() => go('/datenschutz')}>
                  <Shield size={18} /> {t('privacy')}
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setShowMenu(false)
                    setConfirmLeave(true)
                  }}
                >
                  <Trash2 size={18} /> {t('removeFromDevice')}
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <IosAppHint id={id} />

      {countryMoved && list.country === countryMoved.to && (
        <div className="toast">
          <MapPin size={16} /> {t('countryChanged', { country: `${COUNTRY_BY_CODE.get(countryMoved.to)?.flag ?? ''} ${countryName(countryMoved.to)}` })}
          <button
            className="link"
            onClick={() => {
              declineCountryChange(id, countryMoved.to)
              void store.updateList({ country: countryMoved.from })
              setCountryMoved(null)
            }}
          >
            {t('undo')}
          </button>
          <button className="link" aria-label={t('close')} onClick={() => setCountryMoved(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {shopMode && autoShop && (
        <div className="toast">
          <ShoppingCart size={16} /> {t('autoShopMode')} <strong>{autoShop.name}</strong>
          <button
            className="link"
            onClick={() => {
              blockAutoShopMode(autoShop.id)
              setShopMode(false)
            }}
          >
            {t('back')}
          </button>
        </div>
      )}

      {!shopMode && (
        <form
          className="add"
          onSubmit={(e) => {
            e.preventDefault()
            add(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              window.clearTimeout(blurTimer.current)
              setInputFocused(true)
            }}
            // Kurz verzögert, damit ein Tipp auf einen Vorschlag noch ankommt
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setInputFocused(false), 250)
            }}
            placeholder={t('addPlaceholder', { lang: LANG_LABEL[profile.lang], example: t('addExample') })}
            aria-label={t('addItem')}
          />
          <button className="primary" aria-label={t('add')} disabled={!input.trim()}>
            <Plus size={22} strokeWidth={2.5} />
          </button>
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const { qty } = splitQuantity(input)
                      add(`${qty ? qty + ' ' : ''}${s.names[profile.lang][0]}`, s.id)
                    }}
                  >
                    {s.names[profile.lang][0]} <span className="muted">→ {s.names[target][0]}</span>
                    {openKeys.has(s.id) && <span className="on-list">✓ {t('alreadyOnList')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}

      {!shopMode && inputFocused && !input && again.length > 0 && (
        <div className="again">
          <span className="muted small-text">
            <RotateCcw size={14} /> {t('buyAgain')}
          </span>
          <div className="chips">
            {again.map((i) => (
              <button
                key={i.id}
                className="chip"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  void store.addItem({
                    text: nameIn(i.conceptId, profile.lang) ?? i.text,
                    qty: null,
                    lang: i.conceptId ? profile.lang : i.lang,
                    conceptId: i.conceptId,
                    author: profile.name,
                  })
                }
              >
                <Plus size={14} /> {nameIn(i.conceptId, profile.lang) ?? i.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="toolbar">
        <button className={shopMode ? 'primary' : 'ghost'} onClick={() => setShopMode(!shopMode)}>
          {shopMode ? (
            <>
              <Pencil size={16} /> {t('edit')}
            </>
          ) : (
            <>
              <ShoppingCart size={16} /> {t('shopMode')}
            </>
          )}
        </button>
        <span className="muted">
          {t('counts', { open: open.length, done: done.length })}
        </span>
      </div>

      {items.length === 0 && <p className="empty">{t('empty')}</p>}

      {order
        .filter((c) => groups.has(c))
        .map((cat) => (
          <section key={cat} className="group">
            <h3 data-flip={cat}>{cat === 'sonstiges' ? t('other') : categoryLabel(cat)}</h3>
            {groups.get(cat)!.map((grp) => (
              <ItemRow key={grp[0].id} item={grp[0]} group={grp.length > 1 ? grp : undefined} store={store} target={target} country={list.country} shopTag={photoShop ? shopTag(photoShop) : undefined} shopName={photoShop?.brand ?? photoShop?.name} viewer={profile.lang} shopMode={shopMode} me={profile.name} onDeleted={(ids, name) => showUndo(ids, t('deletedOne', { name }))} onLocalChange={markLocal} />
            ))}
          </section>
        ))}

      {done.length > 0 && (
        <section className="group done">
          <h3 className="done-head" data-flip="done">
            {t('inCart')}
            <button
              className="ghost small"
              onClick={() =>
                void slideOut(Array.from(mainRef.current?.querySelectorAll('.group.done .item') ?? [])).then(() =>
                  store.removeChecked().then((ids) => ids.length && showUndo(ids, t('deletedMany', { n: ids.length }))),
                )
              }
            >
              <Trash2 size={16} /> {t('removeChecked')}
            </button>
          </h3>
          {done.map((item) => (
            <ItemRow key={item.id} item={item} store={store} target={target} country={list.country} shopTag={photoShop ? shopTag(photoShop) : undefined} shopName={photoShop?.brand ?? photoShop?.name} viewer={profile.lang} shopMode={shopMode} me={profile.name} onDeleted={(ids, name) => showUndo(ids, t('deletedOne', { name }))} onLocalChange={markLocal} />
          ))}
        </section>
      )}

      {undo && (
        <div className="undo-bar" role="status">
          <span>{undo.label}</span>
          {undo.actions.map((a) => (
            <button
              key={a.label}
              className="link"
              onClick={() => {
                a.run()
                window.clearTimeout(undoTimer.current)
                setUndo(null)
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {showShare && <ShareSheet id={id} name={list.name} onClose={() => setShowShare(false)} />}
      {showMembers && <MembersSheet store={store} profile={profile} onClose={() => setShowMembers(false)} />}
      {confirmLeave && (
        // Warnung vor dem Entfernen (D-036)
        <div className="sheet-backdrop" onClick={() => setConfirmLeave(false)}>
          <div className="sheet" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{t('removeListTitle', { name: list.name })}</h2>
            <p>{t('removeListConfirm')}</p>
            <button
              className="danger-btn"
              onClick={() => {
                void leaveList(id)
                go('/')
              }}
            >
              <Trash2 size={16} /> {t('removeYes')}
            </button>
            <button className="ghost" onClick={() => setConfirmLeave(false)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      {showEdit && (
        <EditSheet
          name={list.name}
          country={list.country}
          autoClear={list.autoClear !== false}
          onSave={(name, country, autoClear) => {
            void store.updateList({ name, country, ...(autoClear !== (list.autoClear !== false) ? { autoClear } : {}) })
            setShowEdit(false)
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </main>
  )
}

function ItemRow({
  item,
  store,
  target,
  country,
  shopTag,
  shopName,
  viewer,
  shopMode,
  me,
  onDeleted,
  onLocalChange,
  group,
}: {
  item: Item
  /** Mehrere offene Einträge desselben Artikels, als eine Zeile angezeigt (D-045) */
  group?: Item[]
  store: ListStore
  target: Lang
  country: string
  shopTag?: string
  shopName?: string
  viewer: Lang
  shopMode: boolean
  /** Name aus dem Profil (für „Ich hole das“, D-031) */
  me: string
  /** Für „Gelöscht · Rückgängig“ (D-042) */
  onDeleted: (ids: string[], name: string) => void
  /** Eigene Änderung melden, damit sie nicht als „von anderen“ aufleuchtet (D-044) */
  onLocalChange: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // Zusammengefasste Zeile: Menge summiert, alle Autoren, Aktionen gelten für alle Einträge (D-045)
  const entries = group ?? [item]
  const ids = entries.map((e) => e.id)
  const qty = group ? sumQty(group.map((e) => e.qty)) : item.qty
  const author = [...new Set(entries.map((e) => e.author).filter(Boolean))].join(', ')
  const claimedBy = entries.find((e) => e.claimedBy)?.claimedBy ?? null
  const stamp = entries.map((e) => e.updatedAt).reduce((a, b) => (a > b ? a : b))
  // Abhaken mit kurzer Animation, bevor die Zeile umsortiert wird (D-044)
  const [pending, setPending] = useState<boolean | null>(null)
  const shownChecked = pending ?? item.checked
  const rowRef = useRef<HTMLDivElement>(null)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [override, setOverride] = useState(item.localOverride ?? '')
  // Eigene Landesbegriffe gibt es nur mit dem Community-Modul (D-027)
  const override_ = FEATURES.community ? item.localOverride : null
  const local = override_ || nameIn(item.conceptId, target)
  // Gross: der Artikel in der Sprache des Betrachters (sonst wie eingegeben). Klein: Landessprache.
  const own = (item.lang !== viewer && nameIn(item.conceptId, viewer)) || item.text
  const hint = item.conceptId ? (HINTS[item.conceptId]?.[viewer] ?? HINTS[item.conceptId]?.en) : undefined

  return (
    <div
      ref={rowRef}
      data-item-id={item.id}
      data-stamp={stamp}
      className={`item ${shownChecked ? 'checked' : ''} ${pending !== null ? 'just-toggled' : ''}`}
    >
      <button
        className="check"
        aria-label={item.checked ? t('markOpen') : t('check')}
        onClick={() => {
          if (pending !== null) return
          const next = !item.checked
          onLocalChange(item.id)
          // Erst Häkchen und Durchstreichen zeigen, dann rutscht die Zeile an ihren neuen Platz (D-044)
          setPending(next)
          if (next) navigator.vibrate?.(12)
          window.setTimeout(
            () => {
              // Beim Abhaken wird „Ich hole das“ zurückgesetzt (D-031); bei zusammengefassten Zeilen alle Einträge
              for (const e of entries) void store.updateItem(e.id, { checked: next, ...(e.claimedBy ? { claimedBy: null } : {}) })
              setPending(null)
            },
            reducedMotion() ? 0 : 380,
          )
        }}
      >
        {shownChecked && <Check size={18} strokeWidth={3} />}
      </button>
      <div className="body">
        <div className="main">
          {qty && <span className="qty">{formatQty(qty)}</span>}
          <span className="txt">{own}</span>
        </div>
        <div className="orig">
          {local ? (
            shopMode ? (
              // Antippen → Zeigen-Karte fürs Personal, nur in der Ladenansicht (D-032)
              <button className="local term-btn" title={t('showStaff')} onClick={() => setShowCard(true)}>
                <span className="flag">{COUNTRY_BY_CODE.get(country)?.flag}</span> {local}
              </button>
            ) : !FEATURES.community ? (
              <span className="local">
                <span className="flag">{COUNTRY_BY_CODE.get(country)?.flag}</span> {local}
              </span>
            ) : (
              // Antippen → Begriff korrigieren (gilt für die ganze Liste, wird als Vorschlag gesammelt)
              <button
                className="local term-btn"
                title={t('correctTerm')}
                onClick={() => {
                  setOverride(local)
                  setEditing(true)
                }}
              >
                <span className="flag">{COUNTRY_BY_CODE.get(country)?.flag}</span> {local}
              </button>
            )
          ) : (
            <span className="missing">{t('noTranslation')}</span>
          )}
          {!shopMode && <span className="muted"> · {author}</span>}
          {group && (
            <button className="link entries-btn" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {t('entries', { n: group.length })}
            </button>
          )}
          {claimedBy && !item.checked && (
            <span className="claim"> · {claimedBy === me ? t('claimedByMe') : t('claimedBy', { name: claimedBy })}</span>
          )}
        </div>
        {FEATURES.community && !local && !shopMode && !editing && (
          <button className="link" onClick={() => setEditing(true)}>
            {t('enterLocalTerm')}
          </button>
        )}
        {editing && (
          <form
            className="override"
            onSubmit={(e) => {
              e.preventDefault()
              void import('./features/community').then((m) =>
                m.correctTerm(store, item, override, { targetLang: target, country, oldTerm: local }),
              )
              setEditing(false)
            }}
          >
            <input value={override} onChange={(e) => setOverride(e.target.value)} placeholder={t('localTermPlaceholder')} autoFocus />
            <button className="primary small">OK</button>
            <button type="button" className="ghost small" aria-label={t('cancel')} onClick={() => setEditing(false)}>
              <X size={16} />
            </button>
          </form>
        )}
        {editing && (
          <p className="muted small-text correction-hint">{t('correctionHint')}</p>
        )}
        {group && expanded && (
          <ul className="entries">
            {group.map((e) => (
              <li key={e.id}>
                <span>
                  {e.qty ? formatQty(e.qty) : '1x'} · {e.author}
                </span>
                <button
                  className="ghost small"
                  aria-label={t('delete')}
                  onClick={() => {
                    onLocalChange(e.id)
                    void store.updateItem(e.id, { deleted: true })
                    onDeleted([e.id], own)
                  }}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {shopMode && showHint && hint && !item.checked && <div className="hint">{hint}</div>}
        {shopMode && showPhotos && local && (
          <PhotoStrip country={country} conceptId={item.conceptId} term={local} store={shopTag} storeName={shopName} />
        )}
      </div>
      {shopMode && hint && !item.checked && (
        <button className={`ghost small ${showHint ? 'active' : ''}`} aria-label={t('tip')} onClick={() => setShowHint(!showHint)}>
          <Lightbulb size={18} />
        </button>
      )}
      {shopMode && local && !item.checked && shopTag && hasPhotos(item.conceptId, override_) && (
        <button
          className={`ghost small ${showPhotos ? 'active' : ''}`}
          aria-label={t('photos')}
          onClick={() => setShowPhotos(!showPhotos)}
        >
          <Camera size={18} />
        </button>
      )}
      {shopMode && !item.checked && (
        // „Ich hole das“ (D-031), nur in der Ladenansicht: antippen übernimmt den Artikel, nochmals antippen gibt ihn frei
        <button
          className={`ghost small ${claimedBy === me ? 'active' : ''}`}
          aria-label={claimedBy === me ? t('unclaim') : t('claim')}
          title={claimedBy === me ? t('unclaim') : t('claim')}
          onClick={() => {
            onLocalChange(item.id)
            for (const e of entries) void store.updateItem(e.id, { claimedBy: claimedBy === me ? null : me })
          }}
        >
          <Hand size={18} />
        </button>
      )}
      {!shopMode && (
        <button className="ghost small" aria-label={t('delete')} onClick={() => {
          onLocalChange(item.id)
          void slideOut(rowRef.current ? [rowRef.current] : []).then(() => {
            for (const e of entries) void store.updateItem(e.id, { deleted: true })
            onDeleted(ids, own)
          })
        }}>
          <X size={18} />
        </button>
      )}
      {showCard && local && (
        <ShowCard term={local} qty={item.qty} own={own} target={target} onClose={() => setShowCard(false)} />
      )}
    </div>
  )
}

/** Zeigen-Karte (D-032): Artikel bildschirmfüllend in der Landessprache, zum Vorzeigen beim Personal */
function ShowCard({ term, qty, own, target, onClose }: { term: string; qty: string | null; own: string; target: Lang; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="showcard" role="dialog" aria-modal="true" onClick={onClose}>
      <p className="showcard-ask" lang={target}>{WHERE_IS[target]}</p>
      <p className="showcard-term" lang={target}>
        {qty && <span className="showcard-qty">{formatQty(qty)} </span>}
        {term}
      </p>
      <p className="showcard-thanks" lang={target}>{THANKS[target]}</p>
      <p className="showcard-own">{own}</p>
      <button className="ghost showcard-close" onClick={onClose} aria-label={t('close')}>
        <X size={28} />
      </button>
    </div>
  )
}

// Wartezeiten zwischen automatischen neuen Versuchen, wenn OpenStreetMap ausgelastet ist (danach alle 5 Min.)
const RETRY_S = [15, 30, 60, 120, 300]

function ShopBar({
  shop,
  onChoose,
  onSuggest,
  onArrived,
}: {
  shop: Shop | null
  onChoose: (s: Shop | null) => void
  onSuggest: (s: Shop | null) => void
  onArrived: (s: Shop) => void
}) {
  // Letztes Ergebnis (bis 12 h) sofort zeigen, geprüft wird im Hintergrund (D-033)
  const [state, setState] = useState<{
    loading?: boolean
    shops?: Shop[]
    inside?: boolean
    error?: string
    permission?: boolean
    help?: boolean
    retryIn?: number
    more?: boolean
    dismissed?: boolean
  }>(() => recentSuggestion() ?? {})
  const [attempt, setAttempt] = useState(0)

  const lastCheck = useRef(0)

  /** manual: „Neu suchen“ – immer neue Anfrage. Sonst still im Hintergrund, neue Anfrage nur nach Ortswechsel. */
  async function detect(manual = false) {
    lastCheck.current = Date.now()
    if (manual) setAttempt(0)
    // Ohne bisheriges Ergebnis „Suche …“ zeigen, sonst bleibt der bisherige Laden ruhig stehen
    setState((s) => ({ ...s, loading: manual || !s.shops, more: manual ? s.more : false }))
    try {
      const result = await findNearbyShops(manual)
      setAttempt(0)
      setState((s) => ({ shops: result.shops, inside: result.inside, more: manual ? s.more : false, dismissed: result.fresh ? false : s.dismissed }))
      const here = isInsideSupermarket(result)
      if (here) onArrived(here)
    } catch (e) {
      const err = e instanceof NearbyError ? e : new NearbyError(t('errShopUnknown'), true)
      // Hintergrund-Prüfung fehlgeschlagen, aber ein Ergebnis ist da: einfach weiter anzeigen
      if (!manual && stateRef.current.shops?.length) {
        setState((s) => ({ ...s, loading: false }))
        return
      }
      if (err.retry) {
        const wait = RETRY_S[Math.min(attempt, RETRY_S.length - 1)]
        setAttempt((a) => a + 1)
        setState({ error: err.message, retryIn: wait })
      } else setState({ error: err.message, permission: err.permission })
    }
  }

  // Den angezeigten Vorschlag nach oben melden (für die Fotos)
  const suggestion = !shop && !state.dismissed ? (state.shops?.[0] ?? null) : null
  useEffect(() => {
    onSuggest(suggestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.id])

  const stateRef = useRef(state)
  stateRef.current = state

  /** Gewählter Laden: verwerfen, wenn man sich weiter als LEFT_SHOP_M entfernt hat (D-033) */
  async function checkLeft() {
    if (!shop || shop.lat == null || shop.lon == null) return
    lastCheck.current = Date.now()
    try {
      const { latitude, longitude, accuracy } = (await getPosition()).coords
      if (meters(latitude, longitude, shop.lat, shop.lon) > Math.max(LEFT_SHOP_M, accuracy)) onChoose(null)
    } catch {
      /* ohne Standort bleibt der Laden */
    }
  }

  // Beim Öffnen der Liste still prüfen: ohne gewählten Laden den Vorschlag, mit Laden ob man noch dort ist
  useEffect(() => {
    if (shop) void checkLeft()
    else void detect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop])

  // Zurück in der App (aus dem Hintergrund): erneut still prüfen, höchstens alle 2 Minuten
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck.current < 120_000) return
      if (shop) void checkLeft()
      else void detect()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop])

  // Countdown und automatischer neuer Versuch bei überlastetem Server
  useEffect(() => {
    if (state.retryIn == null || shop) return
    if (state.retryIn <= 0) {
      void detect()
      return
    }
    const t = window.setTimeout(() => setState((s) => (s.retryIn != null ? { ...s, retryIn: s.retryIn - 1 } : s)), 1000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.retryIn, shop])

  const current = shop ?? (state.dismissed ? null : (state.shops?.[0] ?? null))
  const others = (state.shops ?? []).filter((x) => x.id !== current?.id).slice(0, 5)

  if (state.loading && !current)
    return (
      <div className="shopline muted">
        <MapPin size={15} /> {t('searchingShop')}
      </div>
    )

  if (state.permission && !current)
    return (
      <div className="shopline muted">
        <MapPin size={15} />
        <button className="link" onClick={() => void detect(true)}>
          {t('allowLocation')}
        </button>
        <button className="link" onClick={() => setState((st) => ({ ...st, help: !st.help }))}>
          {t('help')}
        </button>
        {state.help && (
          <div className="perm-help">
            <strong>{t('helpIphone')}</strong>
            <ol>
              <li>{t('help1')}</li>
              <li>{t('help2')}</li>
              <li>{t('help3')}</li>
            </ol>
          </div>
        )}
      </div>
    )

  if (state.error && !current)
    return (
      <div className="shopline muted" title={state.error}>
        <MapPin size={15} /> {state.error}
        {state.retryIn != null && <span>{t('retryIn', { s: state.retryIn })}</span>}
        <button className="link" onClick={() => void detect(true)}>
          {t('now')}
        </button>
      </div>
    )

  if (!current)
    return (
      <div className="shopline muted">
        <MapPin size={15} />
        {state.shops ? t('noSupermarketWithin', { dist: formatDistance(FAR_RADIUS_M) }) : t('noShop')}
        <button className="icon-btn" aria-label={t('searchShop')} onClick={() => void detect(true)}>
          <Pencil size={14} />
        </button>
      </div>
    )

  // Ein Laden (gewählt oder vorgeschlagen) – nur ein Ändern-Symbol, Alternativen erst nach Antippen
  return (
    <div className="shopline">
      <span>
        <StoreIcon size={15} /> {current.name}
        {!shop && <span className="muted"> {formatDistance(current.distance)}</span>}
      </span>
      <button
        className={`icon-btn ${state.more ? 'active' : ''}`}
        aria-label={t('changeShop')}
        aria-expanded={!!state.more}
        onClick={() => {
          if (!state.more && !state.shops) void detect(true)
          setState((st) => ({ ...st, more: !st.more }))
        }}
      >
        <Pencil size={14} />
      </button>
      {state.more && (
        <div className="shop-alts">
          {state.loading && <span className="muted small-text">{t('searching')}</span>}
          {others.map((x) => (
            <button
              key={x.id}
              className="chip"
              onClick={() => {
                onChoose(x)
                setState((st) => ({ ...st, more: false }))
              }}
            >
              {x.name} <span className="muted">{formatDistance(x.distance)}</span>
            </button>
          ))}
          <button
            className="chip"
            onClick={() => {
              onChoose(null)
              void detect(true).then(() => setState((st) => ({ ...st, more: true })))
            }}
          >
            <LocateFixed size={13} /> {t('searchAgain')}
          </button>
        </div>
      )}
    </div>
  )
}

function PhotoStrip({
  country,
  conceptId,
  term,
  store,
  storeName,
}: {
  country: string
  conceptId: string | null
  term: string
  store?: string
  storeName?: string
}) {
  const [state, setState] = useState<{ photos?: Photo[]; fromStore?: boolean; error?: string; retryIn?: number }>({})
  const [attempt, setAttempt] = useState(0) // zählt Versuche; ändert sich → neue Suche
  const [failures, setFailures] = useState(0)

  useEffect(() => {
    setFailures(0)
    setAttempt(0)
  }, [country, conceptId, term, store])

  useEffect(() => {
    let alive = true
    setState({})
    loadPhotos({ country, conceptId, term, store }).then(
      (r) => {
        if (!alive) return
        setFailures(0)
        setState({ photos: r.photos, fromStore: r.fromStore })
      },
      (e) => {
        if (!alive) return
        const err = e instanceof PhotoError ? e : new PhotoError(t('errPhotos'), true)
        if (err.retry) {
          // gleiche Wartezeiten wie bei der Ladensuche: 15 s, 30 s, 1, 2, dann 5 Min.
          setState({ error: err.message, retryIn: RETRY_S[Math.min(failures, RETRY_S.length - 1)] })
          setFailures((f) => f + 1)
        } else setState({ error: err.message })
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, conceptId, term, store, attempt])

  // Countdown bis zum automatischen neuen Versuch
  useEffect(() => {
    if (state.retryIn == null) return
    if (state.retryIn <= 0) {
      setAttempt((a) => a + 1)
      return
    }
    const t = window.setTimeout(() => setState((s) => (s.retryIn != null ? { ...s, retryIn: s.retryIn - 1 } : s)), 1000)
    return () => window.clearTimeout(t)
  }, [state.retryIn])

  if (state.error)
    return (
      <div className="photos-note">
        {state.error}
        {state.retryIn != null && ` ${t('retryIn', { s: state.retryIn })} · `}
        {state.retryIn != null && (
          <button className="link" onClick={() => setAttempt((a) => a + 1)}>
            {t('now')}
          </button>
        )}
      </div>
    )
  if (!state.photos) return <div className="photos-note">{t('photosSearching')}</div>
  if (state.photos.length === 0) return <div className="photos-note">{t('noPhotos')}</div>
  return (
    <div className="photos">
      <div className="photo-row">
        {state.photos.map((p) => (
          <a key={p.code} href={p.url} target="_blank" rel="noreferrer" className="photo" title={`${p.name} ${p.brand}`.trim()}>
            <img src={p.image} alt={p.name || term} loading="lazy" />
            <span>{p.name || p.brand}</span>
          </a>
        ))}
      </div>
      <div className="photos-credit">
        {store && `${state.fromStore ? t('photosFromShop', { shop: storeName ?? '' }) : t('photosNotFromShop', { shop: storeName ?? '' })} · `}
        {t('photosCredit')}: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>, CC BY-SA
      </div>
    </div>
  )
}

/** "2" → "2x", "500 g" bleibt "500 g" */
const DAY_MS = 24 * 60 * 60 * 1000

/** Letzter Ladenbesuch pro Liste (D-043), nur auf diesem Gerät, höchstens 12 Stunden gültig */
type Visit = { lat: number; lon: number; at: number }
function readVisit(listId: string): Visit | null {
  try {
    const v = JSON.parse(localStorage.getItem(`rl:visit:${listId}`) ?? 'null') as Visit | null
    return v && Date.now() - v.at < 12 * 60 * 60 * 1000 ? v : null
  } catch {
    return null
  }
}
function saveVisit(listId: string, v: Visit | null) {
  try {
    if (v) localStorage.setItem(`rl:visit:${listId}`, JSON.stringify(v))
    else localStorage.removeItem(`rl:visit:${listId}`)
  } catch {
    /* egal */
  }
}

/** Gleicher Artikel = gleicher Wörterbuch-Eintrag, sonst gleicher Text (D-045) */
function dupKey(i: Item): string {
  return i.conceptId ?? normalize(i.text)
}

/** „Rückgängig“ beim automatischen Reiseland (D-040): für diese Liste und dieses Land nicht mehr automatisch wechseln */
function countryChangeDeclined(listId: string, code: string): boolean {
  try {
    return localStorage.getItem(`rl:nocountry:${listId}:${code}`) === '1'
  } catch {
    return false
  }
}
function declineCountryChange(listId: string, code: string) {
  try {
    localStorage.setItem(`rl:nocountry:${listId}:${code}`, '1')
  } catch {
    /* egal */
  }
}

/** „heute 10:58“, „gestern 18:20“ oder „3.11. 09:15“ (D-036) */
function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const lang = uiLang()
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(new Date()) - day(d)) / 86_400_000)
  if (diff === 0) return `${t('today')} ${time}`
  if (diff === 1) return `${t('yesterday')} ${time}`
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return `${d.toLocaleDateString(lang, opts)} ${time}`
}

function formatQty(qty: string): string {
  return /^\d+(?:[.,]\d+)?$/.test(qty.trim()) ? `${qty.trim()}x` : qty
}

function MembersSheet({ store, profile, onClose }: { store: ListStore; profile: Profile; onClose: () => void }) {
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

function EditSheet({
  name,
  country,
  autoClear,
  onSave,
  onClose,
}: {
  name: string
  country: string
  autoClear: boolean
  onSave: (name: string, country: string, autoClear: boolean) => void
  onClose: () => void
}) {
  const [n, setN] = useState(name)
  const [c, setC] = useState(country)
  const [ac, setAc] = useState(autoClear)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(n.trim() || name, c, ac)
        }}
      >
        <h2>{t('editListTitle')}</h2>
        <label>
          {t('name')}
          <input value={n} onChange={(e) => setN(e.target.value)} />
        </label>
        <label>
          {t('travelCountry')}
          <select value={c} onChange={(e) => setC(e.target.value)}>
            {COUNTRIES.map((x) => (
              <option key={x.code} value={x.code}>
                {x.flag} {countryName(x.code)} – {LANG_LABEL[x.lang]}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small-text">{t('countryChangeHint')}</p>
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

function ShareSheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const url = listUrl(id)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr, () => setQr(''))
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
