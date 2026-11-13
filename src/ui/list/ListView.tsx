// Ansicht einer Liste: Eingabe, Artikel nach Abteilung, Laden, Menü, automatisches Reiseland
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Shield, Users, CloudAlert, CloudOff, Check, RotateCcw, MapPin, Menu, Plus, Settings, Share2, Trash2, UserRound, X } from 'lucide-react'
import { CATEGORY_ORDER, CONCEPT_BY_ID, type Category, type Lang } from '../../data/dictionary'
import { COUNTRY_BY_CODE, LANG_LABEL } from '../../data/countries'
import { categoryLabel, countryName, t } from '../../i18n'
import { flash, reducedMotion, slideOut, useFlip } from '../../lib/motion'
import { addQty, canAddQty } from '../../lib/qty'
import { isIos, isStandalone, listUrl } from '../../lib/links'
import { reportError } from '../../lib/errors'
import { findConcept, isLoaded, loadLanguages, nameIn, onLanguagesLoaded, splitQuantity, suggest } from '../../lib/translate'
import { getChosenShopAt, getPosition, getChosenShop, meters, setChosenShop, shopTag, type Shop } from '../../lib/nearby'
import { detectCountry } from '../../lib/country'
import { MAX } from '../../lib/limits'
import { ListStore, scheduleDelete, isSoleMember, knownSole, leaveList, setLastList, lastSyncError, supabase, type Item, type Profile, type SyncState } from '../../lib/store'
import { formatQty, go } from '../format'
import { ItemRow } from './ItemRow'
import { ShopBar } from './ShopBar'
import { DAY_MS, VISIT_ACCURACY_M, VISIT_RADIUS_M, countryChangeDeclined, declineCountryChange, dupKey, readVisit, saveVisit } from './helpers'
import { EditSheet, MembersSheet, ShareSheet } from './sheets'

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

/** Wörterbuch-Sprachen nachladen; true, sobald die zwingend nötigen geladen sind (D-053) */
function useLanguages(langs: Lang[], required: Lang[]): boolean {
  const [, bump] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const key = [...new Set(langs)].sort().join(',')
  useEffect(() => {
    let timer: number | undefined
    const off = onLanguagesLoaded(() => bump((n) => n + 1))
    loadLanguages(key.split(',') as Lang[]).catch((e: unknown) => {
      // Offline und noch nicht zwischengespeichert: in 5 Sekunden nochmals
      if (attempt === 0) reportError('promise', `dictionary: ${e instanceof Error ? e.message : String(e)}`)
      timer = window.setTimeout(() => setAttempt((n) => n + 1), 5000)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [key, attempt])
  return required.every(isLoaded)
}

export function ListView({ id, profile, onEditProfile }: { id: string; profile: Profile; onEditProfile: () => void }) {
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
  )
  // Bestätigung direkt am Eingabefeld (D-044): angetippter Vorschlag zeigt kurz „✓“, „+“ wird zum Häkchen
  const [confirmSid, setConfirmSid] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  const justAddedTimer = useRef<number | undefined>(undefined)
  const pulseAdded = () => {
    window.clearTimeout(justAddedTimer.current)
    setJustAdded(true)
    justAddedTimer.current = window.setTimeout(() => setJustAdded(false), 900)
  }

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
  // Einkauf läuft (D-055): beim Öffnen direkt beim Laden oder nach dem ersten Abhaken. Ändert nichts an der Anzeige,
  // entscheidet nur, ob ein Ladenbesuch erfasst wird (D-043) und ob der Laden genauer geprüft wird (D-046).
  const [shopping, setShopping] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  // Einziges Mitglied? Dann „Liste löschen“ statt „Aus meinen Listen entfernen“ (D-036). Geprüft beim Öffnen des Menüs.
  // Startwert: zuletzt bekanntes Ergebnis, damit Menü und Warnung nicht kurz den falschen Text zeigen. undefined = unbekannt
  const [sole, setSole] = useState<boolean | null | undefined>(() => knownSole(id))
  useEffect(() => {
    if (showMenu) void isSoleMember(id).then(setSole)
  }, [showMenu, id])
  const [shop, setShop] = useState<Shop | null>(() => getChosenShop(id))
  const [shopChosenAt, setShopChosenAt] = useState<number | null>(() => getChosenShopAt(id))
  // Für die Fotos zählt der gewählte Laden, sonst der angezeigte Vorschlag
  const [suggested, setSuggested] = useState<Shop | null>(null)
  const photoShop = shop ?? suggested

  // Beim Öffnen sehr nahe bei einem Supermarkt (D-020): Einkauf läuft, dieser Laden zählt für den Besuch
  const [mountedAt] = useState(() => Date.now())
  const [autoShop, setAutoShop] = useState<Shop | null>(null)
  const onArrived = (s: Shop) => {
    if (Date.now() - mountedAt > 30_000) return // nur direkt nach dem Öffnen der Liste
    setShopping(true)
    setAutoShop(s)
  }
  const onChecked = () => setShopping(true)
  const chooseShop = (s: Shop | null) => {
    setChosenShop(id, s)
    setShop(s)
    setShopChosenAt(s ? Date.now() : null)
  }

  // Laden verlassen (D-043): Hat der Einkauf begonnen (D-055) und steht man wirklich beim Laden (höchstens 100 m, GPS genau genug),
  // merkt sich die App den Besuch. Ist man später (beim Zurückkehren in die App oder alle 2 Minuten) weiter als 150 m weg,
  // werden Erledigte entfernt. Ein bloss vorgeschlagener Laden in der Nähe zählt nicht als Besuch.
  const visitShop = shopping ? (autoShop ?? photoShop) : null
  const visitShopRef = useRef(visitShop)
  visitShopRef.current = visitShop
  useEffect(() => {
    if (!autoClear) return
    let busy = false
    const check = async () => {
      const visit = readVisit(id)
      const vs = visitShopRef.current
      const candidate = !visit && vs?.lat != null && vs.lon != null ? vs : null
      if ((!visit && !candidate) || busy || document.visibilityState !== 'visible') return
      busy = true
      try {
        const { latitude, longitude, accuracy } = (await getPosition(10_000)).coords
        if (candidate) {
          if (accuracy <= VISIT_ACCURACY_M && meters(latitude, longitude, candidate.lat!, candidate.lon!) <= VISIT_RADIUS_M)
            saveVisit(id, { lat: candidate.lat!, lon: candidate.lon!, at: Date.now() })
        } else if (visit && meters(latitude, longitude, visit.lat, visit.lon) > Math.max(150, accuracy)) {
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
  }, [autoClear, id, store, visitShop?.id, visitShop?.lat, visitShop?.lon])

  const list = store.list

  // Reiseland automatisch anpassen, wenn man in einem anderen unterstützten Land ist (D-040).
  // Keine Änderung in einem Land mit der eigenen Sprache (dort braucht man keine Übersetzung, D-041)
  // oder in einem nicht unterstützten Land.
  const [countryMoved, setCountryMoved] = useState<{ from: string; to: string } | null>(null)
  const listCountry = list?.country
  useEffect(() => {
    if (!listCountry) return
    let alive = true
    void detectCountry(30 * 60 * 1000).then((code) => {
      if (!alive || !code || code === listCountry || !COUNTRY_BY_CODE.has(code)) return
      if (COUNTRY_BY_CODE.get(code)?.lang === profile.lang) return
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
  const region = country?.variant
  const items = store.items.filter((i) => !i.deleted)
  // Wörterbuch nur für die benötigten Sprachen laden (D-053): eigene, Landessprache, Sprachen der Einträge
  const langsReady = useLanguages([profile.lang, target, ...items.map((i) => i.lang)], [profile.lang, target])
  const suggestions = suggest(input, profile.lang)

  // Bestehende Zeile zeigen: aufleuchten, Menge hüpft kurz (D-044). Nicht hinscrollen, die Leiste unten bestätigt.
  function highlight(itemId: string) {
    window.setTimeout(() => {
      const el = mainRef.current?.querySelector(`[data-item-id="${itemId}"]`)
      if (!el) return
      flash(el)
      const badge = el.querySelector('.qty')
      if (badge) {
        badge.classList.remove('bump')
        void (badge as HTMLElement).offsetWidth
        badge.classList.add('bump')
      }
    }, 40)
  }

  function add(text: string, conceptId?: string) {
    const { qty, text: clean } = splitQuantity(text)
    if (!clean) return
    const data = { text: clean, qty, lang: profile.lang, conceptId: conceptId ?? findConcept(clean, profile.lang), author: profile.name }
    setInput('')
    pulseAdded()
    // Gleicher Artikel mit gleicher Einheit schon offen auf der Liste: Menge addieren (D-045).
    // Sonst (andere Einheit, andere Packungsgrösse) kommt er als eigene Zeile dazu, ohne Nachfrage.
    const key = dupKey({ text: clean, lang: profile.lang, conceptId: data.conceptId } as Item)
    const existing = store.items.find((i) => !i.deleted && !i.checked && dupKey(i) === key && canAddQty(i.qty, qty))
    const sum = existing ? addQty(existing.qty, qty) : null
    if (!existing || sum === null) {
      void store.addItem(data)
      return
    }
    const before = existing.qty
    markLocal(existing.id)
    highlight(existing.id)
    void store.updateItem(existing.id, { qty: sum })
    const name = nameIn(existing.conceptId, profile.lang) ?? existing.text
    showBar(t('qtyMerged', { name, qty: formatQty(sum) }), [{ label: t('undo'), run: () => void store.updateItem(existing.id, { qty: before }) }])
  }

  if (!list || !langsReady) {
    return (
      <main className="page narrow">
        <a href="#/" className="back">
          <ArrowLeft size={18} /> {t('allLists')}
        </a>
        <div className="card">
          {list ? t('listLoading') : store.notFound ? t('listNotFound') : supabase ? t('listLoading') : t('listNotOnDevice')}
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
  // Pro Abteilung
  const groups = new Map<Category | 'sonstiges', Item[]>()
  for (const item of open) {
    const cat = (item.conceptId && CONCEPT_BY_ID.get(item.conceptId)?.category) || 'sonstiges'
    groups.set(cat, [...(groups.get(cat) ?? []), item])
  }
  // Was schon offen auf der Liste steht, pro Artikel mit Menge („✓ 3x auf der Liste“, D-045)
  const openQtys = new Map<string, (string | null)[]>()
  for (const i of open) openQtys.set(dupKey(i), [...(openQtys.get(dupKey(i)) ?? []), i.qty])
  const onListLabel = (key: string) => {
    const qtys = openQtys.get(key)
    if (!qtys) return null
    // Mehrere Zeilen (z. B. „3x“ und „2 × 100 g“): nur „auf der Liste“, ohne Mengen
    return qtys.length > 1 ? t('onList') : t('alreadyOnList', { qty: qtys[0] ? formatQty(qtys[0]) : '1x' })
  }
  const order: (Category | 'sonstiges')[] = [...CATEGORY_ORDER, 'sonstiges']

  return (
    <main ref={mainRef} className="page">
      <header className="topbar">
        <a href="#/" className="back" aria-label={t('allLists')}>
          <ArrowLeft size={22} />
        </a>
        <div className="title">
          <h1>{list.name}</h1>
          <span className="sub">
            {country?.flag} {countryName(list.country)} · {LANG_LABEL[target]}
          </span>
          <ShopBar shop={shop} chosenAt={shopChosenAt} shopping={shopping} onChoose={chooseShop} onSuggest={setSuggested} onArrived={onArrived} />
        </div>
        <SyncBadge state={store.sync} error={lastSyncError} />
        {/* Teilen direkt in der Kopfzeile, das Menü ist für den Rest (D-017) */}
        <button className="ghost icon" aria-label={t('share')} title={t('share')} onClick={() => setShowShare(true)}>
          <Share2 size={20} />
        </button>
        <div className="menu-wrap">
          <button className="ghost icon" aria-label={t('menu')} aria-expanded={showMenu} onClick={() => setShowMenu(!showMenu)}>
            <Menu size={20} />
          </button>
          {showMenu && (
            <>
              <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
              <div className="menu" role="menu">
                <div className="menu-label">{t('thisList')}</div>
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
                    setShowEdit(true)
                  }}
                >
                  <Settings size={18} /> {t('editList')}
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setShowMenu(false)
                    setConfirmLeave(true)
                  }}
                >
                  <Trash2 size={18} /> {sole === undefined ? t('removeList') : sole ? t('deleteList') : t('removeFromDevice')}
                </button>
                <div className="menu-sep" role="separator" />
                <div className="menu-label">{t('appName')}</div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false)
                    onEditProfile()
                  }}
                >
                  <UserRound size={18} /> {t('myProfile')}
                </button>
                <button role="menuitem" onClick={() => go('/datenschutz')}>
                  <Shield size={18} /> {t('privacy')}
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

      <form
          className="add"
          onSubmit={(e) => {
            e.preventDefault()
            add(input)
          }}
        >
          <input
            value={input}
            maxLength={MAX.itemText + MAX.qty}
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
          <button className={`primary ${justAdded ? 'just-added' : ''}`} aria-label={t('add')} disabled={!input.trim() && !justAdded}>
            {justAdded ? <Check size={22} strokeWidth={3} /> : <Plus size={22} strokeWidth={2.5} />}
          </button>
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((s) => (
                <li key={s.id} className={confirmSid === s.id ? 'confirmed' : ''}>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmSid) return
                      const { qty } = splitQuantity(input)
                      const text = `${qty ? qty + ' ' : ''}${s.name}`
                      // Erst kurz am Vorschlag bestätigen, dann hinzufügen (D-044)
                      setConfirmSid(s.id)
                      window.setTimeout(
                        () => {
                          add(text, s.id)
                          setConfirmSid(null)
                        },
                        reducedMotion() ? 350 : 550,
                      )
                    }}
                  >
                    {confirmSid === s.id ? <Check size={16} strokeWidth={3} className="confirm-check" /> : null}
                    {s.name} <span className="muted">→ {nameIn(s.id, target, region)}</span>
                    {confirmSid === s.id ? (
                      <span className="on-list">
                        {openQtys.get(s.id)?.some((q) => canAddQty(q, splitQuantity(input).qty)) ? t('qtyIncreased') : t('added')}
                      </span>
                    ) : (
                      onListLabel(s.id) && <span className="on-list">✓ {onListLabel(s.id)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

      {inputFocused && !input && again.length > 0 && (
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
            {groups.get(cat)!.map((item) => (
              <ItemRow key={item.id} item={item} store={store} target={target} region={region} country={list.country} shopTag={photoShop ? shopTag(photoShop) : undefined} shopName={photoShop?.brand ?? photoShop?.name} viewer={profile.lang} me={profile.name} onDeleted={(ids, name) => showUndo(ids, t('deletedOne', { name }))} onLocalChange={markLocal} onChecked={onChecked} />
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
            <ItemRow key={item.id} item={item} store={store} target={target} region={region} country={list.country} shopTag={photoShop ? shopTag(photoShop) : undefined} shopName={photoShop?.brand ?? photoShop?.name} viewer={profile.lang} me={profile.name} onDeleted={(ids, name) => showUndo(ids, t('deletedOne', { name }))} onLocalChange={markLocal} onChecked={onChecked} />
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
            <h2>{sole === undefined ? t('removeList') : sole ? t('deleteListTitle', { name: list.name }) : t('removeListTitle', { name: list.name })}</h2>
            <p>{sole === undefined ? '…' : sole ? t('deleteListConfirm') : t('removeListConfirm')}</p>
            <button
              className="danger-btn"
              disabled={sole === undefined}
              onClick={() => {
                if (sole) scheduleDelete(id, list.name)
                else void leaveList(id)
                go('/')
              }}
            >
              <Trash2 size={16} /> {sole ? t('deleteYes') : t('removeYes')}
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
