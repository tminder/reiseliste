// Aktuelles Land erkennen (Vorschlag beim Anlegen einer Liste, Reiseland automatisch anpassen: D-040).
// Standort → Nominatim (OpenStreetMap) → Ländercode der App. Ergebnis 6 Stunden lokal gespeichert,
// damit nicht bei jedem Öffnen der Startseite erneut nach dem Standort gefragt wird.

import { COUNTRY_BY_CODE } from '../data/countries'
import { getPosition } from './nearby'

const TTL = 6 * 60 * 60 * 1000

type Cached = { at: number; code: string | null }

function read(ttl = TTL): Cached | null {
  try {
    const raw = localStorage.getItem('rl:here')
    const c = raw ? (JSON.parse(raw) as Cached) : null
    return c && Date.now() - c.at < ttl ? c : null
  } catch {
    return null
  }
}

function write(code: string | null) {
  try {
    localStorage.setItem('rl:here', JSON.stringify({ at: Date.now(), code } satisfies Cached))
  } catch {
    /* egal */
  }
}

const ROMANDIE = ['genève', 'geneve', 'vaud', 'neuchâtel', 'neuchatel', 'jura', 'fribourg', 'freiburg', 'valais', 'wallis']

/** ISO-Land (+ Region) → Code der App, oder null, wenn das Land (noch) nicht unterstützt wird */
function toAppCode(iso: string, state: string): string | null {
  const s = state.toLowerCase()
  if (iso === 'be') return /wallon|bruxelles|brussel/.test(s) ? 'BE-FR' : 'BE-NL'
  if (iso === 'ch') {
    if (/ticino|tessin/.test(s)) return 'CH-IT'
    if (ROMANDIE.some((c) => s.includes(c))) return 'CH-FR'
    return 'CH-DE'
  }
  const code = iso.toUpperCase()
  return COUNTRY_BY_CODE.has(code) ? code : null
}

/**
 * Liefert den App-Ländercode des aktuellen Standorts, null wenn das Land nicht unterstützt wird
 * (z. B. zu Hause in Deutschland), oder undefined, wenn es nicht bestimmt werden konnte.
 */
export async function detectCountry(maxAgeMs = TTL): Promise<string | null | undefined> {
  const cached = read(maxAgeMs)
  if (cached) return cached.code
  try {
    const pos = await getPosition()
    const { latitude, longitude } = pos.coords
    const params = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '5', addressdetails: '1', 'accept-language': 'en' })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`)
    if (!res.ok) return undefined
    const data = (await res.json()) as { address?: { country_code?: string; state?: string } }
    const iso = data.address?.country_code
    if (!iso) return undefined
    const code = toAppCode(iso, data.address?.state ?? '')
    write(code)
    return code
  } catch {
    return undefined
  }
}
