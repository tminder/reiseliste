# Proviant – Anweisungen für Claude

Geteilte Reise-Einkaufsliste: Eingabe in der eigenen Sprache, Anzeige in der Landessprache. Überblick: `README.md`.
Kommuniziere mit dem Projektinhaber auf Deutsch.

## Planungsdateien aktiv pflegen (Pflicht)

`docs/01-ziele.md`, `docs/02-entscheidungen.md`, `docs/03-offene-fragen.md` und `docs/04-technische-schulden.md` zeigen immer den **aktuellen Stand**. Halte sie bei jeder Arbeit am Projekt automatisch aktuell, ohne dass du darum gebeten wirst. Das gilt für Code-Änderungen ebenso wie für reine Gespräche über Produkt oder Technik.

Nach jeder Aufgabe prüfst du:

| Wenn … | dann … |
| --- | --- |
| etwas entschieden wurde (vom Inhaber oder bei der Umsetzung) | neue `D-` eintragen oder die bestehende an Ort und Stelle aktualisieren |
| eine Entscheidung aufgehoben wurde | `D-` löschen |
| eine neue Unklarheit auftaucht, die der Inhaber klären muss | neue `F-` eintragen |
| eine Frage beantwortet ist | `F-` löschen, die Antwort als `D-` festhalten |
| du eine Abkürzung nimmst, etwas ungetestet lässt oder eine Schwäche entdeckst | neue `S-` eintragen |
| eine Schuld behoben ist | `S-` löschen |
| sich Ziele oder Zielgruppen ändern | `01-ziele.md` anpassen |

Regeln (Details in `docs/README.md`):

- Keine Historie, keine Status-Spalten, keine Einträge wie „erledigt“ oder „ersetzt“. Die Historie steckt in Git.
- IDs nie wiederverwenden. Neue Einträge bekommen die nächsthöhere Nummer, die es je gab. Die höchste vergebene Nummer findest du per `git log -p -- docs/`.
- Verweise auf gelöschte IDs in allen Dateien entfernen oder anpassen.
- „Stand: JJJJ-MM-TT“ oben in jeder geänderten Datei auf das heutige Datum setzen.
- Die Planungsänderungen in denselben Commit wie die zugehörige Code-Änderung packen. Bei reinen Planungsänderungen: eigener Commit „Planung: …“.
- Sag dem Inhaber am Ende kurz, welche IDs du angelegt, geändert oder gelöscht hast.

## Technik

- React 19, Vite, TypeScript, PWA (`vite-plugin-pwa`), Supabase. Deployment auf GitHub Pages per Push auf `main`.
- `npm run build` muss fehlerfrei durchlaufen, bevor du pushst.
- Wörterbuch: `src/data/dictionary/` – `concepts.json` (ein Eintrag pro Artikel), eine Datei pro Sprache, Länder-Abweichungen als `<sprache>-<LAND>.json` (D-053). Oberflächentexte: `src/locales/<sprache>.json` im ICU-Format.
- Wörterbuch-Feedback auswerten (Inhaber sagt z. B. „Wörterbuch-Feedback auswerten“): Regeln in `docs/woerterbuch-feedback.md` (D-059).
- Datenbank-Änderungen immer in `supabase/schema.sql` nachziehen. Das Skript muss mehrfach ausführbar bleiben (`if not exists`, `drop policy if exists`).
- Datenschutz: Kommt ein neuer externer Dienst dazu oder ändert sich, welche Daten wohin gehen oder wie lange sie gespeichert werden, `src/Privacy.tsx` (DE und EN) im selben Commit anpassen.
