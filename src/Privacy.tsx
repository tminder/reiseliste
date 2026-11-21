// Datenschutzerklärung und Kontakt in der App (Betreiber in der Schweiz, privat, nicht kommerziell).
// Die Texte stehen in src/privacyText.ts (gleiche Quelle wie /datenschutz/ und /privacy/, D-091).

import { ArrowLeft } from 'lucide-react'
import { uiLang } from './i18n'
import { PRIVACY_DE, PRIVACY_EN } from './privacyText'

export default function Privacy() {
  const c = uiLang() === 'de' ? PRIVACY_DE : PRIVACY_EN
  return (
    <main className="page narrow privacy">
      <a
        href="#/"
        className="back"
        onClick={(e) => {
          if (history.length > 1) {
            e.preventDefault()
            history.back()
          }
        }}
      >
        <ArrowLeft size={18} /> {c.back}
      </a>
      <h1>{c.title}</h1>
      <p className="muted small-text">{c.updated}</p>
      {c.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((x, i) =>
            Array.isArray(x) ? (
              <ul key={i}>
                {x.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{x}</p>
            ),
          )}
        </section>
      ))}
    </main>
  )
}
