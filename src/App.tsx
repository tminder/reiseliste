import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import QRCode from 'qrcode'
import { CATEGORY_LABEL, CATEGORY_ORDER, BY_ID, HINTS, LANGS, type Category, type Lang } from './data/dictionary'
import { COUNTRIES, COUNTRY_BY_CODE, LANG_LABEL } from './data/countries'
import { findConcept, nameIn, splitQuantity, suggest } from './lib/translate'
import { FAR_RADIUS_M, findNearbyShops, formatDistance, getChosenShop, NearbyError, recentSuggestion, setChosenShop, shopTag, type Shop } from './lib/nearby'
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
  const m = hash.match(/^#\/l\/([0-9a-f-]{36})/i)
  return m ? { page: 'list' as const, id: m[1] } : { page: 'home' as const }
}

const go = (path: string) => (location.hash = path)

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(profileStore.get())
  const route = useRoute()

  if (!profile)
    return (
      <ProfileSetup
        onDone={(p) => {
          profileStore.set(p)
          setProfile(p)
        }}
      />
    )
  return route.page === 'list' ? (
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
  const [lang, setLang] = useState<Lang>(existing?.lang ?? guessLang())
  return (
    <main className="page narrow">
      <h1 className="brand">🛒 Reiseliste</h1>
      <p className="lead">Du schreibst in deiner Sprache – im Laden siehst du jeden Artikel in der Landessprache.</p>
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onDone({ name: name.trim(), lang })
        }}
      >
        <label>
          Dein Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Tobias" autoFocus />
        </label>
        <label>
          In welcher Sprache schreibst du?
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={!name.trim()}>
          Los geht's
        </button>
      </form>
    </main>
  )
}

// ---------- Startseite ----------

function Home({ profile, onEditProfile }: { profile: Profile; onEditProfile: () => void }) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('ES')
  const lists = knownLists()

  function create(e: FormEvent) {
    e.preventDefault()
    const id = crypto.randomUUID()
    const store = new ListStore(id)
    void store.create(name.trim() || `Einkauf ${COUNTRY_BY_CODE.get(country)?.name ?? ''}`, country)
    go(`/l/${id}`)
  }

  return (
    <main className="page narrow">
      <header className="topbar">
        <h1 className="brand">🛒 Reiseliste</h1>
        <button className="ghost small" onClick={onEditProfile}>
          {profile.name} · {LANG_LABEL[profile.lang]}
        </button>
      </header>

      <form className="card stack" onSubmit={create}>
        <h2>Neue Liste</h2>
        <label>
          Reiseland
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} – {LANG_LABEL[c.lang]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Ferienwohnung Lissabon" />
        </label>
        <button className="primary">Liste erstellen</button>
      </form>

      {lists.length > 0 && (
        <section className="stack">
          <h2>Deine Listen</h2>
          {lists.map((l) => {
            const c = COUNTRY_BY_CODE.get(l.country)
            return (
              <div key={l.id} className="card row-between">
                <a href={`#/l/${l.id}`} className="list-link">
                  <span className="flag">{c?.flag}</span> {l.name}
                </a>
                <button
                  className="ghost small"
                  aria-label="Liste entfernen"
                  onClick={() => {
                    forgetList(l.id)
                    go('/')
                    location.reload()
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </section>
      )}
      {!supabase && (
        <p className="note">
          Demo-Modus: Supabase ist nicht verbunden, Listen bleiben auf diesem Gerät. Siehe README, um Teilen in Echtzeit zu
          aktivieren.
        </p>
      )}
    </main>
  )
}

// ---------- Liste ----------

function useStore(id: string) {
  const store = useMemo(() => new ListStore(id), [id])
  useEffect(() => {
    void store.start()
    return () => store.stop()
  }, [store])
  const version = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => `${store.items.length}|${store.items.map((i) => i.updatedAt).join()}|${store.list?.updatedAt}|${store.sync}|${store.notFound}`,
  )
  return { store, version }
}

const SYNC_LABEL: Record<SyncState, string> = {
  'local-only': 'Nur auf diesem Gerät',
  offline: 'Offline – wird später synchronisiert',
  syncing: 'Synchronisiere …',
  synced: 'Synchronisiert',
  error: 'Sync-Fehler – neuer Versuch bei Verbindung',
}

function ListView({ id, profile }: { id: string; profile: Profile }) {
  const { store } = useStore(id)
  const [input, setInput] = useState('')
  const [shopMode, setShopMode] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shop, setShop] = useState<Shop | null>(() => getChosenShop(id))
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
          ← Listen
        </a>
        <div className="card">
          {store.notFound
            ? 'Diese Liste gibt es nicht (mehr).'
            : supabase
              ? 'Liste wird geladen …'
              : 'Diese Liste ist auf diesem Gerät nicht gespeichert. Zum Teilen muss Supabase verbunden sein (siehe README).'}
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
        <a href="#/" className="back">
          ←
        </a>
        <div className="title">
          <h1>{list.name}</h1>
          <span className="sub">
            {country?.flag} {country?.name} · {LANG_LABEL[target]}
          </span>
          <ShopBar shop={shop} onChoose={chooseShop} />
        </div>
        <button className="ghost" onClick={() => setShowShare(true)}>
          Teilen
        </button>
      </header>

      <div className={`sync sync-${store.sync}`}>
        {SYNC_LABEL[store.sync]}
        {store.sync === 'error' && lastSyncError && <div className="sync-detail">{lastSyncError}</div>}
      </div>

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
            placeholder={`Artikel auf ${LANG_LABEL[profile.lang]}, z. B. „2 Milch“`}
            aria-label="Artikel hinzufügen"
          />
          <button className="primary" disabled={!input.trim()}>
            +
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
          {shopMode ? 'Bearbeiten' : '🛒 Ladenansicht'}
        </button>
        <span className="muted">
          {open.length} offen · {done.length} erledigt
        </span>
      </div>

      {items.length === 0 && <p className="empty">Noch leer. Tippe oben einen Artikel in deiner Sprache ein.</p>}

      {order
        .filter((c) => groups.has(c))
        .map((cat) => (
          <section key={cat} className="group">
            <h3>{cat === 'sonstiges' ? 'Sonstiges' : CATEGORY_LABEL[cat]}</h3>
            {groups.get(cat)!.map((item) => (
              <ItemRow key={item.id} item={item} store={store} target={target} country={list.country} shopTag={shop ? shopTag(shop) : undefined} shopName={shop?.brand ?? shop?.name} viewer={profile.lang} shopMode={shopMode} />
            ))}
          </section>
        ))}

      {done.length > 0 && (
        <section className="group done">
          <h3>Im Wagen</h3>
          {done.map((item) => (
            <ItemRow key={item.id} item={item} store={store} target={target} country={list.country} shopTag={shop ? shopTag(shop) : undefined} shopName={shop?.brand ?? shop?.name} viewer={profile.lang} shopMode={shopMode} />
          ))}
        </section>
      )}

      {showShare && <ShareSheet id={id} name={list.name} onClose={() => setShowShare(false)} />}
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
  const [override, setOverride] = useState(item.localOverride ?? '')
  const local = item.localOverride || nameIn(item.conceptId, target)
  // Gross: der Artikel in der Sprache des Betrachters (sonst wie eingegeben). Klein: Landessprache.
  const own = (item.lang !== viewer && nameIn(item.conceptId, viewer)) || item.text
  const hint = item.conceptId && viewer === 'de' ? HINTS[item.conceptId] : undefined

  return (
    <div className={`item ${item.checked ? 'checked' : ''}`}>
      <button
        className="check"
        aria-label={item.checked ? 'Als offen markieren' : 'Abhaken'}
        onClick={() => void store.updateItem(item.id, { checked: !item.checked })}
      >
        {item.checked ? '✓' : ''}
      </button>
      <div className="body">
        <div className="main">
          {item.qty && <span className="qty">{formatQty(item.qty)}</span>}
          {own}
        </div>
        <div className="orig">
          {local ? <span className="local">{local}</span> : <span className="missing">keine Übersetzung</span>}
          {!shopMode && <span className="muted"> · {item.author}</span>}
        </div>
        {!local && !shopMode && !editing && (
          <button className="link" onClick={() => setEditing(true)}>
            Landesbegriff selbst eintragen
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
            <input value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Begriff in Landessprache" autoFocus />
            <button className="primary small">OK</button>
          </form>
        )}
        {hint && !item.checked && <div className="hint">💡 {hint}</div>}
        {showPhotos && local && (
          <PhotoStrip country={country} conceptId={item.localOverride ? null : item.conceptId} term={local} store={shopTag} storeName={shopName} />
        )}
      </div>
      {local && !item.checked && hasPhotos(item.localOverride ? null : item.conceptId, item.localOverride) && (
        <button
          className={`ghost small ${showPhotos ? 'active' : ''}`}
          aria-label="Produktfotos"
          onClick={() => setShowPhotos(!showPhotos)}
        >
          📷
        </button>
      )}
      {!shopMode && (
        <button className="ghost small" aria-label="Löschen" onClick={() => void store.updateItem(item.id, { deleted: true })}>
          ✕
        </button>
      )}
    </div>
  )
}

// Wartezeiten zwischen automatischen neuen Versuchen, wenn OpenStreetMap ausgelastet ist (danach alle 5 Min.)
const RETRY_S = [15, 30, 60, 120, 300]

function ShopBar({ shop, onChoose }: { shop: Shop | null; onChoose: (s: Shop | null) => void }) {
  // Nach einem Neuladen den letzten Vorschlag (bis 30 Min.) direkt wieder zeigen
  const [state, setState] = useState<{
    loading?: boolean
    shops?: Shop[]
    inside?: boolean
    error?: string
    retryIn?: number
    more?: boolean
    dismissed?: boolean
  }>(() => recentSuggestion() ?? {})
  const [attempt, setAttempt] = useState(0)

  async function detect(manual = false) {
    if (manual) setAttempt(0)
    setState((s) => ({ loading: true, error: s.error }))
    try {
      const { shops, inside } = await findNearbyShops()
      setAttempt(0)
      setState({ shops, inside })
    } catch (e) {
      const err = e instanceof NearbyError ? e : new NearbyError('Laden nicht erkannt.', true)
      if (err.retry) {
        const wait = RETRY_S[Math.min(attempt, RETRY_S.length - 1)]
        setAttempt((a) => a + 1)
        setState({ error: err.message, retryIn: wait })
      } else setState({ error: err.message })
    }
  }

  // Automatisch suchen, sobald die Liste offen ist und noch kein Laden gewählt/vorgeschlagen ist
  useEffect(() => {
    if (shop || state.shops) return
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

  // Gewählt: nur der Name, dezent
  if (shop)
    return (
      <div className="shopline">
        🏪 {shop.name}
        <button className="link" onClick={() => onChoose(null)}>
          ändern
        </button>
      </div>
    )

  if (state.loading) return <div className="shopline muted">📍 Suche Laden …</div>

  if (state.error)
    return (
      <div className="shopline muted" title={state.error}>
        📍 {state.error}
        {state.retryIn != null && <span>Neuer Versuch in {state.retryIn} s</span>}
        <button className="link" onClick={() => void detect(true)}>
          jetzt
        </button>
      </div>
    )

  if (state.shops && !state.dismissed) {
    const [first, ...rest] = state.shops
    if (!first)
      return (
        <div className="shopline muted">
          📍 Kein Supermarkt bis {formatDistance(FAR_RADIUS_M)}
          <button className="link" onClick={() => setState({ dismissed: true })}>
            ok
          </button>
        </div>
      )
    // Erst nur ein Vorschlag; weitere hinter „andere“
    return (
      <div className="shopline">
        <span>
          🏪 {state.inside ? '' : 'Nächster: '}
          <strong>{first.name}</strong>
          {state.inside ? '?' : ''} <span className="muted">{formatDistance(first.distance)}</span>
        </span>
        <button className="link strong" onClick={() => onChoose(first)}>
          {state.inside ? 'Ja' : 'Wählen'}
        </button>
        {rest.length > 0 && !state.more && (
          <button className="link" onClick={() => setState({ ...state, more: true })}>
            andere
          </button>
        )}
        <button className="link" aria-label="Ausblenden" onClick={() => setState({ dismissed: true })}>
          ✕
        </button>
        {state.more && (
          <div className="shop-alts">
            {rest.slice(0, 4).map((s) => (
              <button key={s.id} className="chip" onClick={() => onChoose(s)}>
                {s.name} <span className="muted">{formatDistance(s.distance)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Noch nichts gesucht (oder ausgeblendet): nur ein kleiner Link
  return (
    <div className="shopline">
      <button className="link" onClick={() => void detect(true)}>
        📍 Laden erkennen
      </button>
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
  const [state, setState] = useState<{ photos?: Photo[]; fromStore?: boolean; error?: string }>({})
  useEffect(() => {
    let alive = true
    setState({})
    loadPhotos({ country, conceptId, term, store }).then(
      (r) => alive && setState({ photos: r.photos, fromStore: r.fromStore }),
      (e) => alive && setState({ error: e instanceof PhotoError ? e.message : 'Fotos konnten nicht geladen werden.' }),
    )
    return () => {
      alive = false
    }
  }, [country, conceptId, term, store])

  if (state.error) return <div className="photos-note">{state.error}</div>
  if (!state.photos) return <div className="photos-note">Fotos werden geladen …</div>
  if (state.photos.length === 0) return <div className="photos-note">Keine passenden Fotos gefunden.</div>
  return (
    <div className="photos">
      <div className="photo-row">
        {state.photos.map((p) => (
          <a key={p.code} href={p.url} target="_blank" rel="noreferrer" className="photo" title={`${p.name} ${p.brand}`.trim()}>
            <img src={p.image} alt={p.name || term} loading="lazy" />
            <span>{p.brand || p.name}</span>
          </a>
        ))}
      </div>
      <div className="photos-credit">
        {store && (state.fromStore ? `Bei ${storeName} · ` : `Keine Treffer für ${storeName}, übliche Produkte im Land · `)}
        Fotos: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>, CC BY-SA
      </div>
    </div>
  )
}

/** "2" → "2x", "500 g" bleibt "500 g" */
function formatQty(qty: string): string {
  return /^\d+(?:[.,]\d+)?$/.test(qty.trim()) ? `${qty.trim()}x` : qty
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
        <h2>Liste teilen</h2>
        {!supabase && <p className="note">Demo-Modus: Ohne Supabase sehen andere die Liste nicht.</p>}
        {qr && <img src={qr} alt="QR-Code zur Liste" className="qr" />}
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
            {copied ? 'Kopiert ✓' : 'Link teilen'}
          </button>
          <button className="ghost" onClick={onClose}>
            Schliessen
          </button>
        </div>
      </div>
    </div>
  )
}
