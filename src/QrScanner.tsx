// QR-Code einer Liste mit der Kamera scannen (D-038). Die Bilder werden nur im Browser ausgewertet,
// nichts wird gespeichert oder gesendet. Wird erst beim Öffnen geladen (jsQR ist ~250 kB).
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Link2, X } from 'lucide-react'
import { t } from './i18n'
import { listIdFrom } from './lib/links'

export default function QrScanner({
  onFound,
  onClose,
  onPasteLink,
}: {
  onFound: (listId: string) => void
  onClose: () => void
  /** Alternative: Link einfügen statt scannen */
  onPasteLink: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(() => (typeof navigator.mediaDevices?.getUserMedia === 'function' ? null : t('cameraUnavailable')))
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let last = 0
    let done = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const tick = (now: number) => {
      if (done) return
      raf = requestAnimationFrame(tick)
      const v = video.current
      if (!v || !ctx || v.readyState < 2 || now - last < 200) return // ca. 5 Bilder pro Sekunde reichen
      last = now
      // Verkleinert auswerten: schneller und schont den Akku
      const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight))
      canvas.width = Math.round(v.videoWidth * scale)
      canvas.height = Math.round(v.videoHeight * scale)
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      if (!code?.data) return
      const id = listIdFrom(code.data)
      if (id) {
        done = true
        onFound(id)
      } else setWrong(true)
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (!video.current) return
        video.current.srcObject = s
        void video.current.play().catch(() => {})
        raf = requestAnimationFrame(tick)
      })
      .catch(() => setError(t('cameraDenied')))

    return () => {
      done = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [onFound])

  return (
    <div className="scanner" role="dialog" aria-modal="true">
      <video ref={video} playsInline muted className="scanner-video" />
      <div className="scanner-frame" aria-hidden="true" />
      <div className="scanner-bottom">
        <p className="scanner-text">{error ?? (wrong ? t('qrWrong') : t('qrScanHint'))}</p>
        <button className="scanner-alt" onClick={onPasteLink}>
          <Link2 size={18} /> {t('pasteLinkInstead')}
        </button>
      </div>
      <button className="ghost scanner-close" onClick={onClose} aria-label={t('close')}>
        <X size={28} />
      </button>
    </div>
  )
}
