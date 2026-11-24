// Laden in der Nähe finden und wählen (D-033), Ladenbesuch erkennen
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, LocateFixed, Map as MapIcon, MapPin, Store as StoreIcon } from 'lucide-react'
import { isIos, mapApp, mapLink, needsMapChoice, setMapApp } from '../../lib/links'
import { knownStreet, lookupStreets, shopTitle } from '../../lib/nearby'
import { t, uiLang } from '../../i18n'
import { describeHours } from '../../lib/openingHours'
import { CHOSEN_GRACE_MS, FAR_RADIUS_M, findNearbyShops, getPosition, isInsideSupermarket, formatDistance, looksInside, osmCooldownS, setLocationConsent, LEFT_SHOP_M, meters, NearbyError, recentSuggestion, type Shop } from '../../lib/nearby'
import { RETRY_S } from './helpers'
import { useCountdown } from '../useCountdown'
import { cachedCountry, detectCountry } from '../../lib/country'

/** Namen der Karten-Apps (D-101); Apple Karten ist übersetzt */
const MAP_APP_NAME: Partial<Record<'apple' | 'google' | 'osm', string>> = { google: 'Google Maps', osm: 'OpenStreetMap' }

/** „Im <Laden>“ höchstens so lange nach dem letzten Abhaken bzw. der Ankunft (D-078) */
const ACTIVE_MS = 30 * 60 * 1000

export function ShopBar({
  shop,
  chosenAt,
  shopping,
  activeAt,
  firstChecked,
  country,
  onChoose,
  onSuggest,
  onArrived,
}: {
  shop: Shop | null
  /** Zeitpunkt der Wahl von Hand: in den ersten 30 Minuten wird der Laden nie automatisch verworfen */
  chosenAt: number | null
  /** Einkauf hat begonnen: löst eine genauere Prüfung im Hintergrund aus (D-046, D-055) */
  shopping: boolean
  /** Zuletzt beim Einkaufen aktiv (Ankunft im Laden, Abhaken): „Im <Laden>“ nur bis 30 Minuten danach (D-078) */
  activeAt: number | null
  /** Erstes Abhaken nach dem Öffnen: Laden nochmals genau prüfen, auch wenn der Einkauf schon lief (D-069) */
  firstChecked?: boolean
  /** Reiseland der Liste (App-Code, z. B. „CH-DE“): gesucht wird nur, wenn man dort ist (D-075) */
  country: string
  onChoose: (s: Shop | null) => void
  onSuggest: (s: Shop | null) => void
  onArrived: (s: Shop) => void
}) {
  // Letztes Ergebnis (bis 12 h) sofort zeigen, geprüft wird im Hintergrund (D-033)
  const [state, setState] = useState<{
    loading?: boolean
    shops?: Shop[]
    inside?: boolean
    accuracy?: number
    error?: string
    permission?: boolean
    help?: boolean
    /** Zeitpunkt des nächsten automatischen Versuchs (D-094) */
    retryAt?: number
    more?: boolean
    dismissed?: boolean
  }>(() => recentSuggestion() ?? {})
  const [attempt, setAttempt] = useState(0)
  // Nicht im Reiseland (D-075): keine Ladensuche, keine Anzeige. undefined = unbekannt, dann wie bisher
  const iso = (code: string) => code.split('-')[0]
  const [away, setAway] = useState<boolean | undefined>(() => {
    const here = cachedCountry()
    return here ? iso(here) !== iso(country) : undefined
  })

  const lastCheck = useRef(0)
  // Nachgeschlagene Adressen für Läden ohne eigene Adresse (D-101)
  const [streets, setStreets] = useState<Record<string, string>>({})
  // Laden, für den die Karten-App gewählt wird (iPhone, D-101)
  const [mapFor, setMapFor] = useState<Shop | null>(null)
  const [pickMapApp, setPickMapApp] = useState(false)
  // Letzter eigener Standort dieser Sitzung: für die Anzeige „Im <Laden>“ (D-078)
  const [pos, setPos] = useState<{ lat: number; lon: number; accuracy: number } | null>(null)

  /**
   * manual: „Neu suchen“ – immer neue Anfrage. Sonst still im Hintergrund, neue Anfrage nur nach Ortswechsel.
   * retry: automatischer neuer Versuch nach einem Fehler; ein offenes Auswahlblatt bleibt offen.
   */
  async function detect(manual = false, precise = false, retry = false) {
    const keep = manual || retry
    lastCheck.current = Date.now()
    if (!manual) {
      // Erst prüfen, ob man im Reiseland ist; null = Land nicht unterstützt, also sicher nicht das Reiseland
      const here = await detectCountry(30 * 60 * 1000)
      if (here !== undefined) {
        const isAway = here === null || iso(here) !== iso(country)
        setAway(isAway)
        if (isAway) return
      }
    }
    if (manual) setAttempt(0)
    // Ohne bisheriges Ergebnis „Suche …“ zeigen, sonst bleibt der bisherige Laden ruhig stehen
    // Fehler und Countdown weg, sobald der neue Versuch läuft: sonst stand „Neuer Versuch in 0 s“ bis zum Ergebnis da
    setState((s) => ({ ...s, loading: manual || !s.shops, more: keep ? s.more : false, error: undefined, retryAt: undefined }))
    try {
      const result = await findNearbyShops(manual, precise)
      setPos({ lat: result.lat, lon: result.lon, accuracy: result.accuracy ?? 999 })
      setAttempt(0)
      setState((s) => ({ shops: result.shops, inside: result.inside, accuracy: result.accuracy, more: keep ? s.more : false, dismissed: result.fresh ? false : s.dismissed }))
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
        setState((s) => ({ error: err.message, retryAt: Date.now() + wait * 1000, more: s.more }))
      } else setState((s) => ({ error: err.message, permission: err.permission, more: s.more }))
    }
  }

  // Den angezeigten Vorschlag nach oben melden (für die Fotos)
  // Vorschlag: der nächste Laden, der laut Öffnungszeiten offen ist (D-099). Läden ohne Zeiten werden nicht vorgezogen;
  // ist keiner sicher offen, gilt der nächste. Steht man in einem Laden (inside), gilt dieser.
  const firstShop = (() => {
    const shops = state.shops ?? []
    if (state.inside) return shops[0] ?? null
    return shops.find((x) => describeHours(x.hours, t, uiLang())?.open === true) ?? shops[0] ?? null
  })()
  const suggestion = !shop && !state.dismissed && !away ? firstShop : null
  useEffect(() => {
    onSuggest(suggestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.id])

  const stateRef = useRef(state)
  stateRef.current = state

  /** Gewählter Laden: verwerfen, wenn man sich weiter als LEFT_SHOP_M entfernt hat (D-033) */
  async function checkLeft(limitM = LEFT_SHOP_M): Promise<boolean> {
    if (!shop || shop.lat == null || shop.lon == null) return false
    // Gerade erst von Hand gewählt (oft ein Laden, zu dem man erst hingeht): stehen lassen
    if (chosenAt && Date.now() - chosenAt < CHOSEN_GRACE_MS) return false
    lastCheck.current = Date.now()
    try {
      const { latitude, longitude, accuracy } = (await getPosition(limitM < LEFT_SHOP_M ? 10_000 : undefined)).coords
      setPos({ lat: latitude, lon: longitude, accuracy })
      if (meters(latitude, longitude, shop.lat, shop.lon) > Math.max(limitM, accuracy)) {
        onChoose(null)
        return true
      }
    } catch {
      /* ohne Standort bleibt der Laden */
    }
    return false
  }

  // Beginn des Einkaufs (D-046): genauer prüfen, ob man beim angezeigten Laden steht. Höchstens 1× pro Minute.
  const lastShoppingCheck = useRef(0)
  useEffect(() => {
    if (!shopping || Date.now() - lastShoppingCheck.current < 60_000) return
    lastShoppingCheck.current = Date.now()
    // Gewählter Laden mehr als 150 m entfernt: verwerfen, dann sucht die App den Laden, in dem man steht
    if (shop)
      void checkLeft(150).then((left) => {
        if (left) void detect(false, true)
      })
    else void detect(false, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopping, firstChecked])

  // Beim Öffnen der Liste still prüfen: ohne gewählten Laden den Vorschlag, mit Laden ob man noch dort ist
  useEffect(() => {
    if (shop) void checkLeft()
    else void detect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop])

  // Zurück in der App und regelmässig, solange die Liste offen ist: still prüfen, höchstens alle 2 Minuten (D-080).
  // Ohne Ortswechsel nutzt detect() das letzte Ergebnis, es gibt also keine neue Anfrage an OpenStreetMap.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck.current < 120_000) return
      if (shop) void checkLeft()
      else void detect()
    }
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, 30_000)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop])

  // Ladenauswahl offen: fehlende Adressen der angezeigten Läden nachschlagen (D-101), still, Fehler egal
  useEffect(() => {
    if (!state.more || !state.shops?.length) return
    let alive = true
    const shown = [...(shop ? [shop] : []), ...state.shops.slice(0, 6)]
    lookupStreets(shown).then(
      (r) => alive && setStreets(r),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [state.more, state.shops, shop])

  // Countdown und automatischer neuer Versuch bei überlastetem Server (D-094)
  const retryIn = useCountdown(shop ? null : state.retryAt, () => void detect(false, false, true))

  const current = shop ?? (state.dismissed ? null : firstShop)
  const others = (state.shops ?? []).filter((x) => x.id !== current?.id).slice(0, 5)

  // Nicht im Reiseland: nichts anzeigen (ein gewählter Laden bleibt sichtbar, bis man sich entfernt, D-033)
  if (away && !shop) return null

  if (state.permission && !current)
    return (
      <div className="shopline muted">
        <MapPin size={15} />
        <button
          className="link"
          onClick={() => {
            setLocationConsent('yes')
            void detect(true)
          }}
        >
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

  // Eine Zeile für alle Zustände: antippen öffnet die Auswahl als Blatt (D-072, D-086).
  // Fehler und Countdown stehen nur im Blatt; in der Zeile steht solange „Suche Laden …“.
  const close = () => setState((st) => ({ ...st, more: false }))
  const open = () => {
    if (!state.shops && !state.loading && state.retryAt == null) void detect(true)
    setState((st) => ({ ...st, more: true }))
  }
  // Im Laden: „Im <Laden>“ statt Meter (D-078), nur während des Einkaufs (erstes Abhaken oder Ankunft, dann bis 30 Minuten
  // nach der letzten Aktivität) und solange man beim Laden ist. Gemessen ab dem letzten Standort dieser Sitzung.
  const here =
    !!current &&
    activeAt != null &&
    Date.now() - activeAt < ACTIVE_MS &&
    !!pos &&
    current.lat != null && current.lon != null && looksInside(meters(pos.lat, pos.lon, current.lat, current.lon), pos.accuracy)
  const options = current ? [current, ...others] : (state.shops ?? []).slice(0, 6)
  const locale = uiLang()
  // Öffnungszeiten aus OpenStreetMap (D-099); fehlen sie beim gewählten Laden, aus der letzten Suche
  const hoursOf = (s: Shop) => describeHours(s.hours ?? state.shops?.find((x) => x.id === s.id)?.hours, t, locale)
  const streetOf = (s: Shop) => state.shops?.find((x) => x.id === s.id)?.street ?? (streets[s.id] || knownStreet(s) || undefined)
  return (
    <div className="shopline">
      <button className={`shop-current${here ? ' here' : ''}${current ? '' : ' muted'}${current && !here && hoursOf(current)?.open !== true ? ' closed' : ''}`} aria-label={t('changeShop')} aria-expanded={!!state.more} onClick={open}>
        {current ? (
          <>
            <StoreIcon size={15} />
            <span className="shop-name">
              {here && <span className="muted">{t('shopIn')} </span>}
              {shopTitle(current, streetOf(current))}
            </span>
            {!here && !shop && hoursOf(current)?.open !== false && <span className="muted">{formatDistance(current.distance)}</span>}
            {/* Zeile oben knapp: nur wenn geschlossen ein dezentes „· zu“ (D-101); Zeiten stehen in der Auswahl */}
            {hoursOf(current)?.open === false && <span className="muted shop-hours">· {t('hoursClosedShort')}</span>}
            {hoursOf(current)?.closesSoon && <span className="muted shop-hours">· {hoursOf(current)!.closesSoon}</span>}
          </>
        ) : (
          <>
            <MapPin size={15} />
            <span className="shop-name">
              {state.loading || state.error ? t('searchingShop') : state.shops ? t('noSupermarketWithin', { dist: formatDistance(FAR_RADIUS_M) }) : t('noShop')}
            </span>
          </>
        )}
        <ChevronDown size={14} className="shop-edit" />
      </button>
      {state.more && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t('changeShop')} onClick={(e) => e.stopPropagation()}>
            <h2>{t('chooseShop')}</h2>
            {options.length > 0 && (
              <ul className="shop-options">
                {options.map((x) => (
                  <li key={x.id}>
                    <button
                      className={`${x.id === current?.id ? 'active' : ''}${hoursOf(x)?.open !== true ? ' closed' : ''}`}
                      onClick={() => {
                        onChoose(x)
                        close()
                      }}
                    >
                      <span className="shop-option-text">
                        <span className="shop-name">
                          {/* Filiale zum Namen; die Strasse steht schon in der zweiten Zeile (D-103) */}
                          {shopTitle(x, '')}
                          {/* Gewählt: Häkchen direkt nach dem Namen, rechts bleibt die Distanz (D-101) */}
                          {x.id === current?.id && <Check size={16} className="shop-check" aria-label={t('selected')} />}
                        </span>
                        {/* Strasse (D-101) und Öffnungszeiten (D-099) je auf einer eigenen Zeile */}
                        {(x.street ?? streetOf(x)) && <span className="muted shop-hours-long">{x.street ?? streetOf(x)}</span>}
                        <span className="muted shop-hours-long">
                          {/* Geschlossen in Orange, damit es sich von „unbekannt“ abhebt (D-099) */}
                          <span className={hoursOf(x)?.open === false ? 'hours-closed' : undefined}>{hoursOf(x)?.long ?? t('hoursUnknown')}</span>
                        </span>
                      </span>
                      {/* Grau bei geschlossen und bei unbekannten Zeiten; Distanz immer, für die Wahl (D-101) */}
                      <span className="muted">{formatDistance(x.distance)}</span>
                    </button>
                    {x.lat != null && x.lon != null && (
                      // Karten-App öffnen (D-101); Antippen der Zeile wählt weiterhin den Laden
                      <a
                        className="shop-map"
                        href={mapLink(x.lat, x.lon, x.name).href}
                        {...(mapLink(x.lat, x.lon, x.name).external ? { target: '_blank', rel: 'noreferrer' } : {})}
                        aria-label={t('openInMaps', { name: x.name })}
                        onClick={(e) => {
                          // iPhone ohne gewählte Karten-App: erst fragen (D-101)
                          if (needsMapChoice()) {
                            e.preventDefault()
                            setMapFor(x)
                          }
                        }}
                      >
                        <MapIcon size={18} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {state.error && (
              <p className="muted small-text shop-error">
                {state.error}
                {retryIn != null && <> {t('retryIn', { s: retryIn })}</>}{' '}
                {/* „jetzt“ erst nach der Pause von 30 s, die Overpass verlangt (D-086) */}
                {osmCooldownS() === 0 && (
                  <button className="link" onClick={() => void detect(true)}>
                    {t('now')}
                  </button>
                )}
              </p>
            )}
            {!options.length && !state.error && !state.loading && state.shops && (
              <p className="muted small-text">{t('noSupermarketWithin', { dist: formatDistance(FAR_RADIUS_M) })}</p>
            )}
            {state.loading && <p className="muted small-text">{t('searching')}</p>}
            {options.some((x) => hoursOf(x)) && <p className="muted small-text">{t('hoursSource')}</p>}
            {isIos() && mapApp() && (
              <p className="muted small-text">
                {t('mapAppCurrent', { app: MAP_APP_NAME[mapApp()!] ?? t('appleMaps') })}{' '}
                <button className="link" onClick={() => setPickMapApp(true)}>
                  {t('change')}
                </button>
              </p>
            )}
            {pickMapApp && (
              // Karten-App ändern (D-101): direkt wählen, ohne Laden zu öffnen
              <div className="sheet-backdrop" onClick={() => setPickMapApp(false)}>
                <div className="sheet" role="dialog" aria-modal="true" aria-label={t('mapAppPick')} onClick={(e) => e.stopPropagation()}>
                  <h2>{t('mapAppPick')}</h2>
                  <ul className="shop-options">
                    {(['apple', 'google', 'osm'] as const).map((app) => (
                      <li key={app}>
                        <button
                          className={mapApp() === app ? 'active' : ''}
                          onClick={() => {
                            setMapApp(app)
                            setPickMapApp(false)
                          }}
                        >
                          <span className="shop-name">
                            {MAP_APP_NAME[app] ?? t('appleMaps')}
                            {mapApp() === app && <Check size={16} className="shop-check" aria-label={t('selected')} />}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button className="ghost" onClick={() => setPickMapApp(false)}>
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}
            {mapFor && mapFor.lat != null && mapFor.lon != null && (
              // Karten-App wählen (iPhone, D-101): Web kann nicht prüfen, welche installiert ist; Wahl wird gespeichert
              <div className="sheet-backdrop" onClick={() => setMapFor(null)}>
                <div className="sheet" role="dialog" aria-modal="true" aria-label={t('mapAppChoose')} onClick={(e) => e.stopPropagation()}>
                  <h2>{t('mapAppChoose')}</h2>
                  <div className="stack">
                    {(['apple', 'google', 'osm'] as const).map((app) => (
                      <a
                        key={app}
                        className="button ghost"
                        href={mapLink(mapFor.lat!, mapFor.lon!, mapFor.name, app).href}
                        {...(app === 'osm' ? { target: '_blank', rel: 'noreferrer' } : {})}
                        onClick={() => {
                          setMapApp(app)
                          setMapFor(null)
                        }}
                      >
                        {MAP_APP_NAME[app] ?? t('appleMaps')}
                      </a>
                    ))}
                  </div>
                  <p className="muted small-text">{t('mapAppHint')}</p>
                  <button className="ghost" onClick={() => setMapFor(null)}>
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}
            <div className="row">
              <button
                className="ghost"
                disabled={state.loading}
                onClick={() => {
                  onChoose(null)
                  void detect(true).then(() => setState((st) => ({ ...st, more: true })))
                }}
              >
                <LocateFixed size={15} /> {t('searchAgain')}
              </button>
              <button className="ghost" onClick={close}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
