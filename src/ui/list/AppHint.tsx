// Hinweise im Browser auf dem Handy (D-037, D-061):
// - Liste über einen fremden Link in Safari geöffnet → Link in die Home-Bildschirm-App holen
// - sonst → kurzer Tipp, die Website als App auf den Home-Bildschirm zu legen, mit Anleitung
import { useState } from 'react'
import { t } from '../../i18n'
import { isAndroid, isIos, isStandalone, listUrl, openedByLink } from '../../lib/links'

function flag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return true
  }
}
function setFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* egal */
  }
}

function CopyLinkButton({ id, className }: { id: string; className: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={className}
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
  )
}

/** Schritt-für-Schritt-Anleitung „Zum Home-Bildschirm“, passend zum Gerät */
function InstallSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const ios = isIos()
  const steps = ios ? [t('installIos1'), t('installIos2'), t('installIos3')] : [t('installAndroid1'), t('installAndroid2'), t('installAndroid3')]
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{t('installTitle')}</h2>
        <ol className="install-steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {ios && <p className="muted small-text">{t('installIosLists')}</p>}
        <div className="row">
          {ios && <CopyLinkButton id={id} className="primary" />}
          <button className="ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Tipp „Auf den Home-Bildschirm“ vorübergehend ausgeschaltet (Wunsch des Inhabers, D-061). Der Link-Hinweis bleibt. */
const SHOW_INSTALL_HINT = false

export function AppHint({ id }: { id: string }) {
  const mobile = isIos() || isAndroid()
  const viaLink = isIos() && openedByLink(id)
  const key = viaLink ? 'rl:iosHint' : 'rl:installHint'
  const [hidden, setHidden] = useState(() => !mobile || isStandalone() || flag(key) || (!viaLink && !SHOW_INSTALL_HINT))
  const [guide, setGuide] = useState(false)
  if (hidden) return null
  const dismiss = (
    <button
      className="ghost small"
      onClick={() => {
        setFlag(key)
        setHidden(true)
      }}
    >
      {t('iosHintDismiss')}
    </button>
  )
  if (viaLink)
    return (
      <div className="note info ios-hint">
        <p>{t('iosHint')}</p>
        <div className="row-gap">
          <CopyLinkButton id={id} className="primary small" />
          {dismiss}
        </div>
      </div>
    )
  return (
    <div className="note info ios-hint">
      <p>{t('installHint')}</p>
      <div className="row-gap">
        <button className="primary small" onClick={() => setGuide(true)}>
          {t('installHowTo')}
        </button>
        {dismiss}
      </div>
      {guide && <InstallSheet id={id} onClose={() => setGuide(false)} />}
    </div>
  )
}
