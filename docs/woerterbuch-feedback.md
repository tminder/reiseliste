# Wörterbuch aus Nutzer-Rückmeldungen verbessern (D-059)

Stand: 2026-11-13 · Ohne Muttersprachler, KI vorerst nur von Hand (ohne API).

## Ablauf

1. **Sammeln (läuft automatisch in der App):**
   - Eingaben ohne Übersetzung („keine Übersetzung“) meldet die App anonym, ausser die eigene Sprache ist die Landessprache.
   - Auf der Zeigen-Karte gibt es „Begriff stimmt nicht?“, wahlweise mit besserem Begriff.
   - Jede Meldung pro Gerät nur einmal. Gespeichert in Supabase (`dictionary_feedback`), 180 Tage.
2. **Exportieren (von Hand):** GitHub → Actions → „Wörterbuch-Feedback exportieren“ → Run workflow.
   Standard: nur Einträge von mindestens 2 verschiedenen Personen. Ergebnis: `docs/woerterbuch-feedback.csv`.
   Bei Vorschlägen stehen in `off_term` und `off_suggestion` die Zahl der Produkte im Reiseland bei Open Food Facts,
   deren Name den Begriff enthält.
3. **Auswerten mit Claude (von Hand):** Claude in diesem Repo bitten: „Wörterbuch-Feedback auswerten“.

## Regeln für Claude beim Auswerten

- Nur Einträge aus `docs/woerterbuch-feedback.csv` verwenden, nichts dazuerfinden.
- **miss** (fehlender Artikel): Ist es ein üblicher Supermarkt-Artikel, neuen Eintrag in `concepts.json` und in
  **allen** Sprachdateien anlegen (der Test meldet Lücken). Passt die Eingabe zu einem bestehenden Artikel, nur den
  Namen als weitere Variante in der Sprache der Eingabe ergänzen. Private oder unsinnige Eingaben ignorieren.
- **wrong** mit Vorschlag: Nur übernehmen, wenn `off_suggestion` deutlich mehr Treffer hat als `off_term`, oder
  `off_term` 0 ist und `off_suggestion` grösser als 0. Sonst nur festhalten, nicht ändern.
- **wrong** ohne Vorschlag: Begriff selbst prüfen und eine Alternative nur übernehmen, wenn sie in Open Food Facts
  belegt ist (Abfrage im Workflow oder Liste im Antworttext an den Inhaber).
- Jede Änderung ein zweites Mal unabhängig gegenprüfen (eigener Durchgang „Stimmt das wirklich?“). Nur was beide
  Durchgänge bestätigen, kommt ins Wörterbuch. Landesabweichungen (z. B. Mexiko) in die Datei `es-MX.json` usw.
- Danach `npm test`, Commit „Wörterbuch: Rückmeldungen übernommen“, dem Inhaber eine kurze Liste der Änderungen und
  der bewusst nicht übernommenen Einträge geben.
