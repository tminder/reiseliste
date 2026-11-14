# 🛒 Cart on the Road

Geteilte Einkaufsliste für Reisende: Jeder schreibt in seiner Sprache, und im Laden steht jeder Artikel zusätzlich in der **Landessprache des Reiselands**.

> MVP. Das Konzept liegt im Claude-Projekt „Einkaufsliste Travel App“. Ziele, Entscheidungen, offene Fragen und technische Schulden stehen in [`docs/`](docs/README.md).

## Funktionen (MVP)

- Liste pro Reise mit Reiseland (29 Länder, Landessprachen: DE, ES, PT, FR, IT, NL, HR, EL, VI, ZH, EN). Sprache im Profil, international nutzbar, auch für Expats
- Eingabe in 11 Sprachen (DE, EN, ES, PT, FR, IT, NL, HR, EL, VI, ZH), inklusive Mengen („2 Milch“, „500 g Hackfleisch“)
- Übersetzung über ein eingebautes Wörterbuch mit 361 Grundbegriffen (inkl. Küchenutensilien und Schweizer Ausdrücken wie Rahm, Poulet, Rüebli, Chriesi, Schoggi) und eigenen Begriffen für Mexiko, Argentinien, Brasilien, die USA, Österreich und die Deutschschweiz, ohne KI und ohne laufende Kosten
- Vorschläge aus dem Wörterbuch beim Tippen
- Wörterbuch lernt aus Rückmeldungen: fehlende Wörter und „Begriff stimmt nicht?“ werden anonym gesammelt und von Hand ausgewertet (`docs/woerterbuch-feedback.md`)
- Sortierung nach Abteilungen, Abhaken, eine Ansicht für Planen und Einkaufen (Löschen nur bei Abgehakten)
- Zeigen-Karte: Landesbegriff antippen → bildschirmfüllend mit „Wo finde ich das?“ zum Vorzeigen beim Personal
- „Ich hole das“ (✋): zeigt allen, wer welchen Artikel kauft
- „Erledigte entfernen“ (automatisch nach dem Ladenbesuch bzw. nach 1 Tag, pro Liste abschaltbar) und „Schon mal gekauft“ zum schnellen Wieder-Hinzufügen
- Produktfotos pro Reiseland aus [Open Food Facts](https://world.openfoodfacts.org) (📷 am Artikel, CC BY-SA)
- Teilen per Link, QR-Code oder Teilen-Menü des Handys, Live-Sync über Supabase. „Liste beitreten“ per QR-Code oder Link, auch für die iPhone-App vom Home-Bildschirm
- Offline nutzbar (PWA). Änderungen werden synchronisiert, sobald wieder Netz da ist
- Oberfläche auf Deutsch und Englisch (folgt der Sprache im Profil, Texte in `src/locales/`, Format ICU)
- Ohne Supabase läuft die App im **Demo-Modus** nur auf dem Gerät

## Lokal starten

```bash
npm install
cp .env.example .env   # optional: Supabase-Werte eintragen
npm run dev
npm test               # Tests für Wörterbuch und Übersetzung (laufen auch vor jedem Deployment)
npm run review:export  # Prüftabellen pro Sprache für Muttersprachler (CSV in review/)
```

## Supabase einrichten (für Teilen in Echtzeit)

1. Kostenloses Projekt auf [supabase.com](https://supabase.com) anlegen.
2. **SQL Editor** öffnen, den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen.
3. **Authentication → Sign In / Providers**: „Allow anonymous sign-ins“ einschalten.
4. **Project Settings → API Keys**: `Project URL` und den **Publishable Key** (früher „anon public“) kopieren.
5. In `.env.production` eintragen. Diese Datei ist im Repo und wird für die veröffentlichte App verwendet. Für die lokale Entwicklung gegen eine andere Datenbank `.env.local` anlegen (siehe `.env.example`).

Zugriff: Jedes Gerät meldet sich anonym an. Eine Liste sehen nur Personen, die sie erstellt oder über den Link geöffnet haben. Wer den Link kennt, kann beitreten.

## Auf GitHub Pages veröffentlichen

1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. Push auf `main`. Die App ist danach unter `https://<user>.github.io/reiseliste/` erreichbar.

## Module

Optionale Funktionen werden in `src/features.ts` ein- und ausgeschaltet. Ausgeschaltete Module sind unsichtbar und senden keine Daten.

| Modul | Status | Inhalt |
| --- | --- | --- |
| `community` | aus (D-027) | Begriffe korrigieren, eigene Landesbegriffe, Korrekturvorschläge fürs Wörterbuch (D-024). Code: `src/features/community.ts` |

### Korrekturvorschläge auswerten (nur mit Community-Modul)

Nutzer können Begriffe in der Landessprache korrigieren (Tipp auf den Begriff). Die Vorschläge landen in Supabase:

```sql
select * from term_suggestions_summary;  -- im Supabase SQL Editor
```

Automatisch: Der Job „Korrekturvorschläge exportieren“ (`.github/workflows/export-suggestions.yml`) schreibt die Zusammenfassung auf Knopfdruck (mit eingeschaltetem Modul auch montags) nach `docs/korrekturvorschlaege.csv`. Dafür einmalig das Repo-Secret `SUPABASE_SECRET_KEY` anlegen (Supabase → Project Settings → API Keys → Secret key). Danach Claude sagen: „übernimm die Korrekturen“.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/data/dictionary/` | Wörterbuch: `concepts.json` (Artikel mit Abteilung, Fotokategorie, Tipp), eine Datei pro Sprache, Länder-Abweichungen wie `es-MX.json` (D-053) |
| `src/locales/` | Oberflächentexte pro Sprache (ICU MessageFormat) |
| `src/data/countries.ts` | Reiseländer → Landessprache |
| `src/lib/translate.ts` | Mengen erkennen, Eingabe dem Wörterbuch zuordnen, Vorschläge |
| `src/lib/store.ts` | Lokaler Speicher, Offline-Warteschlange, Supabase-Sync und Echtzeit |
| `src/App.tsx` | Einstieg: Weiterleitung über den Hash, Profil oder Liste anzeigen |
| `src/ui/` | Startseite (`Home.tsx`), Profil (`ProfileSetup.tsx`), Hilfen (`format.ts`) |
| `src/ui/list/` | Liste (`ListView.tsx`), Artikel (`ItemRow.tsx`), Laden (`ShopBar.tsx`), Fotos (`PhotoStrip.tsx`), Mitglieder/Bearbeiten/Teilen (`sheets.tsx`) |
| `supabase/schema.sql` | Tabellen, Zugriffsregeln, Echtzeit |

## Bekannte Grenzen / nächste Schritte

- **Wörterbuch prüfen lassen:** Die Übersetzungen sind ein Entwurf und noch nicht von Muttersprachlern geprüft, besonders Kroatisch, Griechisch, Vietnamesisch und Chinesisch.
- Bei gleichzeitigen Änderungen gewinnt die letzte („last write wins“).
- Die Abteilungsreihenfolge ist noch für alle Länder gleich.
- Laut Konzept folgen später: KI-Übersetzung für unbekannte Artikel, Produktfotos (Open Food Facts), Supermarkterkennung.
