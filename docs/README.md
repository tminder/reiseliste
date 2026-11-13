# Planung

Die Dateien zeigen immer den **aktuellen Stand**, keine Historie. Die Historie steckt in Git.

| Dokument | Inhalt | IDs |
| --- | --- | --- |
| [Ziele](01-ziele.md) | Wofür es die App gibt, was sie bewusst nicht ist, woran wir Erfolg messen | Z-1 … |
| [Entscheidungen](02-entscheidungen.md) | Aktuell gültige Entscheidungen mit Begründung | D-001 … |
| [Offene Fragen](03-offene-fragen.md) | Was aktuell noch zu klären ist | F-002 … |
| [Technische Schulden](04-technische-schulden.md) | Bekannte Schwächen, die aktuell im Code bestehen | S-001 … |

Konzepte (Entwürfe, noch nicht entschieden): [Native App](konzept-native-app.md)

## Regeln

- **Nur der aktuelle Stand.** Es gibt keine Status-Spalten, keine Einträge „erledigt“ oder „ersetzt“ und kein Änderungsprotokoll.
- **Beantwortete Frage:** Sie wird aus `03` gelöscht und als Entscheidung in `02` eingetragen, falls etwas entschieden wurde.
- **Geänderte Entscheidung:** Sie wird an Ort und Stelle überschrieben und behält ihre ID. Eine aufgehobene Entscheidung wird gelöscht.
- **Behobene Schuld:** Sie wird aus `04` gelöscht.
- **IDs werden nie wiederverwendet.** Neue Einträge bekommen die nächsthöhere Nummer, auch wenn ältere gelöscht wurden. So bleiben Verweise in Commits eindeutig.
- **Querverweise aktuell halten:** Wird eine ID gelöscht, auch die Verweise darauf in den anderen Dateien entfernen oder anpassen.
- Pro Datei steht oben „Stand: JJJJ-MM-TT“. Das Datum wird bei jeder inhaltlichen Änderung angepasst.

Gepflegt werden die Dateien automatisch bei jeder Arbeit am Projekt, siehe [`CLAUDE.md`](../CLAUDE.md).
