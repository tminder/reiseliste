# Entscheidungen

Stand: 2026-11-08 · Nur aktuell gültige Entscheidungen. Format: Entscheidung · Begründung · Folgen.

---

## D-001 · Web-App (PWA) zuerst, native Apps später

- **Entscheidung:** Das MVP ist eine installierbare Web-App (PWA). Es gibt noch keine App im App Store oder bei Google Play.
- **Begründung:** Kein Store-Review, keine Gebühren, sofort per Link nutzbar (Z-3). Eine Codebasis für iPhone und Android.
- **Folgen:** Kein Geofencing im Hintergrund und eingeschränkter Zugriff auf die Kamera. Push-Benachrichtigungen auf iOS sind nur eingeschränkt möglich. Siehe D-009.

## D-002 · React, Vite und TypeScript

- **Entscheidung:** Die Oberfläche ist mit React 19 gebaut, als Build-Tool dient Vite, geschrieben in TypeScript. Der Offline-Modus kommt über `vite-plugin-pwa`.
- **Begründung:** Verbreitet, schneller Einstieg. Lässt sich später mit Capacitor als native App verpacken (D-009).

## D-003 · Supabase als Backend

- **Entscheidung:** Daten, Echtzeit-Sync und Anmeldung laufen über Supabase (Postgres). Firebase und ein eigenes Backend wurden verworfen.
- **Begründung:** Es gibt einen Gratis-Tarif. Postgres, Echtzeit und anonyme Anmeldung sind eingebaut, und Zugriffsregeln lassen sich per SQL festlegen.
- **Folgen:** Ohne konfiguriertes Supabase läuft die App im Demo-Modus nur lokal.

## D-004 · Übersetzung im MVP nur über ein eingebautes Wörterbuch

- **Entscheidung:** Artikel werden über ein festes Wörterbuch übersetzt (`src/data/dictionary.ts`, 132 Grundbegriffe, 9 Sprachen). Es gibt keine KI und keinen externen Übersetzungsdienst. Unbekannte Artikel können Nutzer mit einem eigenen Landesbegriff ergänzen.
- **Begründung:** Keine laufenden Kosten, offline verfügbar, die Begriffe sind vorhersehbar.
- **Folgen:** Die Abdeckung ist begrenzt (siehe Ziel in Z-1). Das Wörterbuch muss geprüft werden (S-001, F-001). Die KI-Ergänzung ist offen (F-004).

## D-005 · Anonyme Anmeldung, Beitritt per Link

- **Entscheidung:** Jedes Gerät meldet sich bei Supabase anonym an. Eine Liste sehen nur Mitglieder (`list_members`). Mitglied wird, wer die Liste erstellt (`created_by` plus Trigger) oder den Link öffnet (`join_list`).
- **Begründung:** Erfüllt Z-3 (kein Konto). Ohne Mitgliedschaft könnte jeder mit dem öffentlichen anon-Key alle Listen lesen.
- **Folgen:** Wer den Link kennt, hat Zugriff. Mitglieder lassen sich noch nicht entfernen (S-010).

## D-006 · Hosting auf GitHub Pages, öffentliches Repo

- **Entscheidung:** Die App wird per GitHub Actions auf `tminder.github.io/reiseliste` veröffentlicht. Das Repo ist öffentlich. Die Navigation läuft über den Hash in der Adresse (`#/l/<id>`).
- **Begründung:** Kostenlos, ohne Server, das Deployment läuft bei jedem Push. Pages ist im Gratis-Tarif nur für öffentliche Repos verfügbar. Die Navigation über den Hash braucht keine Weiterleitungen auf dem Server.
- **Folgen:** Der Code ist öffentlich einsehbar. Geheimnisse dürfen nie ins Repo, der Supabase-anon-Key ist ohnehin öffentlich.

## D-007 · Offline zuerst, letzte Änderung gewinnt

- **Entscheidung:** Jede Änderung landet zuerst im lokalen Speicher und in einer Warteschlange und wird dann an Supabase geschickt. Gibt es Konflikte, gewinnt die Version mit dem neueren `updated_at`.
- **Begründung:** Erfüllt Z-4 bei minimaler Komplexität.
- **Folgen:** Gleichzeitige Änderungen am selben Artikel können sich überschreiben (S-004, S-005).

## D-008 · Landessprache über das Reiseland der Liste

- **Entscheidung:** Jede Liste hat ein Reiseland, und daraus folgt die Landessprache. Der Standort wird im MVP nicht ausgewertet. Länder mit mehreren Sprachen erscheinen als einzelne Einträge, z. B. Belgien (Flandern) und Belgien (Wallonie).
- **Begründung:** Planbar schon vor der Reise. Keine Standortfreigabe nötig, kein Datenschutzaufwand.

## D-009 · Native Apps später mit Capacitor

- **Entscheidung:** Wenn native Apps kommen, wird die bestehende Web-App mit Capacitor verpackt. Ein Neubau mit React Native oder Swift/Kotlin ist nicht geplant.
- **Begründung:** Rund 95 % des Codes lassen sich wiederverwenden, der Aufwand liegt bei Tagen statt Wochen. Geofencing, Kamera und Push kommen über Plugins.
- **Folgen:** Das Apple Developer Program kostet 99 $ pro Jahr, Google Play einmalig 25 $. Für iOS braucht es einen Mac oder einen Build-Dienst in der Cloud. Der Zeitpunkt ist offen (F-006).

## D-010 · Produktfotos aus Open Food Facts, über die Produktkategorie

- **Entscheidung:** Ein 📷-Knopf am Artikel zeigt bis zu 4 Packungsfotos aus Open Food Facts. Gesucht wird über die **Produktkategorie** (z. B. Milch → `en:milks`), nicht per Freitext. Die Suche ist auf Produkte im Reiseland beschränkt, die meistgescannten kommen zuerst. Ist ein Laden gewählt oder vorgeschlagen (D-011), kommen zuerst Produkte dieser Kette. Für lose Ware (Obst, Gemüse, Frischfleisch, Fisch) und für Non-Food (Haushalt, Drogerie, Baby) gibt es keinen Foto-Knopf. Für eigene Landesbegriffe ohne Eintrag im Wörterbuch wird per Freitext gesucht. Dabei zählen nur Produkte, deren Name mit dem Begriff beginnt oder ihn als ganzes Wort enthält. Die Fotos werden nur auf Antippen geladen, 30 Tage lokal gespeichert und bleiben offline verfügbar. Die Quelle wird genannt (CC BY-SA). Es gibt keine KI-Bilder und keine Fotos aus Online-Shops von Supermärkten oder Herstellern.
- **Begründung:** Die Freitextsuche lieferte oft Unpassendes, z. B. bei „tomates“ Ketchup und Pastasauce (Rückmeldung des Inhabers). Kategorien sind deutlich treffsicherer. Open Food Facts kennt fast nur verpackte Lebensmittel, ein Knopf ohne sinnvolle Treffer wäre schlechter als gar keiner. Es sind nur wenige Suchanfragen pro Minute erlaubt, deshalb wird nur auf Antippen geladen und zwischengespeichert.

## D-011 · Supermarkt erkennen: Vorschlag über OpenStreetMap, Bestätigung durch den Nutzer

- **Entscheidung:** Die Supermarktsuche ist dezent im Kopf der Liste untergebracht, unter Land und Sprache. Sobald eine Liste offen ist und kein Laden gewählt ist, sucht die App automatisch. Beim ersten Mal fragt der Browser dafür nach dem Standort. Dabei bestimmt sie der Standort bestimmt und über die Overpass API von OpenStreetMap nach Läden in der Nähe gesucht. Der Radius richtet sich nach der GPS-Genauigkeit, er liegt zwischen 75 und 400 m. Vorgeschlagen werden zuerst Supermärkte, danach Kioske, Drogerien und Gemüseläden, jeweils der nächste zuerst. Angezeigt wird zuerst nur ein einziger Vorschlag („🏪 Mercadona? 20 m · Ja · andere · ✕“). Bis zu 4 weitere Läden erscheinen erst nach Tippen auf „andere“. Ist kein Laden in diesem Umkreis, sucht die App Supermärkte in Stufen (1, 3, 10, 20 km, je höchstens 40 Treffer). Alle Stufen laufen in einer einzigen Anfrage, das schont die öffentlichen Server und vermeidet Sperren, und schlägt den nächsten vor („Nächster: Dia 370 m · Wählen“). Weitere Supermärkte erscheinen ebenfalls hinter „andere“. Ist ein Server ausgelastet oder nicht erreichbar, versucht es die App automatisch erneut, nach 15 s, 30 s, 1, 2 und dann alle 5 Minuten, mit Countdown in der Zeile und „jetzt“ für einen sofortigen Versuch. Bei verweigertem Standort gibt es keinen erneuten Versuch. Der gewählte Laden steht danach klein im Kopf („🏪 Mercadona · ändern“). Er gilt 3 Stunden, nur auf diesem Gerät und pro Liste. So bleibt die Suche in Städten vollständig und findet auf dem Land trotzdem etwas. Ist ein Overpass-Server ausgefallen oder überlastet (z. B. Fehler 502), versucht die App automatisch zwei weitere öffentliche Server. Das Ergebnis wird 5 Minuten wiederverwendet, solange man sich nicht mehr als 50 m bewegt. Der letzte Vorschlag bleibt 30 Minuten gespeichert und erscheint auch nach einem Neuladen ohne neue Standortabfrage. Die Produktfotos zeigen zuerst Produkte des gewählten Ladens, laut Angabe in Open Food Facts. Ist noch keiner gewählt, gilt der angezeigte Vorschlag. Unter den Fotos steht „Bei Spar“ oder „Keine Treffer für Spar, übliche Produkte im Land“. Unter jedem Foto steht der Produktname, nicht die Marke, denn Eigenmarken wie „Mercadona“ würden sonst wie Ladennamen wirken.
- **Begründung:** Wunsch des Inhabers, auch die dezente Darstellung mit nur einem Vorschlag. OpenStreetMap ist kostenlos. GPS ist in Gebäuden ungenau, deshalb wird bestätigt statt still gewählt. Die automatische Suche beim Öffnen und die automatischen Wiederholungen hat sich der Inhaber gewünscht. Dafür nimmt er in Kauf, dass schon beim Öffnen der Liste die Erlaubnis-Abfrage für den Standort erscheint.
- **Folgen:** Die Koordinaten gehen an die Overpass API (FOSSGIS-Server) und werden in der App nicht gespeichert. Das muss in die Datenschutzerklärung (F-007). Die Benachrichtigung beim Betreten des Ladens gibt es erst in nativen Apps (D-009).

## D-012 · Gelöschte Artikel nur als gelöscht markieren

- **Entscheidung:** Gelöschte Artikel bekommen `deleted = true` und werden nicht aus der Datenbank entfernt.
- **Begründung:** Eine Löschung lässt sich über dieselbe Warteschlange und Konfliktregel synchronisieren wie jede andere Änderung, auch offline.
- **Folgen:** Die Daten wachsen weiter an (S-016).

## D-013 · Eingabe in allen Sprachen des Wörterbuchs

- **Entscheidung:** Jede Person wählt ihre Eingabesprache (DE, EN, ES, PT, FR, IT, NL, HR, EL). Die Zuordnung zum Wörterbuch bevorzugt diese Sprache und probiert danach die anderen.
- **Begründung:** Erfüllt Z-2 für gemischtsprachige Gruppen. Das Wörterbuch enthält ohnehin alle Sprachen.
- **Folgen:** Die Bedienoberfläche selbst ist bisher nur auf Deutsch (S-008).

## D-014 · Supabase-Zugangsdaten liegen im Repo

- **Entscheidung:** Die Project URL und der Publishable Key des Supabase-Projekts `evglhiivucccditqtjkm` stehen in `.env.production` im Repo. GitHub-Variablen werden dafür nicht genutzt.
- **Begründung:** Der Publishable Key ist laut Supabase öffentlich, er steckt ohnehin in der ausgelieferten App. Der Schutz der Daten läuft über die Zugriffsregeln (D-005). So lässt sich die App ohne manuelle Einstellungen in GitHub bauen.
- **Folgen:** Der secret- bzw. service_role-Key darf nie ins Repo. Wer das Projekt wechselt, ändert `.env.production`.

## D-015 · Eigene Sprache gross, Landessprache klein

- **Entscheidung:** Jeder Artikel zeigt gross den Namen in der Sprache des Betrachters, wie eingegeben oder aus dem Wörterbuch übersetzt. Darunter steht klein der Begriff in der Landessprache. Reine Zahlen werden als Anzahl angezeigt („2x“), Mengen mit Einheit bleiben unverändert („500 g“). Im Kopf der Liste stehen nur Land und Sprache, z. B. „Spanien · Español“.
- **Begründung:** Wunsch des Inhabers: Die eigene Sprache ist schneller lesbar, und die Ansicht wird kompakter.
- **Folgen:** Das gilt auch für die Ladenansicht.

## D-016 · Automatisch aktuell: neue App-Versionen und Listendaten

- **Entscheidung:** Neue App-Versionen werden automatisch geladen. Geprüft wird beim Start, stündlich und jedes Mal, wenn die App wieder in den Vordergrund kommt, und bei einer neuen Version lädt die Seite selbst neu. Listendaten kommen per Echtzeit. Zusätzlich gleicht die App ab, wenn sie in den Vordergrund kommt, und alle 20 Sekunden, solange die Liste sichtbar ist.
- **Begründung:** Wunsch des Inhabers. Handys trennen die Echtzeit-Verbindung im Hintergrund, der Abgleich fängt das auf.
- **Folgen:** Ein Update kann die Seite mitten in der Eingabe neu laden. Bereits gespeicherte Artikel gehen dabei nicht verloren. Der Abgleich alle 20 Sekunden erzeugt mehr Anfragen an Supabase, im Gratis-Tarif ist das unkritisch.
