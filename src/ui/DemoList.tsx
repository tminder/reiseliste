// Beispiel-Liste auf dem ersten Bildschirm (D-068): zeigt in Sekunden, was die App ist –
// zuerst eine gemeinsame Einkaufsliste, dazu jeder Artikel in der Sprache des Reiselands.
// Nur Anzeige, nichts davon wird gespeichert.
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { Lang } from '../data/dictionary'
import { COUNTRY_BY_CODE } from '../data/countries'
import { countryName, t } from '../i18n'
import { isLoaded, loadLanguages, nameIn, onLanguagesLoaded } from '../lib/translate'
import { reducedMotion } from '../lib/motion'

const ITEMS: { id: string; who: string; done?: boolean }[] = [
  { id: 'milch', who: 'Anna' },
  { id: 'brot', who: 'Ben', done: true },
  { id: 'tomaten', who: 'Anna' },
]

export function DemoList({ lang }: { lang: Lang }) {
  // Reiseland des Beispiels: Spanien, für Spanischsprachige Italien
  const country = lang === 'es' ? 'IT' : 'ES'
  const target = COUNTRY_BY_CODE.get(country)!.lang
  const [, setTick] = useState(0)
  useEffect(() => {
    void loadLanguages([lang, target])
    return onLanguagesLoaded(() => setTick((n) => n + 1))
  }, [lang, target])
  // Zeilen erscheinen nacheinander, als würde jemand schreiben
  const [shown, setShown] = useState(() => (reducedMotion() ? ITEMS.length : 0))
  useEffect(() => {
    if (shown >= ITEMS.length) return
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : 700)
    return () => window.clearTimeout(id)
  }, [shown])
  const ready = isLoaded(lang) && isLoaded(target)
  const flag = COUNTRY_BY_CODE.get(country)!.flag
  return (
    <div className="demo-list card" aria-label={t('demoAria')}>
      <div className="demo-head">
        <strong>{t('demoListName', { country: countryName(country) })}</strong>
        <span className="muted small-text">Anna, Ben</span>
      </div>
      {ready &&
        ITEMS.slice(0, shown).map((it) => (
          <div key={it.id} className={`demo-item ${it.done ? 'checked' : ''}`}>
            <span className="check" aria-hidden="true">
              {it.done && <Check size={16} strokeWidth={3} />}
            </span>
            <span className="demo-txt">{nameIn(it.id, lang)}</span>
            <span className="demo-sub">
              <span className="local">
                {flag} {nameIn(it.id, target)}
              </span>
              <span className="muted"> · {it.who}</span>
            </span>
          </div>
        ))}
    </div>
  )
}
