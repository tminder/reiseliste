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

## D-010 · Produktfotos aus Open Food Facts, nur auf Antippen

- **Entscheidung:** Unter jedem übersetzten Artikel zeigt ein 📷-Knopf bis zu 4 Packungsfotos aus Open Food Facts. Gesucht wird mit dem Begriff in der Landessprache, beschränkt auf Produkte, die im Reiseland verkauft werden. Zuerst kommen Produkte, deren Name mit dem Begriff beginnt, danach die meistgescannten. Die Fotos werden erst beim Antippen geladen, 30 Tage lokal gespeichert und bleiben offline verfügbar. Die Quelle wird genannt (CC BY-SA). Es gibt keine KI-generierten Bilder und keine Fotos aus Online-Shops von Supermärkten oder Herstellern. Fotos pro Supermarktkette und eigene Fotos der Nutzer kommen später (Ausbaustufe 4).
- **Begründung:** Eine Packung erkennt man im Laden schneller als ein fremdes Wort. Open Food Facts ist frei nutzbar, erlaubt aber nur wenige Suchanfragen pro Minute. Deshalb wird nur auf Antippen geladen, die Anfragen laufen nacheinander und werden zwischengespeichert. KI-Bilder zeigen keine echten Packungen.

## D-011 · Supermarkt erkennen: Vorschlag über OpenStreetMap, Bestätigung durch den Nutzer

- **Entscheidung:** In der Liste fragt eine Zeile „In welchem Laden bist du?“. Mit „📍 Erkennen“ wird der Standort bestimmt und über die Overpass API von OpenStreetMap nach Läden in der Nähe gesucht. Der Radius richtet sich nach der GPS-Genauigkeit, er liegt zwischen 75 und 400 m. Vorgeschlagen werden zuerst Supermärkte, danach Kioske, Drogerien und Gemüseläden, jeweils der nächste zuerst: „Bist du bei Mercadona? (20 m)“, dazu bis zu 4 Alternativen. Ist der Standort im Browser schon freigegeben, erscheint der Vorschlag beim Öffnen der Liste automatisch. Der gewählte Laden gilt 3 Stunden, nur auf diesem Gerät und pro Liste. Mit gewähltem Laden zeigen die Produktfotos zuerst Produkte dieser Kette, laut Angabe in Open Food Facts. Gibt es dort nichts, kommen die üblichen Produkte im Land.
- **Begründung:** Wunsch des Inhabers. OpenStreetMap ist kostenlos. GPS ist in Gebäuden ungenau, deshalb wird bestätigt statt still gewählt. Den Standort fragt die App erst auf Knopfdruck ab, damit nicht schon beim Öffnen eine Erlaubnis-Abfrage erscheint.
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
