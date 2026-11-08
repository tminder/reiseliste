# 🛒 Reiseliste

Geteilte Einkaufsliste für Reisende: Jeder schreibt in seiner Sprache, und im Laden steht jeder Artikel zusätzlich in der **Landessprache des Reiselands**.

> MVP. Das Konzept liegt im Claude-Projekt „Einkaufsliste Travel App“. Ziele, Entscheidungen, offene Fragen und technische Schulden stehen in [`docs/`](docs/README.md).

## Funktionen (MVP)

- Liste pro Reise mit Reiseland (18 Länder, Landessprachen: ES, PT, FR, IT, NL, HR, EL, EN)
- Eingabe in 9 Sprachen (DE, EN, ES, PT, FR, IT, NL, HR, EL), inklusive Mengen („2 Milch“, „500 g Hackfleisch“)
- Übersetzung über ein eingebautes Wörterbuch mit 132 Grundbegriffen, ohne KI und ohne laufende Kosten
- Vorschläge beim Tippen. Unbekannte Artikel können mit einem eigenen Landesbegriff ergänzt werden
- Sortierung nach Abteilungen, Abhaken, „Ladenansicht“ mit grosser Schrift
- Teilen per Link, QR-Code oder Teilen-Menü des Handys, Live-Sync über Supabase
- Offline nutzbar (PWA). Änderungen werden synchronisiert, sobald wieder Netz da ist
- Ohne Supabase läuft die App im **Demo-Modus** nur auf dem Gerät

## Lokal starten

```bash
npm install
cp .env.example .env   # optional: Supabase-Werte eintragen
npm run dev
```

## Supabase einrichten (für Teilen in Echtzeit)

1. Kostenloses Projekt auf [supabase.com](https://supabase.com) anlegen.
2. **SQL Editor** öffnen, den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen.
3. **Authentication → Sign In / Providers**: „Allow anonymous sign-ins“ einschalten.
4. **Project Settings → API**: `Project URL` und `anon public` Key kopieren.
5. Lokal in `.env` eintragen (siehe `.env.example`).

Zugriff: Jedes Gerät meldet sich anonym an. Eine Liste sehen nur Personen, die sie erstellt oder über den Link geöffnet haben. Wer den Link kennt, kann beitreten.

## Auf GitHub Pages veröffentlichen

1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables**: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` anlegen. Der anon-Key ist öffentlich und darf in die App, deshalb reicht hier „Variables“.
3. Push auf `main`. Die App ist danach unter `https://<user>.github.io/reiseliste/` erreichbar.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/data/dictionary.ts` | Wörterbuch: eine Zeile pro Artikel, Spalten pro Sprache, Hinweise |
| `src/data/countries.ts` | Reiseländer → Landessprache |
| `src/lib/translate.ts` | Mengen erkennen, Eingabe dem Wörterbuch zuordnen, Vorschläge |
| `src/lib/store.ts` | Lokaler Speicher, Offline-Warteschlange, Supabase-Sync und Echtzeit |
| `src/App.tsx` | Oberfläche: Profil, Listen, Liste, Teilen |
| `supabase/schema.sql` | Tabellen, Zugriffsregeln, Echtzeit |

## Bekannte Grenzen / nächste Schritte

- **Wörterbuch prüfen lassen:** Die Übersetzungen sind ein Entwurf und noch nicht von Muttersprachlern geprüft, besonders Kroatisch und Griechisch.
- Bei gleichzeitigen Änderungen gewinnt die letzte („last write wins“).
- Die Abteilungsreihenfolge ist noch für alle Länder gleich.
- Laut Konzept folgen später: KI-Übersetzung für unbekannte Artikel, Produktfotos (Open Food Facts), Supermarkterkennung.
