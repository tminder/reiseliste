# Regelmässige Prüfungen

Stand: 2026-11-22 · Was von Hand wiederkehrend geprüft oder erneuert werden muss. Wann zuletzt, zeigt Git (Commit „Prüfung: R-…“).

| ID | Was | Wann | Wie |
| --- | --- | --- | --- |
| R-001 | Bildschirmfotos der Landingpages (`public/landing/de-1…3.webp`, `en-1…3.webp`) zeigen den aktuellen Stand der App. | Nach sichtbaren Änderungen an der Liste, den Vorschlägen oder der Karte „Dem Personal zeigen“, spätestens alle 3 Monate. | `npm run landing:shots` (Playwright, Beispieldaten „Barcelona“, danach Umwandlung in WebP). Fotos ansehen, Alt-Texte in `public/de/index.html` und `public/en/index.html` anpassen, falls sich der Inhalt geändert hat. |
