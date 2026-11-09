// Datenschutzerklärung und Kontakt (Betreiber in der Schweiz, privat, nicht kommerziell).
// Grundlage: Schweizer DSG (Art. 19 ff.) und – für Nutzer in der EU – DSGVO (Art. 13).
// Bei Änderungen an Datenflüssen (neue Dienste, Speicherdauer …) diese Seite mit anpassen.

import { ArrowLeft } from 'lucide-react'
import { uiLang } from './i18n'

const UPDATED = '2026-11-09'
const CONTACT = 'mail@tobiasminder.ch'

type Section = { h: string; p: (string | string[])[] }

const DE: { title: string; back: string; updated: string; sections: Section[] } = {
  title: 'Datenschutz & Kontakt',
  back: 'Zurück',
  updated: `Stand: ${UPDATED}`,
  sections: [
    {
      h: 'Wer ist verantwortlich?',
      p: [
        `Tobias Minder, Schweiz, E-Mail: ${CONTACT}. Die Reiseliste ist ein privates, nicht kommerzielles Projekt in der Testphase. Es gibt keine Werbung, kein Tracking und keine Analyse-Tools.`,
      ],
    },
    {
      h: 'Welche Daten bearbeitet die App und wozu?',
      p: [
        [
          'Profil: Dein Name und deine Sprache. Gespeichert auf deinem Gerät und – sobald du eine Liste öffnest – bei der Mitgliedschaft der Liste, damit die anderen Mitglieder sehen, wer dabei ist.',
          'Listen und Artikel: Name der Liste, Reiseland, Artikel, Mengen, wer einen Artikel hinzugefügt hat, abgehakt/gelöscht. Damit die Liste mit allen Mitgliedern geteilt und abgeglichen werden kann.',
          'Anonyme Anmeldung: Jedes Gerät erhält eine zufällige Kennung (ohne E-Mail oder Passwort), damit nur Mitglieder eine Liste sehen können.',
          'Standort: Nur wenn du es im Browser erlaubst. Er wird verwendet, um das Reiseland vorzuschlagen und den nächsten Supermarkt zu finden. Die Koordinaten werden dafür an OpenStreetMap-Dienste geschickt (siehe unten), aber von der App nirgends gespeichert. Gespeichert wird nur der gefundene Laden, und zwar auf deinem Gerät.',
          'Produktfotos: Für die Fotosuche werden Produktkategorie bzw. Suchbegriff, Land und ggf. die Ladenkette an Open Food Facts geschickt.',
          'Auf deinem Gerät (Browser-Speicher): Profil, Listen zum Offline-Gebrauch, zwischengespeicherte Fotos und Suchergebnisse. Cookies werden nicht verwendet.',
        ],
      ],
    },
    {
      h: 'An wen werden Daten übermittelt?',
      p: [
        [
          'Supabase, Inc. (USA): Datenbank und Anmeldung für Listen, Artikel und Mitglieder.',
          'GitHub, Inc. (USA): Hosting der App (GitHub Pages). Beim Aufruf fallen technisch bedingt Server-Protokolle mit IP-Adresse an.',
          'OpenStreetMap: Overpass API (FOSSGIS e.V., Deutschland, sowie Ersatzserver) für die Ladensuche, Nominatim (OpenStreetMap Foundation, Vereinigtes Königreich) für das Land – jeweils mit Koordinaten und IP-Adresse.',
          'Open Food Facts (Frankreich): Fotosuche, mit IP-Adresse.',
        ],
        'Bei Diensten in den USA und im Vereinigten Königreich kann ein Zugriff durch Behörden nach dortigem Recht nicht ausgeschlossen werden. Die Übermittlung erfolgt, soweit vorhanden, gestützt auf Angemessenheitsbeschlüsse bzw. Standardvertragsklauseln der Anbieter.',
      ],
    },
    {
      h: 'Rechtsgrundlagen (für Nutzer in der EU)',
      p: [
        'Bereitstellung der geteilten Liste: Art. 6 Abs. 1 lit. b DSGVO (Nutzung der App). Standort: Einwilligung über die Browser-Abfrage, Art. 6 Abs. 1 lit. a DSGVO – jederzeit in den Browser-Einstellungen widerrufbar. Technischer Betrieb und Sicherheit: berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO.',
      ],
    },
    {
      h: 'Wie lange werden Daten gespeichert?',
      p: [
        'Listen, Artikel und Mitgliedschaften bleiben gespeichert, bis du die Löschung verlangst. „Von diesem Gerät entfernen“ löscht nur die Kopie auf deinem Gerät. Daten auf deinem Gerät kannst du jederzeit über die Browser-Einstellungen löschen.',
      ],
    },
    {
      h: 'Deine Rechte',
      p: [
        `Du kannst Auskunft über deine Daten verlangen sowie deren Berichtigung oder Löschung. Schreib dazu an ${CONTACT}. Du kannst dich zudem beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren oder – in der EU – bei der Datenschutzaufsicht deines Landes.`,
      ],
    },
    {
      h: 'Fotos und Marken',
      p: [
        'Produktfotos stammen von Open Food Facts (Lizenz CC BY-SA) und werden zur Wiedererkennung im Laden angezeigt. Abgebildete Marken gehören ihren Inhabern.',
      ],
    },
  ],
}

const EN: typeof DE = {
  title: 'Privacy & contact',
  back: 'Back',
  updated: `Last updated: ${UPDATED}`,
  sections: [
    {
      h: 'Who is responsible?',
      p: [
        `Tobias Minder, Switzerland, email: ${CONTACT}. Travel List is a private, non-commercial project in a test phase. There are no ads, no tracking and no analytics tools.`,
      ],
    },
    {
      h: 'What data does the app process and why?',
      p: [
        [
          'Profile: your name and language. Stored on your device and – once you open a list – with your membership of that list, so other members can see who is in it.',
          'Lists and items: list name, travel country, items, quantities, who added an item, checked/deleted. So the list can be shared and synced with all members.',
          'Anonymous sign-in: each device gets a random identifier (no email or password) so that only members can see a list.',
          'Location: only if you allow it in your browser. It is used to suggest the travel country and to find the nearest supermarket. The coordinates are sent to OpenStreetMap services (see below) but are not stored anywhere by the app. Only the shop found is stored, on your device.',
          'Product photos: for the photo search, the product category or search term, the country and possibly the shop chain are sent to Open Food Facts.',
          'On your device (browser storage): profile, lists for offline use, cached photos and search results. No cookies are used.',
        ],
      ],
    },
    {
      h: 'Who receives data?',
      p: [
        [
          'Supabase, Inc. (USA): database and sign-in for lists, items and members.',
          'GitHub, Inc. (USA): hosting of the app (GitHub Pages). Server logs including IP addresses are created for technical reasons.',
          'OpenStreetMap: Overpass API (FOSSGIS e.V., Germany, plus fallback servers) for the shop search, Nominatim (OpenStreetMap Foundation, United Kingdom) for the country – each with coordinates and IP address.',
          'Open Food Facts (France): photo search, with IP address.',
        ],
        'For services in the USA and the United Kingdom, access by authorities under local law cannot be ruled out. Transfers rely, where available, on adequacy decisions or the providers’ standard contractual clauses.',
      ],
    },
    {
      h: 'Legal bases (for users in the EU)',
      p: [
        'Providing the shared list: Art. 6(1)(b) GDPR (use of the app). Location: consent via the browser prompt, Art. 6(1)(a) GDPR – revocable at any time in your browser settings. Technical operation and security: legitimate interest, Art. 6(1)(f) GDPR.',
      ],
    },
    {
      h: 'How long is data kept?',
      p: [
        '“Remove from this device” only deletes the copy on your device. Lists, items and memberships are kept until you request deletion. You can delete data on your device at any time in your browser settings.',
      ],
    },
    {
      h: 'Your rights',
      p: [
        `You can request access to your data as well as correction or deletion. Write to ${CONTACT}. You can also complain to the Swiss Federal Data Protection and Information Commissioner (FDPIC) or – in the EU – to the data protection authority of your country.`,
      ],
    },
    {
      h: 'Photos and trademarks',
      p: ['Product photos come from Open Food Facts (licence CC BY-SA) and are shown to help recognise products in the shop. Trademarks shown belong to their owners.'],
    },
  ],
}

export default function Privacy() {
  const c = uiLang() === 'de' ? DE : EN
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
