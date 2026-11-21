// Währung umrechnen (D-093): Währung des Reiselands ↔ eigene Währung.
// Kurse: Frankfurter (api.frankfurter.dev, Referenzkurse u. a. der EZB, ohne Schlüssel), 12 Stunden auf dem Gerät gespeichert.
// Ohne Netz gilt der letzte gespeicherte Kurs mit seinem Datum.
import type { Profile } from './store'

/** Währung je Reiseland (App-Code ohne Region reicht für die Schweiz und Belgien) */
const COUNTRY_CURRENCY: Record<string, string> = {
  ES: 'EUR', PT: 'EUR', IT: 'EUR', FR: 'EUR', GR: 'EUR', CY: 'EUR', HR: 'EUR', NL: 'EUR', BE: 'EUR', LU: 'EUR',
  MT: 'EUR', IE: 'EUR', DE: 'EUR', AT: 'EUR', CH: 'CHF', LI: 'CHF', GB: 'GBP', US: 'USD', MX: 'MXN', BR: 'BRL',
  AR: 'ARS', CA: 'CAD', AU: 'AUD', NZ: 'NZD', VN: 'VND', TW: 'TWD',
}

/** Auswahl der eigenen Währung */
export const CURRENCIES = ['CHF', 'EUR', 'GBP', 'USD', 'CAD', 'AUD', 'NZD', 'MXN', 'BRL', 'ARS', 'VND', 'TWD']

export const countryCurrency = (country: string): string | null => COUNTRY_CURRENCY[country.split('-')[0]] ?? null

/** Eigene Währung: gespeicherte Wahl, sonst aus Profil (Deutsch (Schweiz) → CHF) bzw. Gerätesprache (en-GB → GBP), sonst EUR */
export function homeCurrency(profile: Profile): string {
  try {
    const saved = localStorage.getItem('rl:homeCurrency')
    if (saved && CURRENCIES.includes(saved)) return saved
  } catch {
    /* egal */
  }
  if (profile.region === 'de-CH') return 'CHF'
  const region = (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[1]?.toUpperCase()
  return (region && COUNTRY_CURRENCY[region]) || 'EUR'
}

export function setHomeCurrency(code: string) {
  try {
    localStorage.setItem('rl:homeCurrency', code)
  } catch {
    /* egal */
  }
}

export type Rate = { rate: number; date: string; at: number }
const FRESH_MS = 12 * 60 * 60 * 1000

function cached(base: string, quote: string): Rate | null {
  try {
    const raw = localStorage.getItem(`rl:rate:${base}-${quote}`)
    return raw ? (JSON.parse(raw) as Rate) : null
  } catch {
    return null
  }
}

/** Kurs „1 base = rate quote“. Gespeicherter Kurs bis 12 Stunden, sonst neu; ohne Netz der letzte gespeicherte. */
export async function getRate(base: string, quote: string): Promise<Rate | null> {
  if (base === quote) return { rate: 1, date: '', at: Date.now() }
  const old = cached(base, quote)
  if (old && Date.now() - old.at < FRESH_MS) return old
  try {
    const res = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`)
    if (!res.ok) return old
    const data = (await res.json()) as { rate?: number; date?: string }
    if (typeof data.rate !== 'number' || !(data.rate > 0)) return old
    const rate: Rate = { rate: data.rate, date: data.date ?? '', at: Date.now() }
    try {
      localStorage.setItem(`rl:rate:${base}-${quote}`, JSON.stringify(rate))
    } catch {
      /* egal */
    }
    return rate
  } catch {
    return old
  }
}

/** Betrag hübsch: „9.40“, bei grossen Zahlen ohne Nachkommastellen („245 000“) */
export function formatMoney(n: number, currency: string, locale: string): string {
  const big = Math.abs(n) >= 1000 || currency === 'VND'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: big ? 0 : 2, minimumFractionDigits: big ? 0 : 2 }).format(n)
}
