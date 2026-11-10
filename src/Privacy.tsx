// Datenschutzerklärung und Kontakt (Betreiber in der Schweiz, privat, nicht kommerziell).
// Grundlage: Schweizer DSG (Art. 19 ff.) und – für Nutzer in der EU – DSGVO (Art. 13).
// Bei Änderungen an Datenflüssen (neue Dienste, Speicherdauer …) diese Seite mit anpassen.

import { ArrowLeft } from 'lucide-react'
import { FEATURES } from './features'
import { uiLang } from './i18n'

const UPDATED = '2026-11-10'
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
        `Tobias Minder, Schweiz, E-Mail: ${CONTACT}. Proviant ist ein privates, nicht kommerzielles Projekt in der Testphase. Es gibt keine Werbung, kein Tracking und keine Analyse-Tools.`,
      ],
    },
    {
      h: 'Welche Daten bearbeitet die App und wozu?',
      p: [
        [
          'Profil: Dein Name und deine Sprache. Gespeichert auf deinem Gerät und – sobald du eine Liste öffnest – bei der Mitgliedschaft der Liste, damit die anderen Mitglieder sehen, wer dabei ist. Wer den Link zur Liste hat, sieht Namen und Sprachen der Mitglieder schon vor dem Beitreten, um sich auf einem neuen Gerät als bestehendes Mitglied auszuwählen.',
          'Listen und Artikel: Name der Liste, Reiseland, Artikel, Mengen, wer einen Artikel hinzugefügt hat, wer ihn holt, abgehakt/gelöscht. Damit die Liste mit allen Mitgliedern geteilt und abgeglichen werden kann.',
          'Anonyme Anmeldung: Jedes Gerät erhält eine zufällige Kennung (ohne E-Mail oder Passwort), damit nur Mitglieder eine Liste sehen können.',
          'Standort: Nur wenn du es im Browser erlaubst. Er wird verwendet, um das Reiseland vorzuschlagen bzw. beim Grenzübertritt anzupassen und den nächsten Supermarkt zu finden. Die Koordinaten werden dafür an OpenStreetMap-Dienste geschickt (siehe unten), aber nicht auf einem Server gespeichert. Auf deinem Gerät werden die Stelle der letzten Suche und die gefundenen Läden bis zu 12 Stunden gespeichert, damit nicht unnötig neu gesucht wird.',
          'Kamera: Nur zum Scannen des QR-Codes einer Liste und nur mit deiner Erlaubnis. Das Bild wird ausschliesslich auf deinem Gerät ausgewertet, nicht gespeichert und nicht gesendet.',
          'Produktfotos: Für die Fotosuche werden Produktkategorie bzw. Suchbegriff, Land und ggf. die Ladenkette an Open Food Facts geschickt.',
          // Nur mit Community-Modul (D-027)
          ...(FEATURES.community
            ? ['Korrekturvorschläge: Korrigierst du einen Begriff in der Landessprache, wird der Vorschlag (Artikel, alter und neuer Begriff, Land, Liste, anonyme Kennung) gespeichert, damit der Betreiber das Wörterbuch verbessern kann. Eine Zusammenfassung ohne Kennungen (Begriffe, Sprache, Anzahl, Beispiel-Artikel) wird wöchentlich in das öffentliche Code-Repository der App übertragen.']
            : []),
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
        `Listen, Artikel${FEATURES.community ? ', Mitgliedschaften und Korrekturvorschläge' : ' und Mitgliedschaften'} bleiben gespeichert, bis du die Löschung verlangst. „Aus meinen Listen entfernen“ löscht die Kopie auf deinem Gerät und deine Mitgliedschaft. Die Liste selbst bleibt für die anderen Mitglieder bestehen. Daten auf deinem Gerät kannst du jederzeit über die Browser-Einstellungen löschen.`,
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
        `Tobias Minder, Switzerland, email: ${CONTACT}. Proviant is a private, non-commercial project in a test phase. There are no ads, no tracking and no analytics tools.`,
      ],
    },
    {
      h: 'What data does the app process and why?',
      p: [
        [
          'Profile: your name and language. Stored on your device and – once you open a list – with your membership of that list, so other members can see who is in it. Anyone with the link to the list can see the members’ names and languages before joining, so they can pick themselves as an existing member on a new device.',
          'Lists and items: list name, travel country, items, quantities, who added an item, who is getting it, checked/deleted. So the list can be shared and synced with all members.',
          'Anonymous sign-in: each device gets a random identifier (no email or password) so that only members can see a list.',
          'Location: only if you allow it in your browser. It is used to suggest the travel country (or update it when you cross a border) and to find the nearest supermarket. The coordinates are sent to OpenStreetMap services (see below) but not stored on any server. The place of the last search and the shops found are stored on your device for up to 12 hours to avoid unnecessary new searches.',
          'Camera: only to scan a list’s QR code and only with your permission. The image is analysed on your device only, never stored or sent.',
          'Product photos: for the photo search, the product category or search term, the country and possibly the shop chain are sent to Open Food Facts.',
          // Nur mit Community-Modul (D-027)
          ...(FEATURES.community
            ? ['Correction suggestions: if you correct a term in the local language, the suggestion (item, old and new term, country, list, anonymous identifier) is stored so the operator can improve the dictionary. A summary without identifiers (terms, language, count, example items) is copied weekly to the app’s public code repository.']
            : []),
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
        `“Remove from my lists” deletes the copy on your device and your membership. The list itself stays for the other members. Lists, items${FEATURES.community ? ', memberships and correction suggestions' : ' and memberships'} are kept until you request deletion. You can delete data on your device at any time in your browser settings.`,
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
