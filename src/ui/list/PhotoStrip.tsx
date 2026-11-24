// Packungsfotos aus Open Food Facts zu einem Artikel (D-010)
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n'
import { loadPhotos, PhotoError, type Photo } from '../../lib/photos'
import { useCountdown } from '../useCountdown'

/** Wartezeiten bei Fehlern von Open Food Facts (Sekunden), danach alle 5 Minuten. Das Limit gilt pro Minute: frühestens nach 60 s */
const PHOTO_RETRY_S = [60, 120, 300]

export function PhotoStrip({
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
  // `for`: zu welcher Anfrage das Ergebnis gehört; passt es nicht zur aktuellen, läuft die Suche noch
  const [state, setState] = useState<{ for?: string; photos?: Photo[]; fromStore?: boolean; error?: string; retryAt?: number }>({})
  const [attempt, setAttempt] = useState(0) // ändert sich → neue Suche
  const key = `${country}|${conceptId}|${term}|${store}`
  const request = `${key}#${attempt}`
  // Fehlversuche in Folge für die Wartezeit; neuer Artikel oder Laden fängt bei 0 an
  const failures = useRef({ key, n: 0 })

  useEffect(() => {
    let alive = true
    if (failures.current.key !== key) failures.current = { key, n: 0 }
    loadPhotos({ country, conceptId, term, store }).then(
      (r) => {
        if (!alive) return
        failures.current.n = 0
        setState({ for: request, photos: r.photos, fromStore: r.fromStore })
      },
      (e) => {
        if (!alive) return
        const err = e instanceof PhotoError ? e : new PhotoError(t('errPhotos'), true)
        if (err.retry) {
          // Open Food Facts erlaubt nur wenige Suchen pro Minute: geduldiger als die Ladensuche (D-094)
          const wait = PHOTO_RETRY_S[Math.min(failures.current.n, PHOTO_RETRY_S.length - 1)]
          failures.current.n += 1
          setState({ for: request, error: err.message, retryAt: Date.now() + wait * 1000 })
        } else setState({ for: request, error: err.message })
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  // Countdown bis zum automatischen neuen Versuch (D-094)
  const current = state.for === request
  const retryIn = useCountdown(current ? state.retryAt : null, () => setAttempt((a) => a + 1))

  if (!current) return <div className="photos-note">{t('photosSearching')}</div>
  if (state.error)
    return (
      <div className="photos-note">
        {state.error}
        {retryIn != null && ` ${t('retryIn', { s: retryIn })} · `}
        {retryIn != null && (
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
