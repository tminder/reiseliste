// Ein Artikel der Liste: Name, Landesbegriff, Menge, Abhaken, Fotos, Tipp und Zeigen-Karte (D-032)
import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Hand, Lightbulb, X } from 'lucide-react'
import { CONCEPT_BY_ID, type Lang } from '../../data/dictionary'
import { COUNTRY_BY_CODE } from '../../data/countries'
import { t } from '../../i18n'
import { THANKS, WHERE_IS } from '../../data/phrases'
import { FEATURES } from '../../features'
import { reducedMotion, slideOut } from '../../lib/motion'
import { nameIn } from '../../lib/translate'
import { hasPhotos } from '../../lib/photos'
import { ListStore, type Item } from '../../lib/store'
import { formatQty } from '../format'
import { PhotoStrip } from './PhotoStrip'
import { dupKey } from './helpers'

export function ItemRow({
  item,
  store,
  target,
  region,
  country,
  shopTag,
  shopName,
  viewer,
  me,
  onDeleted,
  onLocalChange,
  onChecked,
}: {
  item: Item
  store: ListStore
  target: Lang
  /** Länder-Abweichung im Wörterbuch, z. B. es-MX (D-053) */
  region?: string
  country: string
  shopTag?: string
  shopName?: string
  viewer: Lang
  /** Name aus dem Profil (für „Ich hole das“, D-031) */
  me: string
  /** Für „Gelöscht · Rückgängig“ (D-042) */
  onDeleted: (ids: string[], name: string) => void
  /** Eigene Änderung melden, damit sie nicht als „von anderen“ aufleuchtet (D-044) */
  onLocalChange: (id: string) => void
  /** Nach dem Abhaken (nicht beim Wieder-Öffnen), Beginn des Einkaufs (D-055) */
  onChecked?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const qty = item.qty
  const author = item.author
  const claimedBy = item.claimedBy ?? null
  const stamp = item.updatedAt
  // Abhaken mit kurzer Animation, bevor die Zeile umsortiert wird (D-044)
  const [pending, setPending] = useState<boolean | null>(null)
  const shownChecked = pending ?? item.checked
  const rowRef = useRef<HTMLDivElement>(null)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [override, setOverride] = useState(item.localOverride ?? '')
  // Eigene Landesbegriffe gibt es nur mit dem Community-Modul (D-027)
  const override_ = FEATURES.community ? item.localOverride : null
  const local = override_ || nameIn(item.conceptId, target, region)
  // Gross: der Artikel in der Sprache des Betrachters (sonst wie eingegeben). Klein: Landessprache.
  const own = (item.lang !== viewer && nameIn(item.conceptId, viewer)) || item.text
  const hints = item.conceptId ? CONCEPT_BY_ID.get(item.conceptId)?.hint : undefined
  const hint = hints?.[viewer] ?? hints?.en

  return (
    <div
      ref={rowRef}
      data-item-id={item.id}
      data-item-key={dupKey(item)}
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
              // Beim Abhaken wird „Ich hole das“ zurückgesetzt (D-031)
              void store.updateItem(item.id, { checked: next, ...(item.claimedBy ? { claimedBy: null } : {}) })
              setPending(null)
              if (next) onChecked?.()
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
            // Antippen → Zeigen-Karte fürs Personal (D-032)
            <button className="local term-btn" title={t('showStaff')} onClick={() => setShowCard(true)}>
              <span className="flag">{COUNTRY_BY_CODE.get(country)?.flag}</span> {local}
            </button>
          ) : (
            <span className="missing">{t('noTranslation')}</span>
          )}
          <span className="muted"> · {author}</span>
          {claimedBy && !item.checked && (
            <span className="claim"> · {claimedBy === me ? t('claimedByMe') : t('claimedBy', { name: claimedBy })}</span>
          )}
        </div>
        {FEATURES.community && !local && !editing && (
          <button className="link" onClick={() => setEditing(true)}>
            {t('enterLocalTerm')}
          </button>
        )}
        {editing && (
          <form
            className="override"
            onSubmit={(e) => {
              e.preventDefault()
              void import('../../features/community').then((m) =>
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
        {showHint && hint && !item.checked && <div className="hint">{hint}</div>}
      </div>
      {hint && !item.checked && (
        <button className={`ghost small ${showHint ? 'active' : ''}`} aria-label={t('tip')} onClick={() => setShowHint(!showHint)}>
          <Lightbulb size={18} />
        </button>
      )}
      {local && !item.checked && shopTag && hasPhotos(item.conceptId, override_) && (
        <button
          className={`ghost small ${showPhotos ? 'active' : ''}`}
          aria-label={t('photos')}
          onClick={() => setShowPhotos(!showPhotos)}
        >
          <Camera size={18} />
        </button>
      )}
      {!item.checked && (
        // „Ich hole das“ (D-031): antippen übernimmt den Artikel, nochmals antippen gibt ihn frei
        <button
          className={`ghost small ${claimedBy === me ? 'active' : ''}`}
          aria-label={claimedBy === me ? t('unclaim') : t('claim')}
          title={claimedBy === me ? t('unclaim') : t('claim')}
          onClick={() => {
            onLocalChange(item.id)
            void store.updateItem(item.id, { claimedBy: claimedBy === me ? null : me })
          }}
        >
          <Hand size={18} />
        </button>
      )}
      {item.checked && (
        // Löschen nur bei Abgehakten (D-055): ein offener Artikel verschwindet nicht versehentlich
        <button className="ghost small" aria-label={t('delete')} onClick={() => {
          onLocalChange(item.id)
          void slideOut(rowRef.current ? [rowRef.current] : []).then(() => {
            void store.updateItem(item.id, { deleted: true })
            onDeleted([item.id], own)
          })
        }}>
          <X size={18} />
        </button>
      )}
      {/* Fotos über die ganze Breite der Karte, unter Text und Knöpfen */}
      {showPhotos && local && (
        <div className="item-wide">
          <PhotoStrip country={country} conceptId={item.conceptId} term={local} store={shopTag} storeName={shopName} />
        </div>
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
