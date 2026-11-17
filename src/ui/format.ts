// Kleine Hilfsfunktionen der Oberfläche: Navigation, Sprache, Datum und Mengen anzeigen
import { LANGS, type Lang } from '../data/dictionary'
import { t, uiLang } from '../i18n'

/** Navigation über den Hash (funktioniert auf GitHub Pages ohne Server) */
export const go = (path: string) => (location.hash = path)

/** Sprache des Geräts, falls unterstützt, sonst Englisch (vor dem Anlegen des Profils, D-071) */
export function guessLang(): Lang {
  const l = navigator.language.slice(0, 2) as Lang
  return LANGS.includes(l) ? l : 'en'
}

/**
 * Profilsprache aus der Gerätesprache (D-056, D-071): Deutsch aus der Schweiz und Liechtenstein → Deutsch (Schweiz),
 * aus Österreich → Deutsch (Österreich), jedes andere Deutsch → Deutsch (Deutschland).
 * Andere unterstützte Sprachen wie erkannt, sonst Englisch.
 * iPhones melden bei „Deutsch“ oft nur „de-DE“, auch mit Region Schweiz. Darum zählen alle Spracheinträge,
 * und ohne Hinweis auf die Region entscheidet die Zeitzone des Geräts (Zürich, Vaduz, Wien).
 */
export function guessProfileLang(): string {
  if (guessLang() !== 'de') return guessLang()
  const all = [navigator.language, ...(navigator.languages ?? [])].filter((l) => /^de\b/i.test(l))
  if (all.some((l) => /^de-(CH|LI)$/i.test(l))) return 'de-CH'
  if (all.some((l) => /^de-AT$/i.test(l))) return 'de-AT'
  let zone = ''
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    /* ohne Zeitzone: Deutsch (Deutschland) */
  }
  if (zone === 'Europe/Zurich' || zone === 'Europe/Vaduz') return 'de-CH'
  if (zone === 'Europe/Vienna') return 'de-AT'
  return 'de'
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
