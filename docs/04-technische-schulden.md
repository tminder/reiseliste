# Technische Schulden

Priorität: **hoch**: vor dem Test mit echten Nutzern beheben · **mittel**: vor einem öffentlichen Start · **niedrig**: wenn es stört

Status: **offen** · **in Arbeit** · **erledigt (Commit/PR)**

| ID | Schuld | Auswirkung | Lösungsidee | Prio | Status |
| --- | --- | --- | --- | --- | --- |
| S-001 | Das Wörterbuch hat Claude geschrieben, kein Muttersprachler hat es geprüft. Es steht als Textblock im Code. | Falsche oder unübliche Begriffe im Laden. | Pro Sprache eine Prüftabelle für Muttersprachler (F-001). Das Wörterbuch in eine eigene Datendatei (JSON/CSV) auslagern. | hoch | offen |
| S-002 | Es gibt keine automatisierten Tests, weder für die Übersetzung noch für den Sync oder die Oberfläche. | Fehler bei Änderungen am Wörterbuch oder an der Zuordnung fallen nicht auf. | Unit-Tests mit Vitest für `translate.ts` (Mengen, Pluralformen, Sprachpriorität). E2E-Test mit Playwright für den Hauptablauf. | hoch | offen |
| S-003 | Der Supabase-Sync und `supabase/schema.sql` wurden nie gegen ein echtes Projekt getestet. | Teilen funktioniert vielleicht gar nicht oder nur teilweise, z. B. die Echtzeit-Updates oder die Zugriffsregeln. | Ein Supabase-Projekt anlegen, mit zwei Geräten bzw. Browsern testen und Fehler beheben. | hoch | offen |
| S-004 | Bei einem Konflikt gewinnt immer die ganze Zeile, nicht das einzelne Feld. | Hakt Person A einen Artikel ab, während Person B ihn ändert, geht eine der beiden Änderungen verloren. | Pro Feld zusammenführen, oder Änderungen als Operationen statt ganzer Zeilen senden. | mittel | offen |
| S-005 | `updated_at` setzt das Gerät mit seiner eigenen Uhr. | Bei falsch gestellter Uhr gewinnt die falsche Änderung. | Den Zeitstempel per Trigger auf dem Server setzen. Für die Konfliktregel einen Server-Zeitstempel oder Versionszähler verwenden. | mittel | offen |
| S-006 | Gespeichert wird im `localStorage` mit einer gemeinsamen Warteschlange für alle Listen. | Der Platz ist begrenzt (etwa 5 MB), und schlägt ein Eintrag fehl, blockiert er alle folgenden. | Auf IndexedDB umstellen. Fehlerhafte Einträge überspringen und erneut versuchen. | mittel | offen |
| S-007 | Alle Komponenten stehen in einer Datei, `App.tsx`. | Schwer zu überblicken und zu erweitern. | In `components/` und `pages/` aufteilen. | niedrig | offen |
| S-008 | Die Bedienoberfläche ist nur auf Deutsch, auch die Hinweise (`HINTS`). | Mitreisende mit anderer Sprache verstehen die Bedienung nicht (Z-2). | Die Texte in Sprachdateien auslagern (i18n), mindestens Englisch ergänzen. | mittel | offen |
| S-009 | Die Reihenfolge der Abteilungen ist für alle Länder gleich und fest einprogrammiert. | Die Sortierung passt nicht zu jedem Laden. | Reihenfolge pro Land konfigurierbar machen (F-011). | niedrig | offen |
| S-010 | Mitglieder lassen sich nicht entfernen, der Link lässt sich nicht erneuern, und eine Liste lässt sich nur auf dem eigenen Gerät „vergessen“, nicht löschen. | Ein weitergeleiteter Link bleibt für immer gültig. | Den Link neu erzeugen können (neuer Beitrittscode statt Listen-ID). Ersteller als Eigentümer mit Löschrecht. | mittel | offen |
| S-011 | Das App-Icon gibt es nur als SVG. | Auf dem iOS-Home-Bildschirm fehlt das Icon oder es sieht unscharf aus. | PNG-Icons (180, 192, 512 px) und `apple-touch-icon` ergänzen. | mittel | offen |
| S-012 | Die Zuordnung zum Wörterbuch ist grob: Endungen werden abgeschnitten und es wird nach enthaltenen Wörtern gesucht. | Mögliche falsche Treffer, besonders in anderen Sprachen als Deutsch. | Endungsregeln pro Sprache, Tests mit echten Eingaben, Anzeige von „Meintest du …?“. | mittel | offen |
| S-013 | Die CI baut nur. Lint und Typprüfung laufen nicht getrennt, Tests gibt es nicht. | Fehler landen unbemerkt auf `main` und werden direkt veröffentlicht. | Lint- und Test-Schritte im Workflow, Pull Requests statt direkter Pushes. | niedrig | offen |
| S-014 | Welche Listen man hat, weiss nur das Gerät, genauer gesagt der `localStorage`. | Löscht man die Browserdaten oder wechselt das Gerät, verschwindet die Übersicht. Mit dem Link lässt sich die Liste aber wieder öffnen. | Die Listen aus `list_members` des anonymen Kontos laden. Optional ein richtiges Konto anbieten. | niedrig | offen |
| S-015 | „Liste entfernen“ auf der Startseite lädt die ganze Seite neu (`location.reload`). | Wirkt unschön und lädt unnötig neu. | Die Listen als React-State halten. | niedrig | offen |
| S-016 | Gelöschte Artikel bleiben dauerhaft in der Datenbank (D-012). | Die Daten wachsen weiter an. | Ein Job räumt `deleted = true`-Einträge nach X Tagen weg (F-010). | niedrig | offen |
