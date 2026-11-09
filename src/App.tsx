import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  ArrowLeft,
  Shield,
  Users,
  CloudAlert,
  CloudOff,
  Camera,
  Check,
  Lightbulb,
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
import { COUNTRIES, COUNTRY_BY_CODE, LANG_LABEL } from './data/countries'
import { categoryLabel, countryName, setUiLang, t } from './i18n'
import Privacy from './Privacy'
import { findConcept, nameIn, splitQuantity, suggest } from './lib/translate'
import { autoShopModeBlocked, blockAutoShopMode, FAR_RADIUS_M, findNearbyShops, isInsideSupermarket, formatDistance, getChosenShop, NearbyError, recentSuggestion, setChosenShop, shopTag, type Shop } from './lib/nearby'
import { detectCountry } from './lib/country'
import { hasPhotos, loadPhotos, PhotoError, type Photo } from './lib/photos'
import { ListStore, forgetList, knownLists, lastSyncError, profileStore, supabase, type Item, type Profile, type SyncState } from './lib/store'

// ---------- Routing über den Hash (funktioniert auf GitHub Pages ohne Server) ----------

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

function ProfileSetup({ onDone }: { onDone: (p: Profile) => void }) {
  const existing = profileStore.get()
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
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onDone({ name: name.trim(), lang })
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
  const [country, setCountry] = useState('ES')
  const [detected, setDetected] = useState<string | null>(null)
  const touched = useRef(false)
  const lists = knownLists()

  // Bist du schon im Ausland, wird das aktuelle Land vorgeschlagen (änderbar)
  useEffect(() => {
    let alive = true
    void detectCountry().then((code) => {
      if (!alive || !code) return
      setDetected(code)
      if (!touched.current) setCountry(code)
    })
    return () => {
      alive = false
    }
  }, [])

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
          {profile.name} · {LANG_LABEL[profile.lang]}
        </button>
      </header>

      <form className="card stack" onSubmit={create}>
        <h2>{t('newList')}</h2>
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

      {lists.length > 0 && (
        <section className="stack">
          <h2>{t('yourLists')}</h2>
          {lists.map((l) => {
            const c = COUNTRY_BY_CODE.get(l.country)
            return (
              <div key={l.id} className="card row-between">
                <a href={`#/l/${l.id}`} className="list-link">
                  <span className="flag">{c?.flag}</span> {l.name}
                </a>
                <button
                  className="ghost small"
                  aria-label={t('removeList')}
                  onClick={() => {
                    forgetList(l.id)
                    go('/')
                    location.reload()
                  }}
                >
                  <X size={16} />
                </button>
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
  }, [store])
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
  const [input, setInput] = useState('')
  const [shopMode, setShopModeState] = useState(false)
  const setShopMode = (v: boolean) => {
    if (!v) setAutoShop(null)
    setShopModeState(v)
  }
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
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

  const list = store.list
  const country = list ? COUNTRY_BY_CODE.get(list.country) : undefined
  const target: Lang = country?.lang ?? 'en'
  const items = store.items.filter((i) => !i.deleted)
  const suggestions = suggest(input, profile.lang)

  function add(text: string, conceptId?: string) {
    const { qty, text: clean } = splitQuantity(text)
    if (!clean) return
    void store.addItem({
      text: clean,
      qty,
      lang: profile.lang,
      conceptId: conceptId ?? findConcept(clean, profile.lang),
      author: profile.name,
    })
    setInput('')
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
  const groups = new Map<Category | 'sonstiges', Item[]>()
  for (const item of open) {
    const cat = (item.conceptId && BY_ID.get(item.conceptId)?.category) || 'sonstiges'
    groups.set(cat, [...(groups.get(cat) ?? []), item])
  }
  const order: (Category | 'sonstiges')[] = [...CATEGORY_ORDER, 'sonstiges']

  return (
    <main className={`page ${shopMode ? 'shop' : ''}`}>
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
                    forgetList(id)
                    go('/')
                  }}
                >
                  <Trash2 size={18} /> {t('removeFromDevice')}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

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
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
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
            <h3>{cat === 'sonstiges' ? t('other') : categoryLabel(cat)}</h3>
            {groups.get(cat)!.map((item) => (
              <ItemRow key={item.id} item={item} store={store} target={target} country={list.country} shopTag={photoShop ? shopTag(photoShop) : undefined} shopName={photoShop?.brand ?? photoShop?.name} viewer={profile.lang} shopMode={shopMode} />
            ))}
          </section>
        ))}

      {done.length > 0 && (
        <section className="group done">
          <h3>{t('inCart')}</h3>
          {done.map((item) => (
            <ItemRow key={item.id} item={item} store={store} target={target} country={list.country} shopTag={photoShop ? shopTag(photoShop) : undefined} shopName={photoShop?.brand ?? photoShop?.name} viewer={profile.lang} shopMode={shopMode} />
          ))}
        </section>
      )}

      {showShare && <ShareSheet id={id} name={list.name} onClose={() => setShowShare(false)} />}
      {showMembers && <MembersSheet store={store} profile={profile} onClose={() => setShowMembers(false)} />}
      {showEdit && (
        <EditSheet
          name={list.name}
          country={list.country}
          onSave={(name, country) => {
            void store.updateList({ name, country })
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
}: {
  item: Item
  store: ListStore
  target: Lang
  country: string
  shopTag?: string
  shopName?: string
  viewer: Lang
  shopMode: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [override, setOverride] = useState(item.localOverride ?? '')
  const local = item.localOverride || nameIn(item.conceptId, target)
  // Gross: der Artikel in der Sprache des Betrachters (sonst wie eingegeben). Klein: Landessprache.
  const own = (item.lang !== viewer && nameIn(item.conceptId, viewer)) || item.text
  const hint = item.conceptId ? (HINTS[item.conceptId]?.[viewer] ?? HINTS[item.conceptId]?.en) : undefined

  return (
    <div className={`item ${item.checked ? 'checked' : ''}`}>
      <button
        className="check"
        aria-label={item.checked ? t('markOpen') : t('check')}
        onClick={() => void store.updateItem(item.id, { checked: !item.checked })}
      >
        {item.checked && <Check size={18} strokeWidth={3} />}
      </button>
      <div className="body">
        <div className="main">
          {item.qty && <span className="qty">{formatQty(item.qty)}</span>}
          {own}
        </div>
        <div className="orig">
          {local ? (
            <span className="local">
              <span className="flag">{COUNTRY_BY_CODE.get(country)?.flag}</span> {local}
            </span>
          ) : (
            <span className="missing">{t('noTranslation')}</span>
          )}
          {!shopMode && <span className="muted"> · {item.author}</span>}
        </div>
        {!local && !shopMode && !editing && (
          <button className="link" onClick={() => setEditing(true)}>
            {t('enterLocalTerm')}
          </button>
        )}
        {editing && (
          <form
            className="override"
            onSubmit={(e) => {
              e.preventDefault()
              void store.updateItem(item.id, { localOverride: override.trim() || null })
              setEditing(false)
            }}
          >
            <input value={override} onChange={(e) => setOverride(e.target.value)} placeholder={t('localTermPlaceholder')} autoFocus />
            <button className="primary small">OK</button>
          </form>
        )}
        {shopMode && showHint && hint && !item.checked && <div className="hint">{hint}</div>}
        {showPhotos && local && (
          <PhotoStrip country={country} conceptId={item.localOverride ? null : item.conceptId} term={local} store={shopTag} storeName={shopName} />
        )}
      </div>
      {shopMode && hint && !item.checked && (
        <button className={`ghost small ${showHint ? 'active' : ''}`} aria-label={t('tip')} onClick={() => setShowHint(!showHint)}>
          <Lightbulb size={18} />
        </button>
      )}
      {local && !item.checked && shopTag && hasPhotos(item.localOverride ? null : item.conceptId, item.localOverride) && (
        <button
          className={`ghost small ${showPhotos ? 'active' : ''}`}
          aria-label={t('photos')}
          onClick={() => setShowPhotos(!showPhotos)}
        >
          <Camera size={18} />
        </button>
      )}
      {!shopMode && (
        <button className="ghost small" aria-label={t('delete')} onClick={() => void store.updateItem(item.id, { deleted: true })}>
          <X size={18} />
        </button>
      )}
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
  // Nach einem Neuladen den letzten Vorschlag (bis 30 Min.) direkt wieder zeigen
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

  async function detect(manual = false) {
    if (manual) setAttempt(0)
    setState((s) => ({ ...s, loading: true, more: false })) // bisherigen Laden während der Suche weiter zeigen
    try {
      const result = await findNearbyShops()
      setAttempt(0)
      setState({ shops: result.shops, inside: result.inside })
      const here = isInsideSupermarket(result)
      if (here) onArrived(here)
    } catch (e) {
      const err = e instanceof NearbyError ? e : new NearbyError(t('errShopUnknown'), true)
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

  // Automatisch suchen, sobald die Liste offen ist und noch kein Laden gewählt/vorgeschlagen ist
  // (auch wenn noch ein Vorschlag von vorhin da ist – man könnte inzwischen woanders sein)
  useEffect(() => {
    if (shop) return
    void detect()
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
  onSave,
  onClose,
}: {
  name: string
  country: string
  onSave: (name: string, country: string) => void
  onClose: () => void
}) {
  const [n, setN] = useState(name)
  const [c, setC] = useState(country)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(n.trim() || name, c)
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
  const url = `${location.origin}${location.pathname}#/l/${id}`
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
