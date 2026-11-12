// Packungsfotos aus Open Food Facts zu einem Artikel (D-010)
import { useEffect, useState } from 'react'
import { t } from '../../i18n'
import { loadPhotos, PhotoError, type Photo } from '../../lib/photos'
import { RETRY_S } from './helpers'

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
