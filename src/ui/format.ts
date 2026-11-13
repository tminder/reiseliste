// Kleine Hilfsfunktionen der Oberfläche: Navigation, Sprache, Datum und Mengen anzeigen
import { LANGS, type Lang } from '../data/dictionary'
import { t, uiLang } from '../i18n'

/** Navigation über den Hash (funktioniert auf GitHub Pages ohne Server) */
export const go = (path: string) => (location.hash = path)

/** Sprache des Browsers, falls unterstützt (vor dem Anlegen des Profils) */
export function guessLang(): Lang {
  const l = navigator.language.slice(0, 2) as Lang
  return LANGS.includes(l) ? l : 'de'
}

/** Profilsprache aus dem Browser, z. B. „de-CH“ für Schweizer, „de-AT“ für österreichische Browser, sonst die Sprache (D-056) */
export function guessProfileLang(): string {
  if (/^de-(CH|LI)$/i.test(navigator.language)) return 'de-CH'
  if (/^de-AT$/i.test(navigator.language)) return 'de-AT'
  return guessLang()
}

/** „heute 10:58“, „gestern 18:20“ oder „3.11. 09:15“ (D-036) */
export function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const lang = uiLang()
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(new Date()) - day(d)) / 86_400_000)
  if (diff === 0) return `${t('today')} ${time}`
  if (diff === 1) return `${t('yesterday')} ${time}`
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return `${d.toLocaleDateString(lang, opts)} ${time}`
}

/** "2" → "2x", "500 g" bleibt "500 g" */
export function formatQty(qty: string): string {
  return /^\d+(?:[.,]\d+)?$/.test(qty.trim()) ? `${qty.trim()}x` : qty
}
