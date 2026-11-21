// Feste Seiten ohne JavaScript (D-091): Datenschutz und „Über das Projekt“, je Deutsch und Englisch.
// Werden beim Build von vite.config.ts erzeugt. Gleicher Stil wie die Startseiten /de/ und /en/ (D-090).
// Die Datenschutztexte kommen aus src/privacyText.ts, derselben Quelle wie in der App.

import { CONTACT, PRIVACY_DE, PRIVACY_EN, type Section } from './privacyText.ts'

type Lang = 'de' | 'en'

const BASE = 'https://cartontheroad.app'

/** Pfade der festen Seiten je Sprache */
export const PATHS = {
  home: { de: '/de/', en: '/en/' },
  privacy: { de: '/datenschutz/', en: '/privacy/' },
  about: { de: '/ueber/', en: '/about/' },
} as const

type Page = keyof typeof PATHS

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Text mit E-Mail-Adresse: Adresse als Link */
const withMail = (s: string) => esc(s).replace(esc(CONTACT), `<a href="mailto:${CONTACT}">${CONTACT}</a>`)

function layout(lang: Lang, page: Page, title: string, description: string, body: string): string {
  const other: Lang = lang === 'de' ? 'en' : 'de'
  const t = (de: string, en: string) => (lang === 'de' ? de : en)
  const alt = (l: Lang) => `<link rel="alternate" hreflang="${l}" href="${BASE}${PATHS[page][l]}" />`
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self'; style-src 'self'; font-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'" />
    <title>${esc(title)} · Cart on the Road</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${BASE}${PATHS[page][lang]}" />
    ${alt('de')}
    ${alt('en')}
    <link rel="alternate" hreflang="x-default" href="${BASE}${PATHS[page].en}" />
    <link rel="icon" type="image/svg+xml" href="/logo-transparent.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#0f766e" />
    <link rel="stylesheet" href="/landing/landing.css" />
  </head>
  <body>
    <header>
      <a class="brand" href="${PATHS.home[lang]}"><img src="/favicon.svg" alt="" /><span>Cart on the Road</span></a>
      <a class="lang" href="${PATHS[page][other]}" hreflang="${other}" lang="${other}">${other === 'de' ? 'Deutsch' : 'English'}</a>
    </header>
    <main class="text">
${body}
      <p class="end"><a class="cta" href="/">${t('App öffnen', 'Open the app')}</a></p>
    </main>
${footer(lang)}
  </body>
</html>
`
}

/** Fusszeile aller festen Seiten, auch der Startseiten */
export function footer(lang: Lang): string {
  const t = (de: string, en: string) => (lang === 'de' ? de : en)
  return `    <footer>
      <a href="${PATHS.about[lang]}">${t('Über das Projekt', 'About')}</a>
      <a href="${PATHS.privacy[lang]}">${t('Datenschutz', 'Privacy')}</a>
      <a href="mailto:${CONTACT}">${t('Kontakt', 'Contact')}</a>
    </footer>`
}

function sections(list: Section[]): string {
  return list
    .map(
      (s) =>
        `      <section>\n        <h2>${esc(s.h)}</h2>\n` +
        s.p.map((x) => (Array.isArray(x) ? `        <ul>${x.map((li) => `<li>${withMail(li)}</li>`).join('')}</ul>` : `        <p>${withMail(x)}</p>`)).join('\n') +
        `\n      </section>`,
    )
    .join('\n')
}

export function privacyPage(lang: Lang): string {
  const c = lang === 'de' ? PRIVACY_DE : PRIVACY_EN
  const body = `      <h1>${esc(c.title)}</h1>\n      <p class="small">${esc(c.updated)}</p>\n${sections(c.sections)}`
  return layout(
    lang,
    'privacy',
    c.title,
    lang === 'de' ? 'Welche Daten Cart on the Road bearbeitet, wozu und wo sie liegen.' : 'Which data Cart on the Road processes, why, and where it is stored.',
    body,
  )
}

/** „Über das Projekt“ (D-091): wer dahintersteht, warum, was es ist. Statt eines Impressums mit Postadresse. */
const ABOUT: Record<Lang, { title: string; description: string; sections: Section[] }> = {
  de: {
    title: 'Über das Projekt',
    description: 'Wer hinter Cart on the Road steht und warum es die App gibt.',
    sections: [
      {
        h: 'Wer steht dahinter?',
        p: [`Cart on the Road ist ein privates Projekt von Tobias Minder aus der Schweiz. Kontakt: ${CONTACT}.`],
      },
      {
        h: 'Wie die Idee entstand',
        p: [
          'Im Supermarkt in Spanien, vor dem Kühlregal: Auf dem Zettel steht „Rahm“, im Regal aber nur Packungen mit „nata“. Übersetzungs-Apps helfen bei ganzen Sätzen, aber nicht beim Einkaufszettel, und schon gar nicht, wenn man die Liste mit anderen teilt.',
          'Darum schreibt man bei Cart on the Road in der eigenen Sprache, und im Laden steht jeder Artikel so, wie er im Reiseland heisst.',
        ],
      },
      {
        h: 'Was die App ist',
        p: [
          [
            'Gratis, ohne Werbung und ohne Tracking.',
            'Ohne Konto: Es braucht weder E-Mail-Adresse noch Passwort.',
            'Die Begriffe kommen aus einem von Hand gepflegten Wörterbuch, nicht von einer KI.',
            'Noch in der Testphase: Es gibt Lücken und Fehler, und Rückmeldungen helfen sehr.',
          ],
        ],
      },
      {
        h: 'Rückmeldungen',
        p: [`Fehlt ein Begriff, stimmt eine Übersetzung nicht oder klemmt etwas? Schreib an ${CONTACT}. In der App gibt es dafür auch „Begriff stimmt nicht?“ im Menü „…“ jedes Artikels.`],
      },
    ],
  },
  en: {
    title: 'About',
    description: 'Who is behind Cart on the Road and why the app exists.',
    sections: [
      {
        h: 'Who is behind it?',
        p: [`Cart on the Road is a private project by Tobias Minder from Switzerland. Contact: ${CONTACT}.`],
      },
      {
        h: 'How the idea came about',
        p: [
          'In a supermarket in Spain, in front of the dairy fridge: the list says “cream”, but the shelf only has packs labelled “nata”. Translation apps help with whole sentences, but not with a shopping list, let alone one you share with others.',
          'So with Cart on the Road you write in your own language, and in the shop every item appears the way it is called in the country you are travelling in.',
        ],
      },
      {
        h: 'What the app is',
        p: [
          [
            'Free, no ads and no tracking.',
            'No account: no email address or password needed.',
            'The words come from a hand-maintained dictionary, not from AI.',
            'Still in testing: there are gaps and mistakes, and feedback helps a lot.',
          ],
        ],
      },
      {
        h: 'Feedback',
        p: [`A word is missing, a translation is wrong or something doesn’t work? Write to ${CONTACT}. In the app you can also use “Wrong term?” in the “…” menu of each item.`],
      },
    ],
  },
}

export function aboutPage(lang: Lang): string {
  const c = ABOUT[lang]
  return layout(lang, 'about', c.title, c.description, `      <h1>${esc(c.title)}</h1>\n${sections(c.sections)}`)
}

/** Alle festen Seiten: Dateiname → Inhalt */
export function staticPages(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const lang of ['de', 'en'] as const) {
    out[`${PATHS.privacy[lang].slice(1)}index.html`] = privacyPage(lang)
    out[`${PATHS.about[lang].slice(1)}index.html`] = aboutPage(lang)
  }
  return out
}
