// Laden in der Nähe finden und wählen (D-033), Ladenbesuch erkennen
import { useEffect, useRef, useState } from 'react'
import { Check, LocateFixed, MapPin, Pencil, Store as StoreIcon } from 'lucide-react'
import { t } from '../../i18n'
import { CHOSEN_GRACE_MS, FAR_RADIUS_M, findNearbyShops, getPosition, isInsideSupermarket, formatDistance, HERE_M, setLocationConsent, LEFT_SHOP_M, meters, NearbyError, recentSuggestion, type Shop } from '../../lib/nearby'
import { RETRY_S } from './helpers'
import { cachedCountry, detectCountry } from '../../lib/country'

export function ShopBar({
  shop,
  chosenAt,
  shopping,
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
    error?: string
    permission?: boolean
    help?: boolean
    retryIn?: number
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

  /** manual: „Neu suchen“ – immer neue Anfrage. Sonst still im Hintergrund, neue Anfrage nur nach Ortswechsel. */
  async function detect(manual = false, precise = false) {
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
    setState((s) => ({ ...s, loading: manual || !s.shops, more: manual ? s.more : false }))
    try {
      const result = await findNearbyShops(manual, precise)
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
  const suggestion = !shop && !state.dismissed && !away ? (state.shops?.[0] ?? null) : null
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

  // Nicht im Reiseland: nichts anzeigen (ein gewählter Laden bleibt sichtbar, bis man sich entfernt, D-033)
  if (away && !shop) return null

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

  // Ein Laden (gewählt oder vorgeschlagen): die ganze Zeile öffnet die Auswahl als Blatt (D-072)
  const close = () => setState((st) => ({ ...st, more: false }))
  // Im Laden (höchstens HERE_M entfernt): „hier“ statt Meter (D-078). Beim gewählten Laden zählt die letzte Messung.
  const isHere = (s: Shop) => s.distance <= HERE_M
  const dist = shop ? state.shops?.find((x) => x.id === shop.id)?.distance : current.distance
  const here = dist != null && dist <= HERE_M
  const hereTag = <span className="shop-here">{t('shopHere')}</span>
  return (
    <div className="shopline">
      <button
        className={here ? 'shop-current here' : 'shop-current'}
        aria-label={t('changeShop')}
        aria-expanded={!!state.more}
        onClick={() => {
          if (!state.shops) void detect(true)
          setState((st) => ({ ...st, more: true }))
        }}
      >
        <StoreIcon size={15} />
        <span className="shop-name">{current.name}</span>
        {here ? hereTag : !shop && <span className="muted">{formatDistance(current.distance)}</span>}
        <Pencil size={13} className="shop-edit" />
      </button>
      {state.more && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t('changeShop')} onClick={(e) => e.stopPropagation()}>
            <h2>{t('chooseShop')}</h2>
            <ul className="shop-options">
              {[current, ...others].map((x) => (
                <li key={x.id}>
                  <button
                    className={x.id === current.id ? 'active' : ''}
                    onClick={() => {
                      onChoose(x)
                      close()
                    }}
                  >
                    <span className="shop-name">{x.name}</span>
                    <span className="muted">{x.id === current.id ? <Check size={16} /> : isHere(x) ? hereTag : formatDistance(x.distance)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {state.loading && <p className="muted small-text">{t('searching')}</p>}
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
