// Wörterbuch (D-053). Daten in src/data/dictionary/:
//   concepts.json   ein Eintrag pro Artikel: id, Abteilung, Fotokategorie (Open Food Facts), Tipp
//   <sprache>.json  Namen pro Artikel, z. B. "milch": ["Milch"] – der erste wird angezeigt, alle werden erkannt
//   <sprache>-<LAND>.json  Abweichungen für ein Land (z. B. es-MX): nur die Artikel, die dort anders heissen
// Die App lädt nur die Sprachen, die sie gerade braucht (eigene Sprache und Landessprache der Liste).
// Status: Entwurf, noch nicht von Muttersprachlern geprüft (S-001). Prüftabellen: npm run review:export

import CONCEPTS_JSON from './dictionary/concepts.json'

export const LANGS = ['de', 'en', 'es', 'pt', 'fr', 'it', 'nl', 'hr', 'el', 'vi', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Category =
  | 'obst'
  | 'milch'
  | 'brot'
  | 'fleisch'
  | 'vorrat'
  | 'getraenke'
  | 'tk'
  | 'haushalt'
  | 'kueche'
  | 'hygiene'
  | 'baby'

export interface Concept {
  id: string
  category: Category
  /** Kategorie in Open Food Facts; ohne Eintrag kein Foto-Knopf */
  off?: string
  /** Tipp zum Artikel (💡); fehlt die Sprache des Betrachters, gilt Englisch */
  hint?: Partial<Record<Lang, string>>
}

export const CONCEPTS = CONCEPTS_JSON as Concept[]
export const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]))

export type Names = Record<string, string[]>

// Alle Sprachdateien als eigene, nachladbare Teile (Vite). Schlüssel z. B. "./dictionary/es-MX.json"
const FILES = import.meta.glob<Names>(['./dictionary/*.json', '!./dictionary/concepts.json'], { import: 'default' })
const fileOf = (path: string) => path.slice('./dictionary/'.length, -'.json'.length)

/** Verfügbare Länder-Abweichungen pro Sprache, z. B. es → ["es-MX", "es-AR"] */
export const VARIANTS: Partial<Record<Lang, string[]>> = {}
for (const path of Object.keys(FILES)) {
  const name = fileOf(path)
  const [lang, region] = name.split('-')
  if (region) (VARIANTS[lang as Lang] ??= []).push(name)
}

/** Lädt eine Sprache samt ihren Länder-Abweichungen: { base, variants: { "es-MX": {...} } } */
export async function loadLangFiles(lang: Lang): Promise<{ base: Names; variants: Record<string, Names> }> {
  const base = await FILES[`./dictionary/${lang}.json`]()
  const variants: Record<string, Names> = {}
  for (const v of VARIANTS[lang] ?? []) variants[v] = await FILES[`./dictionary/${v}.json`]()
  return { base, variants }
}

/** Deutsche Namen der Abteilungen (Oberfläche: siehe categoryLabel in src/i18n.ts) */
export const CATEGORY_LABEL: Record<Category, string> = {
  obst: 'Obst & Gemüse',
  milch: 'Milchprodukte & Eier',
  brot: 'Brot & Frühstück',
  fleisch: 'Fleisch & Fisch',
  vorrat: 'Vorrat',
  getraenke: 'Getränke',
  tk: 'Tiefkühl',
  haushalt: 'Haushalt',
  kueche: 'Küche & Geschirr',
  hygiene: 'Drogerie',
  baby: 'Baby',
}

/** Reihenfolge der Abteilungen im Laden (grob, für alle Länder gleich im MVP). */
export const CATEGORY_ORDER: Category[] = [
  'obst',
  'brot',
  'fleisch',
  'milch',
  'vorrat',
  'getraenke',
  'tk',
  'haushalt',
  'kueche',
  'hygiene',
  'baby',
]
