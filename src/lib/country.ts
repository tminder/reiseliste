// Aktuelles Land erkennen (Vorschlag beim Anlegen einer Liste, Reiseland automatisch anpassen: D-040).
// Standort → Nominatim (OpenStreetMap) → Ländercode der App. Das Ergebnis wird mit der Stelle gespeichert (D-087):
// Es gilt, solange man weniger als 10 km davon entfernt ist (höchstens 24 Stunden). Nach einer Reise wird also
// sofort neu bestimmt, auch wenn das letzte Ergebnis erst eine Stunde alt ist.

import { COUNTRY_BY_CODE } from '../data/countries'
import { getPosition, meters } from './nearby'

/** Ohne Standort (z. B. nicht freigegeben) gilt das letzte Ergebnis so lange */
const TTL = 6 * 60 * 60 * 1000
/** Mit Standort: gleiche Gegend (10 km) und höchstens 24 Stunden alt */
const SAME_PLACE_M = 10_000
const SAME_PLACE_MS = 24 * 60 * 60 * 1000

type Cached = { at: number; code: string | null; lat?: number; lon?: number }

function read(ttl = TTL): Cached | null {
  try {
    const raw = localStorage.getItem('rl:here')
    const c = raw ? (JSON.parse(raw) as Cached) : null
    return c && Date.now() - c.at < ttl ? c : null
  } catch {
    return null
  }
}

function write(code: string | null, lat: number, lon: number) {
  try {
    localStorage.setItem('rl:here', JSON.stringify({ at: Date.now(), code, lat, lon } satisfies Cached))
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

/** Zuletzt erkanntes Land aus dem Speicher (ohne neue Abfrage), z. B. für die Reihenfolge der Länderauswahl */
export const cachedCountry = (): string | null => read()?.code ?? null

/**
 * Liefert den App-Ländercode des aktuellen Standorts, null wenn das Land nicht unterstützt wird
 * (z. B. zu Hause in Deutschland), oder undefined, wenn es nicht bestimmt werden konnte.
 */
export async function detectCountry(maxAgeMs = TTL): Promise<string | null | undefined> {
  let pos: GeolocationPosition
  try {
    pos = await getPosition()
  } catch {
    // Kein Standort: letztes Ergebnis, wenn nicht zu alt
    const cached = read(maxAgeMs)
    return cached ? cached.code : undefined
  }
  const { latitude, longitude } = pos.coords
  // Gleiche Gegend: keine neue Anfrage an Nominatim
  const cached = read(SAME_PLACE_MS)
  if (cached && cached.lat != null && cached.lon != null && meters(latitude, longitude, cached.lat, cached.lon) < SAME_PLACE_M) return cached.code
  try {
    const params = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '5', addressdetails: '1', 'accept-language': 'en' })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`)
    if (!res.ok) return undefined
    const data = (await res.json()) as { address?: { country_code?: string; state?: string } }
    const iso = data.address?.country_code
    if (!iso) return undefined
    const code = toAppCode(iso, data.address?.state ?? '')
    write(code, latitude, longitude)
    return code
  } catch {
    return undefined
  }
}
