import type { Lang } from './dictionary'

export interface Country {
  code: string
  name: string
  flag: string
  lang: Lang
}

// Reiseländer, deren Landessprache das Wörterbuch abdeckt
export const COUNTRIES: Country[] = [
  { code: 'ES', name: 'Spanien', flag: '🇪🇸', lang: 'es' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', lang: 'pt' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹', lang: 'it' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷', lang: 'fr' },
  { code: 'GR', name: 'Griechenland', flag: '🇬🇷', lang: 'el' },
  { code: 'CY', name: 'Zypern', flag: '🇨🇾', lang: 'el' },
  { code: 'HR', name: 'Kroatien', flag: '🇭🇷', lang: 'hr' },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱', lang: 'nl' },
  { code: 'BE-NL', name: 'Belgien (Flandern)', flag: '🇧🇪', lang: 'nl' },
  { code: 'BE-FR', name: 'Belgien (Wallonie)', flag: '🇧🇪', lang: 'fr' },
  { code: 'LU', name: 'Luxemburg', flag: '🇱🇺', lang: 'fr' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', lang: 'en' },
  { code: 'GB', name: 'Grossbritannien', flag: '🇬🇧', lang: 'en' },
  { code: 'IE', name: 'Irland', flag: '🇮🇪', lang: 'en' },
  { code: 'US', name: 'USA', flag: '🇺🇸', lang: 'en' },
  { code: 'MX', name: 'Mexiko', flag: '🇲🇽', lang: 'es' },
  { code: 'CH-FR', name: 'Schweiz (Romandie)', flag: '🇨🇭', lang: 'fr' },
  { code: 'CH-IT', name: 'Schweiz (Tessin)', flag: '🇨🇭', lang: 'it' },
]

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export const LANG_LABEL: Record<Lang, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  it: 'Italiano',
  nl: 'Nederlands',
  hr: 'Hrvatski',
  el: 'Ελληνικά',
}
