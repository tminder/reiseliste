import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import QRCode from 'qrcode'
import { CATEGORY_LABEL, CATEGORY_ORDER, BY_ID, HINTS, LANGS, type Category, type Lang } from './data/dictionary'
import { COUNTRIES, COUNTRY_BY_CODE, LANG_LABEL } from './data/countries'
import { findConcept, nameIn, splitQuantity, suggest } from './lib/translate'
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
            {country?.flag} {country?.name} · Landessprache: {LANG_LABEL[target]}
          </span>
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
              <ItemRow key={item.id} item={item} store={store} target={target} viewer={profile.lang} shopMode={shopMode} />
            ))}
          </section>
        ))}

      {done.length > 0 && (
        <section className="group done">
          <h3>Im Wagen</h3>
          {done.map((item) => (
            <ItemRow key={item.id} item={item} store={store} target={target} viewer={profile.lang} shopMode={shopMode} />
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
  viewer,
  shopMode,
}: {
  item: Item
  store: ListStore
  target: Lang
  viewer: Lang
  shopMode: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [override, setOverride] = useState(item.localOverride ?? '')
  const local = item.localOverride || nameIn(item.conceptId, target)
  const inViewerLang = item.lang !== viewer ? nameIn(item.conceptId, viewer) : null
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
        {local ? (
          <div className="local">{local}</div>
        ) : (
          <div className="local missing">{item.text}</div>
        )}
        <div className="orig">
          {item.qty && <span className="qty">{item.qty}</span>}
          {item.text}
          {inViewerLang && <span className="muted"> · {inViewerLang}</span>}
          {!shopMode && <span className="muted"> · {item.author}</span>}
        </div>
        {!local && !shopMode && !editing && (
          <button className="link" onClick={() => setEditing(true)}>
            Keine Übersetzung – Landesbegriff selbst eintragen
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
      </div>
      {!shopMode && (
        <button className="ghost small" aria-label="Löschen" onClick={() => void store.updateItem(item.id, { deleted: true })}>
          ✕
        </button>
      )}
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
