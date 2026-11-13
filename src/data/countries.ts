import type { Lang } from './dictionary'

export interface Country {
  code: string
  name: string
  flag: string
  lang: Lang
  /** Länder-Abweichung im Wörterbuch (src/data/dictionary/<variant>.json), z. B. „jitomate“ statt „tomate“ in Mexiko */
  variant?: string
}

// Länder, deren Landessprache das Wörterbuch abdeckt (Reiseland)
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
  { code: 'US', name: 'USA', flag: '🇺🇸', lang: 'en', variant: 'en-US' },
  { code: 'MX', name: 'Mexiko', flag: '🇲🇽', lang: 'es', variant: 'es-MX' },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', lang: 'de' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', lang: 'de' },
  { code: 'CH-DE', name: 'Schweiz (Deutschschweiz)', flag: '🇨🇭', lang: 'de', variant: 'de-CH' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', lang: 'de', variant: 'de-CH' },
  { code: 'BR', name: 'Brasilien', flag: '🇧🇷', lang: 'pt', variant: 'pt-BR' },
  { code: 'AR', name: 'Argentinien', flag: '🇦🇷', lang: 'es', variant: 'es-AR' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦', lang: 'en' },
  { code: 'AU', name: 'Australien', flag: '🇦🇺', lang: 'en' },
  { code: 'NZ', name: 'Neuseeland', flag: '🇳🇿', lang: 'en' },
  { code: 'CH-FR', name: 'Schweiz (Romandie)', flag: '🇨🇭', lang: 'fr' },
  { code: 'CH-IT', name: 'Schweiz (Tessin)', flag: '🇨🇭', lang: 'it' },
]

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

/**
 * Sprachauswahl im Profil (D-056): Sprachen mit eigener Länder-Abweichung im Wörterbuch erscheinen getrennt,
 * z. B. Deutsch (Schweiz) mit „Rahm“, „Poulet“, „Peperoni“. value = Sprache bzw. Abweichung wie „de-CH“.
 */
export const PROFILE_LANGS: { value: string; lang: Lang; region?: string; label: string }[] = [
  { value: 'de', lang: 'de', label: 'Deutsch (Deutschland, Österreich)' },
  { value: 'de-CH', lang: 'de', region: 'de-CH', label: 'Deutsch (Schweiz)' },
  { value: 'en', lang: 'en', label: 'English' },
  { value: 'es', lang: 'es', label: 'Español' },
  { value: 'pt', lang: 'pt', label: 'Português' },
  { value: 'fr', lang: 'fr', label: 'Français' },
  { value: 'it', lang: 'it', label: 'Italiano' },
  { value: 'nl', lang: 'nl', label: 'Nederlands' },
  { value: 'hr', lang: 'hr', label: 'Hrvatski' },
  { value: 'el', lang: 'el', label: 'Ελληνικά' },
]

/** Bezeichnung der Profilsprache, z. B. „Deutsch (Schweiz)“ */
export function profileLangLabel(p: { lang: Lang; region?: string }): string {
  return PROFILE_LANGS.find((o) => o.value === (p.region ?? p.lang))?.label ?? LANG_LABEL[p.lang]
}

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
