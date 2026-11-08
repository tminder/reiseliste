# Planung

| Dokument | Inhalt | IDs |
| --- | --- | --- |
| [Ziele](01-ziele.md) | Wofür es die App gibt, was sie bewusst nicht ist, woran wir Erfolg messen | Z-1 … |
| [Entscheidungen](02-entscheidungen.md) | Getroffene Entscheidungen mit Begründung | D-001 … |
| [Offene Fragen](03-offene-fragen.md) | Was noch zu klären ist | F-001 … |
| [Technische Schulden](04-technische-schulden.md) | Bewusste Abkürzungen und bekannte Schwächen im Code | S-001 … |

## Regeln

- IDs werden fortlaufend vergeben und **nie wiederverwendet**, auch wenn ein Eintrag erledigt oder verworfen ist.
- Wird eine offene Frage entschieden, bekommt sie den Status „entschieden → D-0xx“, und die Entscheidung verweist zurück auf die Frage.
- Eine Entscheidung wird nicht gelöscht, sondern auf „ersetzt durch D-0xx“ gesetzt.
- Ist eine Schuld behoben, bekommt sie den Status „erledigt“ mit Commit oder PR.
- In Commits und Issues auf die IDs verweisen, z. B. „behebt S-004“.
