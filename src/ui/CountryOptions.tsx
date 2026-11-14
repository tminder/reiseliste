// Optionen der Reiseland-Auswahl (D-063): oben Vorschläge (Standort, zuletzt verwendete Reiseländer),
// darunter alle Länder alphabetisch in der Sprache der Oberfläche.
import { useMemo } from 'react'
import type { Lang } from '../data/dictionary'
import { COUNTRIES, COUNTRY_BY_CODE, LANG_LABEL } from '../data/countries'
import { countryName, t, uiLang } from '../i18n'
import { cachedCountry } from '../lib/country'
import { knownLists, localLastChange } from '../lib/store'

const MAX_SUGGESTED = 3

/** Vorgeschlagene Länder: aktueller Standort, dann Reiseländer der zuletzt geänderten Listen; ohne Länder der eigenen Sprache */
function suggestedCountries(lang: Lang): string[] {
  const recent = knownLists()
    .map((l) => ({ c: l.country, at: localLastChange(l.id) ?? l.updatedAt ?? '' }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((x) => x.c)
  const out: string[] = []
  for (const code of [cachedCountry(), ...recent]) {
    if (!code || out.includes(code)) continue
    const c = COUNTRY_BY_CODE.get(code)
    if (!c || c.lang === lang) continue
    out.push(code)
    if (out.length === MAX_SUGGESTED) break
  }
  return out
}

const label = (code: string) => {
  const c = COUNTRY_BY_CODE.get(code)!
  return `${c.flag} ${countryName(code)} – ${LANG_LABEL[c.lang]}`
}

export function CountryOptions({ lang }: { lang: Lang }) {
  const ui = uiLang()
  const sorted = useMemo(() => COUNTRIES.map((c) => c.code).sort((a, b) => countryName(a).localeCompare(countryName(b), ui)), [ui])
  const top = useMemo(() => suggestedCountries(lang), [lang])
  const all = sorted.map((code) => (
    <option key={code} value={code}>
      {label(code)}
    </option>
  ))
  if (!top.length) return <>{all}</>
  return (
    <>
      <optgroup label={t('countriesSuggested')}>
        {top.map((code) => (
          <option key={`top-${code}`} value={code}>
            {label(code)}
          </option>
        ))}
      </optgroup>
      <optgroup label={t('countriesAll')}>{all}</optgroup>
    </>
  )
}
