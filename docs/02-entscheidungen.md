# Entscheidungen

Stand: 2026-11-22 · Nur aktuell gültige Entscheidungen. Format: Entscheidung · Begründung · Folgen.

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

- **Entscheidung:** Artikel werden über ein festes Wörterbuch übersetzt (`src/data/dictionary/`, 372 Grundbegriffe inkl. Küchenutensilien in der Abteilung „Küche & Geschirr“, 11 Sprachen, Aufbau siehe D-053. In der deutschen Datei stehen zusätzlich Schweizer Ausdrücke als Varianten, z. B. Rahm, Poulet, Rüebli, Zucchetti, Chriesi, Schoggi, Kehrichtsack, Bidon. Sie werden bei der Eingabe erkannt, angezeigt wird die erste, standarddeutsche Variante; nur bei Listen für die Deutschschweiz und Liechtenstein gilt die Schweizer Abweichung). Es gibt keine KI und keinen externen Übersetzungsdienst. Unbekannte Artikel können Nutzer mit einem eigenen Landesbegriff ergänzen.
- **Begründung:** Keine laufenden Kosten, offline verfügbar, die Begriffe sind vorhersehbar.
- **Folgen:** Die Abdeckung ist begrenzt (siehe Ziel in Z-1). Das Wörterbuch wird über Rückmeldungen der Nutzer verbessert (D-059, S-001). Die KI-Ergänzung ist offen (F-004).

## D-005 · Anonyme Anmeldung, Beitritt per Link

- **Entscheidung:** Jedes Gerät meldet sich bei Supabase anonym an. Eine Liste sehen nur Mitglieder (`list_members`). Mitglied wird, wer die Liste erstellt (`created_by` plus Trigger) oder den Link öffnet (`join_list`). Beim Öffnen einer Liste werden Name und Sprache aus dem Profil in der Mitgliedschaft gespeichert bzw. aktualisiert. Mitglieder einer Liste sehen sich gegenseitig im Menü unter „Mitglieder“.
- **Begründung:** Erfüllt Z-3 (kein Konto). Ohne Mitgliedschaft könnte jeder mit dem öffentlichen anon-Key alle Listen lesen.
- **Folgen:** Wer den Link kennt, hat Zugriff. Mitglieder lassen sich noch nicht entfernen (S-010).

## D-006 · Hosting auf GitHub Pages, öffentliches Repo

- **Entscheidung:** Die App wird per GitHub Actions auf GitHub Pages veröffentlicht, unter der eigenen Domain **cartontheroad.app** (seit 2026-11-15, registriert bei Hostfactory; DNS mit A/AAAA-Einträgen auf GitHub Pages, `www` als CNAME auf `tminder.github.io`). Die App liegt an der Wurzel der Domain (`BASE_PATH=/`), die alte Adresse `tminder.github.io/reiseliste` leitet GitHub automatisch weiter. Das Repo ist öffentlich. Die Navigation läuft über den Hash in der Adresse (`#/l/<id>`).
- **Begründung:** Kostenlos, ohne Server, das Deployment läuft bei jedem Push. Pages ist im Gratis-Tarif nur für öffentliche Repos verfügbar. Die Navigation über den Hash braucht keine Weiterleitungen auf dem Server.
- **Folgen:** Der Code ist öffentlich einsehbar. Geheimnisse dürfen nie ins Repo, der Supabase-anon-Key ist ohnehin öffentlich. Beim Umzug auf die eigene Domain begannen Profil, Listen und anonyme Anmeldung auf jedem Gerät neu (Gerätespeicher hängt an der Adresse); Listen öffnet man über ihren Link wieder.

## D-007 · Offline zuerst, letzte Änderung gewinnt

- **Entscheidung:** Jede Änderung landet zuerst im lokalen Speicher und in einer Warteschlange und wird dann an Supabase geschickt. Gibt es Konflikte, gewinnt die Version mit dem neueren `updated_at`.
- **Begründung:** Erfüllt Z-4 bei minimaler Komplexität.
- **Folgen:** Gleichzeitige Änderungen am selben Artikel können sich überschreiben (S-004, S-005).

## D-008 · Landessprache über das Reiseland der Liste, Vorschlag per Standort

- **Entscheidung:** Jede Liste hat ein Reiseland, daraus folgt die Landessprache. Beim Anlegen schlägt die App das Land des aktuellen Standorts vor, sofern es unterstützt wird, auch im eigenen Sprachraum (D-087). Dafür werden die Koordinaten über Nominatim (OpenStreetMap) einem Land zugeordnet; ein gespeichertes Ergebnis gilt nur am gleichen Ort (D-087). Bestehende Listen ändern ihr Land nicht automatisch. Name und Land lassen sich über das Menü ändern (D-017). Länder mit mehreren Sprachen sind als einzelne Einträge auswählbar, z. B. „Belgien – Niederländisch“ und „Belgien – Französisch“ oder „Schweiz – Französisch“ und „Schweiz – Italienisch“ (D-088). Der Vorschlag ordnet sie über die Region zu.
- **Begründung:** Man kann die Liste vor der Reise anlegen, das Land bleibt also wählbar. Ist man schon vor Ort, spart der Vorschlag einen Schritt (Wunsch des Inhabers).
- **Folgen:** Auf der Startseite fragt der Browser nach dem Standort. Die Koordinaten gehen an Nominatim, das steht in der Datenschutzerklärung (D-023).

## D-009 · Native Apps später mit Capacitor

- **Entscheidung:** Wenn native Apps kommen, wird die bestehende Web-App mit Capacitor verpackt. Ein Neubau mit React Native oder Swift/Kotlin ist nicht geplant.
- **Begründung:** Rund 95 % des Codes lassen sich wiederverwenden, der Aufwand liegt bei Tagen statt Wochen. Geofencing, Kamera und Push kommen über Plugins.
- **Folgen:** Das Apple Developer Program kostet 99 $ pro Jahr, Google Play einmalig 25 $. Für iOS braucht es einen Mac oder einen Build-Dienst in der Cloud. Der Zeitpunkt ist offen (F-006).

## D-010 · Produktfotos aus Open Food Facts, über die Produktkategorie

- **Entscheidung:** Ein Kamera-Knopf am Artikel zeigt bis zu 4 Packungsfotos aus Open Food Facts, als eigene Zeile über die ganze Breite der Artikelkarte (Wunsch des Inhabers). Den Knopf gibt es nur bei offenen Artikeln und nur, wenn ein Laden gefunden oder gewählt ist (D-011). Ohne Laden sind allgemeine Landesfotos wenig hilfreich. Gesucht wird über die **Produktkategorie** (z. B. Milch → `en:milks`), nicht per Freitext. Die Suche ist auf Produkte im Reiseland beschränkt, die meistgescannten kommen zuerst. Zuerst kommen Produkte der Kette dieses Ladens, sonst die üblichen Produkte im Land. Für lose Ware (Obst, Gemüse, Frischfleisch, Fisch) und für Non-Food (Haushalt, Drogerie, Baby) gibt es keinen Foto-Knopf. Für eigene Landesbegriffe ohne Eintrag im Wörterbuch wird per Freitext gesucht. Dabei zählen nur Produkte, deren Name mit dem Begriff beginnt oder ihn als ganzes Wort enthält. Die Fotos werden nur auf Antippen gesucht („Fotos werden gesucht …“), 30 Tage lokal gespeichert und bleiben offline verfügbar. Ist Open Food Facts ausgelastet oder nicht erreichbar, versucht es die App automatisch erneut (15 s, 30 s, 1, 2, dann alle 5 Min.), mit Countdown und „jetzt“ (D-094). Im selben Bereich steht über den Fotos der Tipp zum Artikel, falls es einen gibt (D-095). Die Quelle wird genannt (CC BY-SA). Es gibt keine KI-Bilder und keine Fotos aus Online-Shops von Supermärkten oder Herstellern.
- **Begründung:** Die Freitextsuche lieferte oft Unpassendes, z. B. bei „tomates“ Ketchup und Pastasauce (Rückmeldung des Inhabers). Kategorien sind deutlich treffsicherer. Open Food Facts kennt fast nur verpackte Lebensmittel, ein Knopf ohne sinnvolle Treffer wäre schlechter als gar keiner. Es sind nur wenige Suchanfragen pro Minute erlaubt, deshalb wird nur auf Antippen geladen und zwischengespeichert.

## D-011 · Supermarkt erkennen: Vorschlag über OpenStreetMap, Bestätigung durch den Nutzer

- **Entscheidung:** Die Supermarktsuche ist dezent im Kopf der Liste untergebracht, unter Land und Sprache. Sobald eine Liste offen ist und kein Laden gewählt ist, sucht die App automatisch. Beim ersten Mal fragt der Browser dafür nach dem Standort. Dabei bestimmt sie der Standort bestimmt und über die Overpass API von OpenStreetMap nach Läden in der Nähe gesucht. Der Radius richtet sich nach der GPS-Genauigkeit, er liegt zwischen 75 und 400 m. Vorgeschlagen werden zuerst Supermärkte, danach Kioske, Drogerien und Gemüseläden, jeweils der nächste zuerst. Der nächste Laden wird direkt als aktueller Laden angezeigt („Mercadona 20 m“), ohne Bestätigung. Daneben steht ein kleiner Pfeil; ein Tipp auf die Zeile öffnet das Blatt „Laden wählen“ (D-072). Ist kein Laden in diesem Umkreis, sucht die App Supermärkte und kleine Läden einer Kette (D-100) in Stufen (1, 3, 10, 20 km, je höchstens 40 Treffer). Alle Stufen laufen in einer einzigen Anfrage, das schont die öffentlichen Server und vermeidet Sperren, und zeigt den nächsten an („Dia 370 m“). Weitere Supermärkte erscheinen ebenfalls erst im Blatt „Laden wählen“. Ist ein Server ausgelastet oder nicht erreichbar, versucht es die App automatisch erneut, nach 5, 10, 20 und 30 s, nach 1 und 2 Minuten und dann alle 5 Minuten (D-086). Countdown und „jetzt“ für einen sofortigen Versuch stehen im Blatt „Laden wählen“, die Zeile zeigt solange „Suche Laden …“. Bei verweigertem Standort gibt es keinen automatischen neuen Versuch. Stattdessen erscheinen „Standort freigeben“ (neuer Versuch per Antippen) und „Hilfe“ mit einer Anleitung für iPhone/Safari: Ortungsdienste für Safari-Websites einschalten und den Standort für die Seite dauerhaft erlauben. Ein im Blatt gewählter Laden ersetzt den Vorschlag. Er gilt nur auf diesem Gerät und pro Liste, wie lange: siehe D-033. So bleibt die Suche in Städten vollständig und findet auf dem Land trotzdem etwas. Ist ein Overpass-Server ausgefallen oder überlastet (z. B. Fehler 502), versucht die App automatisch zwei weitere öffentliche Server. Wann neu gesucht wird, regeln D-033 und D-046. Die Produktfotos zeigen zuerst Produkte des gewählten Ladens, laut Angabe in Open Food Facts. Ist noch keiner gewählt, gilt der angezeigte Vorschlag. Unter den Fotos steht „Bei Spar“ oder „Keine Treffer für Spar, übliche Produkte im Land“. Unter jedem Foto steht der Produktname, nicht die Marke, denn Eigenmarken wie „Mercadona“ würden sonst wie Ladennamen wirken.
- **Begründung:** Wunsch des Inhabers, auch die dezente Darstellung mit nur einem Laden und einem Symbol zum Ändern. OpenStreetMap ist kostenlos. GPS ist in Gebäuden ungenau, deshalb wird bestätigt statt still gewählt. Die automatische Suche beim Öffnen und die automatischen Wiederholungen hat sich der Inhaber gewünscht. Dafür nimmt er in Kauf, dass schon beim Öffnen der Liste die Erlaubnis-Abfrage für den Standort erscheint.
- **Folgen:** Die Koordinaten gehen an die Overpass API und werden in der App nicht gespeichert. Erlaubt sind nur Server von Betreibern in der EU, die in der Datenschutzerklärung genannt sind: FOSSGIS e.V. (Deutschland), bei Ausfall Private.coffee (gemeinnütziger Verein, Österreich). Der frühere Ersatzserver von mail.ru (VK, Russland) ist entfernt (Entscheidung des Inhabers). Das steht in der Datenschutzerklärung (D-023). Die Benachrichtigung beim Betreten des Ladens gibt es erst in nativen Apps (D-009).

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

## D-015 · Eigene Sprache gross, Landessprache klein mit Flagge

- **Entscheidung:** Jeder Artikel zeigt gross den Namen in der Sprache des Betrachters, wie eingegeben oder aus dem Wörterbuch übersetzt. Darunter steht klein der Begriff in der Landessprache, mit der Flagge des Reiselands davor („🇪🇸 leche“), und wer den Artikel eingetragen hat. Diese Zeile steht unter dem Namen, links von den Knöpfen (D-074). Reine Zahlen werden als Anzahl angezeigt („2x“), Mengen mit Einheit bleiben unverändert („500 g“). Im Kopf der Liste stehen nur Land und Sprache, z. B. „Spanien · Español“. Tipps zu Artikeln (z. B. „Kochsahne und Schlagsahne sind oft getrennt beschriftet“) erscheinen bei offenen Artikeln auf Antippen des Glühbirnen-Symbols.
- **Begründung:** Wunsch des Inhabers: Die eigene Sprache ist schneller lesbar, die Ansicht wird kompakter, und die Tipps stören beim Schreiben der Liste nicht.

## D-016 · Automatisch aktuell: neue App-Versionen und Listendaten

- **Entscheidung:** Neue App-Versionen werden automatisch geladen. Geprüft wird beim Start, stündlich und jedes Mal, wenn die App wieder in den Vordergrund kommt, und bei einer neuen Version lädt die Seite selbst neu. Listendaten kommen per Echtzeit. Zusätzlich gleicht die App ab, wenn sie in den Vordergrund kommt und wenn der Echtzeit-Kanal nach einer Unterbrechung wieder verbunden ist. Alle 20 Sekunden nur, solange der Kanal nicht verbunden ist oder Änderungen auf dem Gerät warten.
- **Begründung:** Wunsch des Inhabers. Handys trennen die Echtzeit-Verbindung im Hintergrund, der Abgleich fängt das auf.
- **Folgen:** Ein Update kann die Seite mitten in der Eingabe neu laden. Bereits gespeicherte Artikel gehen dabei nicht verloren. Bricht der Echtzeit-Kanal unbemerkt ab (ohne Statusmeldung), fehlen Änderungen bis zum nächsten Wechsel in die App.

## D-017 · Kopfzeile und Menü (☰) in der Liste

- **Entscheidung:** Oben rechts in der Liste sitzen zwei Knöpfe: **Teilen** (Symbol) und das **Menü ☰**. Das Menü hat zwei Gruppen mit Trennlinie:
  - **Diese Liste:** Mitglieder, Listen-Einstellungen (Name, Reiseland, „Erledigte automatisch entfernen“), Liste verlassen bzw. Liste löschen, wenn man das einzige Mitglied ist (rot, D-036).
  - **Cart on the Road:** Mein Profil (Name, Sprache; mit „Abbrechen“, danach zurück in die Liste), Datenschutz. Die Version steht nicht im Menü, nur in der Fusszeile der Startseite und des Profils.
  - Nicht im Menü: „Alle Listen“ (Pfeil oben links).
- **Begründung:** Wunsch des Inhabers nach einer Durchsicht: Teilen ist für eine geteilte Liste die wichtigste Aktion, Doppeltes fällt weg, die Einstellung zum automatischen Entfernen war unter „Name & Reiseland“ versteckt, das Profil liess sich nur auf der Startseite ändern.
- **Folgen:** Die Kopfzeile ist etwas enger, lange Listennamen werden früher gekürzt. Ein Feedback-Eintrag ist bewusst noch nicht dabei.

## D-018 · Symbole statt Emojis

- **Entscheidung:** Die Bedienelemente nutzen einheitliche Linien-Symbole aus `lucide-react`, z. B. Kamera, Menü, Stift, Laden, Standort, Glühbirne, Teilen, Papierkorb. Emojis bleiben nur für Länderflaggen.
- **Begründung:** Wunsch des Inhabers: moderner und schöner. Emojis sehen je nach Gerät anders aus, Symbole passen sich an Farbe und Dunkelmodus an.

## D-019 · Sync-Status nur bei Problemen sichtbar

- **Entscheidung:** Es gibt keine Statuszeile „Synchronisiert“ mehr. Läuft alles normal, ist nichts zu sehen. Offline erscheint im Kopf eine Wolke mit Strich, bei einem Fehler eine orange Wolke mit Ausrufezeichen. Ein Tipp darauf erklärt den Zustand, bei Fehlern mit der Meldung von Supabase. Während des Abgleichs wird nichts angezeigt.
- **Begründung:** Wunsch des Inhabers, die Zeile störte. Synchron ist der Normalzustand, nur Abweichungen sind für den Nutzer relevant.

## D-020 · Beim Öffnen im Supermarkt: Einkauf beginnt

- **Entscheidung:** Ergibt die Ladensuche **beim Öffnen einer Liste** (innerhalb von 30 s), dass ein **Supermarkt** höchstens 50 m entfernt ist, bei einer GPS-Genauigkeit von höchstens 60 m, gilt der Einkauf als begonnen (D-055): Dieser Laden zählt für den Ladenbesuch (D-043), und die genauere Laden-Prüfung startet (D-046). An der Anzeige ändert sich nichts, es gibt keinen Hinweis. Kiosk, Drogerie o. ä. lösen nichts aus.
- **Begründung:** Wunsch des Inhabers. Die Leitplanken verhindern Fehlauslösungen durch ungenaues GPS, z. B. wenn man neben einem Supermarkt wohnt oder vorbeigeht.
- **Folgen:** Eine Web-App kann den Standort nicht im Hintergrund prüfen. Das passiert also nur beim Öffnen der Liste, nicht beim Betreten des Ladens. Das ginge erst mit nativen Apps (D-009).

## D-022 · Oberfläche mehrsprachig (Deutsch, Englisch)

- **Entscheidung:** Alle Texte der Oberfläche stehen in `src/locales/de.json` und `en.json` (Format siehe D-053). Die Sprache der Oberfläche folgt der Sprache im Profil. Vor dem Anlegen des Profils gilt die Sprache des Browsers. Für Sprachen ohne eigene Texte wird Englisch verwendet. Ländernamen kommen in der Oberflächensprache vom Browser (`Intl.DisplayNames`), Abteilungen und Tipps sind übersetzt. Wechselt man im Profil die Sprache, wechselt die Oberfläche sofort mit.
- **Begründung:** Mitreisende mit anderer Sprache sollen die App bedienen können (Ziel Z-2). Englisch deckt die meisten ab, weitere Sprachen lassen sich ohne Umbau ergänzen.
- **Folgen:** Neue Texte immer in `de.json` und `en.json` anlegen, der Test meldet fehlende. Die übrigen Sprachen sind offen (S-008).

## D-023 · Datenschutzerklärung und Kontakt in der App

- **Entscheidung:** Die App hat eine Seite „Datenschutz“ (`#/datenschutz`, Deutsch und Englisch); derselbe Text steht als feste Seite unter `/datenschutz/` und `/privacy/` (D-091). Die Texte liegen in `src/privacyText.ts`. Sie ist erreichbar über die Fusszeile der Startseite und der Profil-Einrichtung sowie über das Menü der Liste. Inhalt: Betreiber (Tobias Minder, Schweiz, mail@tobiasminder.ch nur für Anfragen zum Datenschutz, privat und nicht kommerziell), bearbeitete Daten und Zwecke, Empfänger (Supabase mit Datenbank in London, Region „West Europe (London)“, GitHub, OpenStreetMap/Overpass/Nominatim, Open Food Facts), Rechtsgrundlagen für EU-Nutzer, Speicherdauer, Rechte (Auskunft, Berichtigung, Löschung per E-Mail, Beschwerde beim EDÖB oder bei der EU-Aufsicht), Fotos und Marken. Das Blatt zur Standortfreigabe verlinkt diese Seite (D-066). Ein Impressum mit Postadresse gibt es nicht: Für private, nicht kommerzielle Websites besteht in der Schweiz laut UWG keine Impressumspflicht. Die E-Mail-Adresse steht nur, weil das Datenschutzrecht einen Kontakt für Anfragen verlangt; Support und Rückmeldungen per E-Mail gibt es nicht (Wunsch des Inhabers). Wer dahintersteht, erklärt die Seite „Über das Projekt“ (D-091).
- **Begründung:** Eine Datenschutzerklärung ist nach Schweizer DSG (Art. 19) und für EU-Nutzer nach DSGVO (Art. 13) Pflicht, auch bei privaten öffentlichen Angeboten. Der Inhaber betreibt die App von der Schweiz aus, privat und ohne Einnahmen.
- **Folgen:** Ändern sich Datenflüsse (neuer Dienst, Speicherdauer, Werbung oder Einnahmen), muss die Seite angepasst werden. Werden Einnahmen erzielt, ist das Impressum neu zu prüfen. Rechtliche Restpunkte stehen in F-013. Geprüft hat das keine Fachperson.

## D-024 · Korrekturen von Nutzern: sofort in der Liste, gesammelt und vom Inhaber geprüft

- **Entscheidung:** Gilt nur mit eingeschaltetem Community-Modul, im MVP ist es aus (D-027). Ein Tipp auf den Begriff in der Landessprache, z. B. „🇪🇸 nata“, öffnet „Begriff korrigieren“. Das geht auch bei Artikeln ohne Übersetzung. Die Korrektur gilt sofort für alle Artikel mit demselben Wörterbuch-Eintrag in dieser Liste, auch für später hinzugefügte. Damit sehen sie alle Mitglieder. Zusätzlich wird sie als Vorschlag in der Supabase-Tabelle `term_suggestions` gespeichert. Nutzer dürfen dort nur eintragen, nicht lesen. Offline bleibt der Vorschlag auf dem Gerät und wird beim nächsten Abgleich gesendet. Ins Wörterbuch kommen Vorschläge nur nach Prüfung durch den Inhaber, nie automatisch. Die Zusammenfassung `term_suggestions_summary` (gruppiert nach Begriff und Anzahl verschiedener Nutzer, ohne Kennungen) exportiert ein GitHub-Actions-Job montags und auf Knopfdruck nach `docs/korrekturvorschlaege.csv` im Repo. So kann Claude sie lesen, ohne Zugang zu Supabase. Der Job braucht das GitHub-Secret `SUPABASE_SECRET_KEY` und sendet es nur im `apikey`-Header. Gute Vorschläge übernimmt Claude auf Zuruf („übernimm die Korrekturen“) in `src/data/dictionary.ts`. Alternativ lässt sich im Supabase SQL Editor `select * from term_suggestions_summary;` ausführen.
- **Begründung:** Entscheidung des Inhabers. Kein Risiko durch Spam oder Manipulation, und die Nutzer profitieren trotzdem sofort in ihrer Liste.
- **Folgen:** Das Wörterbuch wird nur besser, wenn regelmässig ausgewertet wird. Die Zusammenfassung ist öffentlich, weil das Repo öffentlich ist (nur Begriffe, keine Kennungen). Die Vorschläge und der Export sind in der Datenschutzerklärung aufgeführt (D-023).

## D-025 · Die App heisst „Cart on the Road“

- **Entscheidung:** Der Name der App ist „Cart on the Road“ (Oberfläche DE und EN, Manifest, Seitentitel, Datenschutz, README). Kurzname unter dem Icon: „Cart on Road“. Untertitel im Manifest: „Einkaufsliste für Reisen“. Repo `tminder/reiseliste`, URL und interne Schlüssel (`rl:`) bleiben unverändert.
- **Begründung:** Vorschlag des Inhabers, Ersatz für den Arbeitstitel „Proviant“ (generisch, Getränkemarke aus Berlin, ausserhalb des deutschen Sprachraums kaum verständlich). Anspielung auf „On the Road“, beschreibt das Icon (Einkaufswagen auf Strasse, D-026), auf Englisch international verständlich. Websuche ohne gleichnamige App, Marke oder Firma.
- **Folgen:** Der Name beschreibt das Produkt und ist darum schwer als Marke zu schützen. Websuchen nach dem Namen zeigen vor allem Golfwagen-Verkehrsrecht, im Store braucht es den Untertitel. 16 Zeichen, deshalb der Kurzname für den Home-Bildschirm. Domains und Markenregister sind noch nicht geprüft (F-005). Bereits installierte PWAs zeigen den neuen Namen erst nach einem Update bzw. neuem Hinzufügen zum Home-Bildschirm.

## D-026 · App-Icon: gefüllter Einkaufswagen auf geschwungener Strasse

- **Entscheidung:** Das Icon zeigt einen weiss gefüllten Einkaufswagen, der leicht schräg auf einer dunklen, S-förmig geschwungenen Strasse (#1e293b) fährt. Petrolfarbener Grund (#14b8a6), keine weiteren Details. Quelle ist `public/favicon.svg`. Daraus entstehen mit `rsvg-convert` favicon-32, icon-192/512, apple-touch-icon (180 px, ohne Rundung, weil iOS selbst rundet) und icon-maskable-512 (Motiv auf 80 % verkleinert, Strasse läuft bis zum Rand).
- **Begründung:** Entscheidung des Inhabers (Variante „i-b“). Der gefüllte Wagen bleibt auch in Home-Bildschirm-Grösse gut lesbar. Die Strasse verbindet Einkaufen und Unterwegs-Sein. iOS zeigt auf dem Home-Bildschirm nur PNG-Symbole, deshalb die PNG-Dateien.
- **Folgen:** Bereits installierte PWAs zeigen das neue Icon erst nach dem Entfernen und erneuten Hinzufügen zum Home-Bildschirm. Dasselbe Icon steht in der App neben dem App-Namen (Listenübersicht und Profil).

## D-027 · Community-Funktionen nicht im MVP, später als Modul

- **Entscheidung:** Korrekturen, eigene Landesbegriffe und Korrekturvorschläge (D-024) sind im MVP ausgeschaltet. Sie liegen als Modul in `src/features/community.ts` und werden über `FEATURES.community` in `src/features.ts` ein- und ausgeschaltet. Ausgeschaltet ist der Landesbegriff nicht antippbar, „Landesbegriff selbst eintragen“ fehlt, bereits gespeicherte eigene Begriffe werden ignoriert (es gilt das Wörterbuch), und es werden keine Vorschläge gesendet. Der Export-Job läuft nur noch manuell. Tabelle `term_suggestions` und Spalte `local_override` bleiben in der Datenbank. Weitere optionale Funktionen kommen nach demselben Muster als Modul dazu. Die Vorschläge beim Tippen (aus dem Wörterbuch) bleiben.
- **Begründung:** Entscheidung des Inhabers. Das MVP bleibt schlank, die Community-Funktionen sollen später modular ergänzt werden.
- **Folgen:** Fehler im Wörterbuch (S-001) lassen sich vorerst nur durch Claude im Code korrigieren. Die Datenschutzerklärung nennt Korrekturvorschläge nur bei eingeschaltetem Modul. Beim Einschalten: Flag setzen, Zeitplan im Export-Job wieder aktivieren, Datenschutz prüfen (D-023).


## D-028 · Beim Öffnen direkt zur zuletzt geöffneten Liste

- **Entscheidung:** Wird die App ohne bestimmtes Ziel geöffnet (Startseite, Home-Bildschirm-Icon), springt sie direkt zur zuletzt geöffneten Liste (`rl:last` im Browser-Speicher). Das passiert nur einmal beim Laden. „Alle Listen“ führt danach normal zur Übersicht. Wurde die Liste vom Gerät entfernt, erscheint die Übersicht. Links auf eine bestimmte Liste haben Vorrang.
- **Begründung:** Wunsch des Inhabers. Meist arbeitet man auf einer Reise mit genau einer Liste.
- **Folgen:** Wer die Übersicht sehen will, tippt einmal auf „Alle Listen“. Lädt man die Seite auf der Übersicht neu, landet man wieder in der letzten Liste.

## D-029 · Profil auf neuem Gerät: als bestehendes Mitglied auswählen

- **Entscheidung:** Öffnet man einen Listen-Link auf einem Gerät ohne Profil, zeigt die Einrichtung über dem Formular die Mitglieder der Liste (Name und Sprache). Ein Tipp auf den eigenen Namen übernimmt Name und Sprache. Möglich macht das die Datenbank-Funktion `list_member_profiles` (security definer, nur Name und Sprache, keine Kennungen). Die Mitgliederliste zeigt dieselbe Person (gleicher Name und gleiche Sprache) auf mehreren Geräten nur einmal.
- **Begründung:** Wunsch des Inhabers. Das Profil liegt nur im Browser, und jede anonyme Anmeldung ist eine neue Kennung. Eine frühere Mitgliedschaft lässt sich deshalb nicht automatisch einem neuen Gerät zuordnen, sondern nur durch Auswahl.
- **Folgen:** Wer den Link hat, sieht die Namen schon vor dem Beitreten (in der Datenschutzerklärung erwähnt). Die Funktion muss in Supabase angelegt sein (`supabase/schema.sql` erneut ausführen), sonst erscheint einfach das normale Formular. Siehe S-029.

## D-030 · Nach dem Einkauf: Erledigte entfernen, schon Gekauftes wieder hinzufügen

- **Entscheidung:** Über der Gruppe „Im Wagen“ steht der Knopf „Erledigte entfernen“ (automatisch: D-043). Er entfernt alle abgehakten Artikel (Soft-Delete) ohne Rückfrage, danach ist „Rückgängig“ möglich (D-042). Unter dem Eingabefeld zeigt „Schon mal gekauft“ bis zu 8 entfernte Artikel dieser Liste, die gerade nicht auf der Liste stehen (neueste zuerst, ohne Doppelte). Ein Tipp setzt den Artikel ohne Menge wieder auf die Liste, in der Sprache des Tippenden. Nur bei leerem Eingabefeld und nur, solange man ins Eingabefeld getippt hat (Wunsch des Inhabers). Gibt es noch nichts „Schon mal gekauft“, stehen dort Beispiele in der eigenen Sprache („Zum Beispiel“: 2 Milch, Brot, 500 g Hackfleisch, 1 kg Tomaten), die man antippen kann; sie zeigen nebenbei, wie man Mengen eingibt. Das Eingabefeld selbst zeigt nur „Was brauchst du?“ (Wunsch des Inhabers).
- **Begründung:** Auf Reisen kauft man fast täglich ein, eine Liste wird immer wieder verwendet (Vorschlag „wenige, aber gute Funktionen“, vom Inhaber gewählt).
- **Folgen:** Auch ohne Kauf gelöschte Artikel erscheinen unter „Schon mal gekauft“. Keine Datenbank-Änderung nötig.

## D-031 · Wer holt was: „Ich hole das“

- **Entscheidung:** Offene Artikel haben einen Hand-Knopf (✋), sobald die Liste mindestens zwei Mitglieder hat (D-065). Ein Tipp trägt den eigenen Namen ein (Spalte `items.claimed_by`), alle sehen „🙋 Anna holt das“ bzw. „Du holst das“. Nochmals tippen gibt ihn frei. Tippt jemand anderes, übernimmt er den Artikel. Beim Abhaken wird der Eintrag zurückgesetzt (Wunsch des Inhabers). Der Hinweis bricht nicht um.
- **Begründung:** Verhindert Doppelkäufe, wenn sich die Gruppe im Laden aufteilt. Hauptnutzen einer geteilten Liste.
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden (neue Spalte). Bis dahin schlägt nur das Speichern eines „Ich hole das“ fehl, alle anderen Änderungen werden weiter synchronisiert, weil `claimed_by` nur mitgeschickt wird, wenn es gesetzt ist. Der Name wird in der Datenschutzerklärung erwähnt.

## D-032 · Zeigen-Karte fürs Personal

- **Entscheidung:** „Dem Personal zeigen“ im Menü „…“ eines Artikels (D-073) öffnet eine bildschirmfüllende Karte. Inhalt der Karte: oben „Entschuldigung, wo finde ich das?“, gross der Begriff (mit Menge), darunter „Danke!“, alles in der Landessprache, klein der Artikel in der eigenen Sprache. Antippen oder ✕ schliesst sie. Die Sätze stehen in `src/data/phrases.ts` und enthalten den Begriff bewusst nicht, damit Fall und Artikel in keiner Sprache falsch werden. Mit eingeschaltetem Community-Modul gibt es „Begriff korrigieren“ nur noch für Artikel ohne Landesbegriff (S-045).
- **Begründung:** Hilft genau dann, wenn man im Laden nicht weiterkommt, ohne die Sprache sprechen zu müssen.
- **Folgen:** Die Sätze sind nicht von Muttersprachlern geprüft (S-001).

## D-033 · Ladensuche: neu suchen nur nach Ortswechsel, Prüfung im Hintergrund

- **Entscheidung:** Ein Suchergebnis bleibt gespeichert (`rl:nearby3`) und erscheint beim Öffnen sofort, ohne „Suche …“ (als Vorschlag beim Start höchstens 12 Stunden alt). Am gleichen Ort wird es bis 7 Tage wiederverwendet, weil Läden nicht umziehen (D-102). Beim Öffnen der Liste und beim Zurückkehren in die App (höchstens alle 2 Minuten) fragt die App still den Standort ab. Bei OpenStreetMap neu gesucht wird nur, wenn man sich mehr als 300 m bewegt hat (150 m, wenn man in einem Laden war), mindestens aber um die GPS-Ungenauigkeit. Sonst werden nur die Distanzen neu berechnet. Schlägt die Prüfung im Hintergrund fehl, bleibt der bisherige Laden stehen, ohne Fehlermeldung. „Neu suchen“ fragt immer neu. Ein gewählter Laden gilt, bis man sich mehr als 1 km davon entfernt hat (höchstens 24 Stunden, ältere Einträge ohne Lage 3 Stunden). In den ersten 30 Minuten nach der Wahl wird er nie automatisch verworfen, auch wenn er weiter weg ist: Oft wählt man einen Laden, zu dem man erst hingeht (Fehler gemeldet vom Inhaber: ein Laden in 1,2 km sprang sofort zurück). Danach wird er verworfen und der nächste Laden vorgeschlagen. Kein Dauer-Tracking.
- **Begründung:** Rückmeldung des Inhabers: Der Laden wurde neu gesucht, obwohl sich der Standort nicht geändert hatte. Ursache waren die kurze Gültigkeit (5 Minuten) und GPS-Sprünge in Gebäuden (mehr als 50 m). Läden ziehen nicht um, also zählt die Strecke statt der Zeit. Weniger Anfragen schonen auch die öffentlichen Server (S-025).
- **Folgen:** Ein neuer Laden direkt nebenan erscheint erst nach etwa 300 m Bewegung oder über „Neu suchen“. Auf dem Gerät werden die Stelle der letzten Suche und die Lage der gefundenen Läden gespeichert (in der Datenschutzerklärung erwähnt).


## D-035 · Neue Version auf allen Geräten erzwingen

- **Entscheidung:** Jeder Build bekommt eine Kennung (Commit-Hash auf GitHub, sonst Zeitstempel). Sie steckt im Code und in `version.json`. Beim Start und beim Zurückkehren in die App (höchstens jede Minute) lädt die App `version.json` am Service Worker vorbei. Weicht die Kennung ab, lädt sie hart neu: Service Worker abmelden, App-Cache leeren, Seite frisch laden. Offline gespeicherte Produktfotos bleiben. Gegen Schleifen gilt: pro Build höchstens ein Versuch alle 10 Minuten. Das bestehende automatische Update des Service Workers bleibt zusätzlich aktiv. Die laufende Version (Commit-Kennung) steht in der Fusszeile der Startseite und des Profils, dazu der Hinweis, wenn Animationen wegen „Bewegung reduzieren“ aus sind.
- **Begründung:** Wunsch des Inhabers. Installierte PWAs zeigten nach einem Deployment teilweise noch altes CSS und alten Code.
- **Folgen:** Jedes Deployment lädt alle offenen Apps beim nächsten Öffnen bzw. Zurückkehren einmal neu. Geräte mit einer Version ohne diese Prüfung bekommen sie erst mit dem nächsten normalen Update des Service Workers. Einen „Neu laden“-Link gibt es deshalb nicht mehr.

## D-036 · Listenübersicht: letzte Änderung zeigen, Listen entfernen

- **Entscheidung:** Unter jedem Listennamen in „Deine Listen“ steht die letzte Änderung („Geändert heute 10:58“, „gestern 18:20“ oder Datum mit Uhrzeit). Massgeblich ist die jüngste Änderung an der Liste oder an einem Artikel, zuerst aus dem Gerätespeicher, dann aktuell aus Supabase. Die Listen sind danach sortiert, die neueste oben. Das Papierkorb-Symbol fragt nach („Aus deinen Listen entfernen? Für die anderen Mitglieder bleibt sie bestehen.“) und entfernt die Liste dann vom Gerät und beendet die Mitgliedschaft in Supabase (Policy „members: leave“). Dasselbe macht „Liste verlassen“ im Menü der Liste, dort mit einem Warnfenster („„Barcelona“ verlassen?“, Verlassen/Abbrechen); kurz und von Gruppen-Chats bekannt, die Warnung erklärt den Rest. Beide Warnungen sind rot hervorgehoben. Mit dem Link kann man wieder beitreten. **Ist man das einzige Mitglied** (auch mit mehreren Geräten, gleicher Name und gleiche Sprache), heisst der Punkt „Liste löschen“, die Warnung „Du bist das einzige Mitglied. Die Liste wird mit allen Artikeln endgültig gelöscht.“ und die Liste wird in Supabase gelöscht (Funktion `delete_list`, prüft selbst, ob man allein ist; Artikel und Mitgliedschaften verschwinden mit; ist man inzwischen nicht mehr allein, tritt man nur aus). **Gnadenfrist:** Die Liste verschwindet sofort vom Gerät, auf der Startseite steht 8 Sekunden lang „„Testing“ gelöscht · Rückgängig“. Erst danach wird auf dem Server gelöscht. Wird die App vorher geschlossen, holt der nächste Start das Löschen nach (`rl:pendingDelete`). Kein Papierkorb über Tage (Empfehlung von Claude, vom Inhaber gewählt). Ob man allein ist, prüft die App beim Öffnen des Menüs bzw. beim Tippen auf den Papierkorb. Das letzte Ergebnis merkt sich das Gerät (`rl:sole:`), damit die Warnung sofort stimmt und nicht kurz nacheinander zwei Texte zeigt. Ist noch nichts bekannt, heisst der Menüpunkt „Liste verlassen“, in der Warnung steht während der Prüfung „…“ und der Knopf ist gesperrt. Offline oder wenn die Prüfung scheitert, gilt „verlassen“. Bei mehreren Mitgliedern lässt sich eine Liste nicht für alle löschen (S-010).
- **Begründung:** Wunsch des Inhabers. Bisher wurde eine Liste nur vom Gerät „vergessen“, die Mitgliedschaft blieb bestehen.
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden (neue Policy). Bis dahin wird die Liste nur lokal entfernt. Verlässt das letzte Mitglied eine Liste, bleibt sie verwaist in der Datenbank (F-010).


## D-037 · Listen in der iPhone-App vom Home-Bildschirm öffnen

- **Entscheidung:** Auf der Startseite öffnet „Liste beitreten“ ein Feld mit zwei Wegen: oben gross „QR-Code scannen“ (D-038), darunter „oder Link einfügen“. Für den Link gilt: Link (oder Text mit Link) einfügen, auf Wunsch mit „Einfügen“ aus der Zwischenablage, und die Liste öffnet sich. Wird ein Listen-Link auf dem iPhone in Safari geöffnet und war die Liste auf dem Gerät noch unbekannt (also nicht selbst angelegt), erklärt ein Hinweis über der Liste den Weg („Du bist im Browser. …“) und bietet „Link kopieren“ an. In allen anderen Fällen steht dort der Tipp aus D-061. Er lässt sich mit „Nicht mehr zeigen“ ausblenden. Auch das Teilen-Fenster nennt den Weg.
- **Begründung:** Rückmeldung des Inhabers: Haben beide die Web-App auf dem Home-Bildschirm, klappt das Teilen nicht. iOS öffnet Links immer in Safari, und Safari und die Home-Bildschirm-App haben getrennten Speicher.
- **Folgen:** Ein Schritt mehr für iPhone-Nutzer (Link kopieren, in der App einfügen). Eine echte Lösung wären native Apps mit Universal Links (D-009, F-006).

## D-038 · QR-Code einer Liste in der App scannen

- **Entscheidung:** Unter „Liste beitreten“ (D-037) ist „QR-Code scannen“ der primäre Weg. Er öffnet die Rückkamera bildschirmfüllend mit Rahmen. Erkannt wird mit der Bibliothek jsQR direkt im Browser (etwa 5 Bilder pro Sekunde, verkleinert). Sobald ein QR-Code mit Listen-Link erkannt ist, öffnet sich die Liste. Andere QR-Codes ergeben einen Hinweis. Unten im Scanner führt „Stattdessen Link einfügen“ zurück zum Link-Feld, auch wenn die Kamera nicht erlaubt ist. Der Scanner wird erst beim Öffnen geladen (eigene Datei, etwa 50 kB komprimiert).
- **Begründung:** Wunsch des Inhabers. Auf dem iPhone öffnet die Kamera-App QR-Codes in Safari, nicht in der Home-Bildschirm-App (D-037). Mit dem Scanner in der App landet die Liste direkt dort.
- **Folgen:** Kamerazugriff nur auf Knopfdruck und mit Erlaubnis, Bilder werden weder gespeichert noch gesendet (in der Datenschutzerklärung erwähnt). Auf echten Handys getestet.


## D-039 · Supabase wach halten per täglichem Ping

- **Entscheidung:** Der GitHub-Job „Supabase wach halten“ (`.github/workflows/keepalive.yml`) ruft täglich um 04:37 UTC die Datenbank-Funktion `ping()` auf. Sie schreibt einen Zeitstempel in die Tabelle `keepalive` (eine Zeile, kein direkter Zugriff). Fehlt die Funktion noch, macht der Job eine einfache Leseanfrage und warnt. Antwortet Supabase gar nicht, schlägt der Job fehl, und GitHub schickt eine E-Mail. Er nutzt URL und Publishable Key aus `.env.production`, es braucht kein Secret.
- **Begründung:** Gratis-Projekte werden nach 7 Tagen mit zu wenig Datenbank-Aktivität pausiert. Während einer Testreise mit wenigen Nutzern wäre die App dann ohne Sync. Eine kleine Schreibaktion zählt sicher als Aktivität.
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden. Supabase garantiert nicht, dass das reicht. Den Pausier-Schutz garantiert nur der Pro-Tarif (25 $ pro Monat). GitHub stoppt geplante Jobs in Repos ohne Aktivität nach 60 Tagen.

## D-040 · Reiseland passt sich beim Grenzübertritt automatisch an

- **Entscheidung:** Gilt nur für Listen mit Reiseland „Automatisch“ (D-057). Beim Öffnen einer Liste prüft die App still das aktuelle Land (Nominatim; ein gespeichertes Ergebnis gilt nur am gleichen Ort, D-087). Ist man in einem anderen unterstützten Reiseland als dem der Liste, wechselt sie das Reiseland der Liste automatisch (für alle Mitglieder) und zeigt in einer Zeile „Reiseland auf 🇫🇷 Frankreich – Französisch geändert“ mit „Rückgängig“ und ✕ rechts daneben. „Rückgängig“ stellt das alte Land wieder her, und für diese Liste wird nicht mehr automatisch auf dieses Land gewechselt (nur auf diesem Gerät). Das gilt auch für Länder mit der eigenen Sprache, z. B. nach der Rückreise in die Schweiz: Dort zeigt die Liste keine Übersetzung (D-081). In nicht unterstützten Ländern passiert nichts.
- **Begründung:** Wunsch des Inhabers. Auf Rundreisen (z. B. Spanien → Frankreich) soll die Liste ohne Handgriff die neue Landessprache zeigen, und zu Hause soll eine „automatische“ Liste auch wieder zu Hause sein.
- **Folgen:** Ein Mitglied mit anderer Sprache kann das Reiseland umstellen, während man selbst zu Hause ist, z. B. ein Gast aus Deutschland in Spanien. Dafür gibt es „Rückgängig“. Fällt der Standort weg (keine Erlaubnis), bleibt alles wie es ist.

## D-041 · International: Sprache statt Wohnland

- **Entscheidung:** Das Profil hat nur Name und Sprache, kein Wohnland mehr. Ob eine Übersetzung nötig ist, entscheidet die Sprache: Auch in einem Land, dessen Landessprache die eigene Sprache ist, folgt eine Liste mit „Automatisch“ dem Standort (D-040), und beim Anlegen gilt das erkannte Land (D-087); ohne erkanntes Land Spanien, Italien bzw. Frankreich (das erste mit fremder Sprache). Ein früher gespeichertes Wohnland wird ignoriert und beim nächsten Speichern des Profils entfernt.
- **Begründung:** Entscheidung des Inhabers: Für Expats funktionierte das Wohnland nicht. Eine Deutsche in Barcelona hatte „Spanien“ als Wohnland und bekam zu Hause nie Spanisch, obwohl sie genau dort die Übersetzung braucht. Die Übersetzung hängt ohnehin nur an den Sprachen. Ein Schritt weniger beim Einrichten und eine Angabe weniger.
- **Folgen:** Eine Deutschschweizerin in Deutschland bekommt mit „Automatisch“ das Reiseland Deutschland und sieht dort abweichende Begriffe, z. B. „Sahne“ statt „Rahm“ (D-081). Die Oberfläche bleibt Deutsch oder Englisch (D-022).

## D-042 · „Rückgängig“ nach dem Löschen statt Swipen

- **Entscheidung:** Nach dem Löschen eines Artikels (✕) oder nach „Erledigte entfernen“ erscheint unten 5 Sekunden lang „„Milch“ gelöscht · Rückgängig“ bzw. „2 Artikel entfernt · Rückgängig“. „Rückgängig“ stellt die Artikel mit Menge, Autor und Status wieder her. Gelöscht wird bei abgehakten Artikeln über das sichtbare ✕, bei offenen über „Löschen“ im Menü „…“ (D-085). Swipen gibt es vorerst nicht.
- **Begründung:** Empfehlung von Claude, vom Inhaber bestätigt. Testpersonen sollen die App ohne Erklärung bedienen können, ein sichtbares ✕ ist dafür besser als eine versteckte Wischgeste. Das grössere Problem war, dass versehentlich Gelöschtes weg war.
- **Folgen:** Ob die Zeilen ohne Swipen zu voll wirken, zeigt der Test mit Testpersonen. Swipen liesse sich dann mit wenig Aufwand ergänzen, das Rückgängig ist schon da.

## D-043 · Erledigte automatisch entfernen: nach dem Ladenbesuch oder nach 1 Tag

- **Entscheidung:** Abgehakte Artikel werden automatisch entfernt (Soft-Delete, danach „Rückgängig“ wie in D-042):
  - **Laden verlassen:** Hat der Einkauf begonnen (D-055) und ist man nachweislich beim Laden (höchstens 100 m vom Laden, GPS-Genauigkeit höchstens 100 m), merkt sich das Gerät den Besuch (Lage des Ladens, `rl:shopvisit:<Liste>`, höchstens 12 Stunden). Ein bloss vorgeschlagener Laden in der Nähe zählt nur, wenn man wirklich dort steht. Beim Zurückkehren in die App und alle 2 Minuten, solange sie offen ist, prüft es den Standort (und ob man inzwischen beim Laden angekommen ist). Ist man nach einem Besuch mehr als 150 m weg (mindestens die GPS-Ungenauigkeit), werden alle Erledigten entfernt: „Erledigte entfernt: 2 (Laden verlassen) · Rückgängig“.
  - **Nach 1 Tag:** Artikel, die vor mehr als 24 Stunden abgehakt wurden, werden beim Öffnen der Liste und alle 5 Minuten entfernt.
  - **Einstellung pro Liste:** „Erledigte automatisch entfernen“ unter Menü → Listen-Einstellungen, Standard an. Gespeichert in `lists.auto_clear`, gilt für alle Mitglieder.
- **Begründung:** Wunsch des Inhabers. Nach dem Einkauf soll die Liste ohne Handgriff wieder nur zeigen, was noch fehlt. Entfernte Artikel bleiben unter „Schon mal gekauft“ verfügbar.
- **Folgen:** Als Web-App prüft die App nur, wenn sie offen ist oder wieder geöffnet wird, nicht im Hintergrund. `supabase/schema.sql` muss erneut ausgeführt werden (neue Spalte), bis dahin funktioniert alles, nur das Abschalten wird nicht synchronisiert. Ohne Standortfreigabe greift nur die 1-Tages-Regel.

## D-044 · Weiche Übergänge bei Statuswechseln

- **Entscheidung:** Statuswechsel sind sichtbar animiert, kurz (150–400 ms) und ohne Spielerei:
  - **Abhaken:** Der Kreis ploppt, das Häkchen zeichnet sich, der Artikelname wird von links nach rechts durchgestrichen. Erst nach etwa 0,4 s rutscht die Zeile nach „Im Wagen“. Auf Android vibriert das Handy kurz.
  - **Umsortieren:** Zeilen und Abteilungs-Überschriften gleiten an ihren neuen Platz (FLIP-Technik, `src/lib/motion.ts`), statt zu springen.
  - **Hinzufügen und Rückgängig:** Neue Zeilen gleiten ein und leuchten kurz türkis auf. Liegt ein selbst hinzugefügter Artikel ausserhalb des sichtbaren Bereichs, scrollt die Liste nicht weg (man tippt oft mehrere Artikel hintereinander). Bestätigt wird direkt am Eingabefeld: Ein angetippter Vorschlag färbt sich kurz und zeigt ein Häkchen, ohne Text (zu kurz zum Lesen, Wunsch des Inhabers), bevor die Vorschläge schliessen. Beim Hinzufügen mit Enter oder „+“ wird das „+“ kurz zum Häkchen und das Eingabefeld leuchtet. Das Eingabefeld bleibt beim Scrollen oben stehen.
  - **Löschen und „Erledigte entfernen“:** Zeilen gleiten nach links hinaus, die Lücke schliesst sich weich. Die Rückgängig-Leiste fährt von unten herein.
  - **Änderungen anderer Mitglieder** (Sync): Die betroffene Zeile leuchtet kurz auf. Eigene Änderungen leuchten nicht.
  - **„Ich hole das“:** Die Hand ploppt, der Hinweis blendet ein.
  - Bei „Bewegung reduzieren“ im System gibt es keine Bewegung. Das Aufleuchten bleibt als kurze Einfärbung mit Farbübergang, damit Änderungen trotzdem sichtbar sind.
- **Begründung:** Wunsch des Inhabers: Statuswechsel sollen deutlicher und eleganter bestätigt werden. Im Laden soll man sehen, was gerade passiert ist, auch bei Änderungen anderer.
- **Folgen:** Abhaken wirkt sich erst nach 0,4 s auf Liste und Sync aus. Auf dem iPhone gibt es keine Vibration, weil Safari sie nicht unterstützt.

## D-045 · Gleiche Artikel nur bei gleicher Einheit zusammenzählen

- **Entscheidung:** Kommt ein Artikel dazu, der schon offen auf der Liste steht, wird die Menge nur addiert, wenn Artikel und Einheit genau übereinstimmen. Sonst kommt er als eigene Zeile dazu, ohne Nachfrage.
  - **Gleicher Artikel:** derselbe Wörterbuch-Eintrag („Milch“, „milk“, „leche“), aber nur, wenn der Text genau einem Namen dieses Eintrags entspricht. Wurde der Eintrag nur über ein enthaltenes Wort gefunden („feine Schokolade“), zählt der Text (ohne Gross- und Kleinschreibung). „H-Milch“ und „Milch“, „schwarze Schokolade“ und „Schokolade“ bleiben getrennt.
  - **Gleiche Einheit** (`src/lib/qty.ts`): Stück (ohne Angabe = 1), Gewicht (g/kg werden umgerechnet: „500 g + 1 kg = 1,5 kg“), Volumen (ml/cl/l), gleiche Packungsgrösse („2 × 100 g + 1 × 100 g = 3 × 100 g“), gleiches Packungswort („2 Packungen + 1 Packungen“).
  - **Zusammengezählt:** Die Leiste zeigt „Schokolade war schon auf der Liste: jetzt 3x · Rückgängig“, die bestehende Zeile leuchtet auf, die Liste scrollt nicht weg.
  - **Nicht zusammengezählt:** z. B. „3x Schokolade“ und „2 × 100 g Schokolade“ stehen als zwei Zeilen untereinander. Jede Zeile ist ein eigener Eintrag, es gibt keine zusammengefassten Zeilen.
  - **Beim Tippen:** Vorschläge, die schon offen auf der Liste stehen, zeigen die Menge: „✓ 3x auf der Liste“, ohne Menge „✓ 1x auf der Liste“. Steht der Artikel in mehreren Zeilen (z. B. „3x“ und „2 × 100 g“), nur „✓ auf der Liste“ (Wunsch des Inhabers).
- **Begründung:** Entscheidung des Inhabers: Zusammenfassen über verschiedene Einheiten schuf unverständliche Mengen („1 + 2 × 100 g + 2“) und falsche Verschmelzungen (schwarze Schokolade mit Schokolade). Nachfragen ist umständlich.
- **Folgen:** Werden derselbe Artikel und dieselbe Einheit gleichzeitig auf zwei Geräten eingetragen, entstehen zwei Zeilen (selten, kein automatisches Aufräumen).

## D-046 · Beginn des Einkaufs prüft den Laden genauer

- **Entscheidung:** Beginnt der Einkauf (erstes Abhaken oder beim Öffnen im Supermarkt, D-055), prüft die App im Hintergrund, ob der angezeigte Laden stimmt: frischer Standort (höchstens 10 Sekunden alt), neue Suche bei OpenStreetMap schon ab 75 m Abstand zur letzten Suche (sonst gilt D-033 mit 300 m); ohne Ortswechsel keine neue Suche (D-102). Ein von Hand gewählter Laden wird verworfen, wenn man mehr als 150 m davon entfernt ist (ausser in den ersten 30 Minuten nach der Wahl, D-033), danach sucht die App den Laden am aktuellen Standort. Der bisherige Laden bleibt bis zum Ergebnis stehen, ohne „Suche …“ und ohne Fehlermeldung. Höchstens eine solche Prüfung pro Minute.
- **Begründung:** Wunsch des Inhabers. Wer abhakt, steht meist im Laden. In Städten liegen oft mehrere Supermärkte innerhalb von 300 m, die Regel aus D-033 hätte dann den falschen Laden stehen lassen. Der richtige Laden zählt für Fotos und „Laden verlassen“ (D-043).
- **Folgen:** Etwas mehr Anfragen an OpenStreetMap, aber nur einmal zu Beginn des Einkaufs.

## D-049 · Grenzen gegen Missbrauch und Content-Security-Policy

- **Entscheidung:**
  - **Längen** (check-Bedingungen in `schema.sql`, gleich in `src/lib/limits.ts`): Listenname 1–80 Zeichen, Artikeltext 1–200, Menge 40, Namen 40. Die App begrenzt die Eingabefelder und kürzt vor dem Speichern, die Datenbank lehnt Längeres ab. Bestehende Daten bleiben unangetastet („not valid“).
  - **Mengen** (Trigger `enforce_limits`): höchstens 30 neue Listen pro Nutzer und Tag, 500 offene Artikel pro Liste, 300 neue Artikel pro Liste und Stunde, 50 Mitgliedschaften pro Liste. Änderungen an bestehenden Zeilen zählen nicht. Lehnt die Datenbank eine Änderung wegen einer Grenze ab, verwirft die App sie, statt sie endlos zu wiederholen; der Sync-Hinweis zeigt den Fehler.
  - **Content-Security-Policy** als `<meta>`-Tag im Build: Skripte nur von der eigenen Seite, Verbindungen nur zu Supabase, den zwei Overpass-Servern, Nominatim und Open Food Facts. Neue externe Dienste müssen in `vite.config.ts` (CSP) und in der Datenschutzerklärung ergänzt werden.
- **Begründung:** Befund der MVP-Beurteilung, vom Inhaber zur Umsetzung freigegeben. Anonyme Konten kann jeder anlegen; ohne Grenzen liesse sich der Gratis-Speicher mit einem Skript füllen. Die CSP ist eine zweite Verteidigungslinie gegen eingeschleustes Skript.
- **Folgen:** `supabase/schema.sql` muss neu ausgeführt werden. Die Grenze für anonyme Anmeldungen pro IP-Adresse stellt Supabase selbst (Dashboard → Authentication → Rate Limits), sie ist nicht im Code. Eine CSP über HTTP-Header (z. B. `frame-ancestors`) erlaubt GitHub Pages nicht.

## D-050 · Datenbank-Sicherung: vorbereitet, Pflicht vor der nativen App

- **Entscheidung:** Der GitHub-Workflow „Datenbank sichern“ (`.github/workflows/backup.yml`) ist vorbereitet, aber vorerst nicht eingeschaltet: keine Secrets, kein Zeitplan, nur von Hand startbar. **Vor der nativen App ist die Sicherung Pflicht** (Phase 0 im Konzept). Dann: Secrets `SUPABASE_DB_URL` (Verbindung „Session pooler“ mit Passwort) und `BACKUP_PASSPHRASE` setzen, wöchentlichen Zeitplan im Workflow einschalten, ersten Lauf prüfen, Satz zur Sicherung in der Datenschutzerklärung ergänzen (Sicherung bei GitHub, USA, 90 Tage). Der Workflow sichert das Schema `public` und die Kennungen der anonymen Konten (`auth.users`) mit `pg_dump`, verschlüsselt mit GPG (AES-256) und bewahrt die Datei 90 Tage als Artefakt auf. Die Passphrase muss der Inhaber zusätzlich sicher aufbewahren.
- **Begründung:** Entscheidung des Inhabers: Für den privaten Test genügt es vorerst ohne Sicherung, für Nutzer aus den App-Stores nicht. Das Repo ist öffentlich, darum nur verschlüsselt.
- **Folgen:** Bis dahin gibt es keine Sicherung, und die Wiederherstellung ist nicht geübt (S-035).

## D-051 · Eigene Fehlerüberwachung über Supabase

- **Entscheidung:** Fehler in der App (`error`, `unhandledrejection`) und beim Abgleich mit Supabase (`setError`) schickt die App in die Tabelle `client_errors`: Art, Fehlertext, Stack, App-Version, Bereich der App (`#/l/<id>` ohne Kennung), Browser-Kennung, anonyme Nutzer-Kennung. Vorher entfernt `src/lib/errors.ts` Kennungen (UUIDs) und von der Datenbank zitierte Zeilen („Failing row contains …“), damit keine Listeninhalte mitkommen. Netzwerk-Aussetzer (offline) werden nicht gemeldet. Pro Sitzung höchstens 20 verschiedene Meldungen, jede nur einmal; die Datenbank nimmt höchstens 50 pro Nutzer und Stunde an. Nutzer können nur eintragen, nicht lesen. Ausgewertet wird im SQL Editor (`select * from public.client_errors_summary;`). `ping()` (täglicher Job) löscht Meldungen nach 30 Tagen.
- **Begründung:** Befund der MVP-Beurteilung, vom Inhaber zur Umsetzung gewählt. Ohne Fremddienst (kein Sentry), Daten bleiben bei Supabase in London. In der Testphase sollen Fehler auffallen, die niemand meldet.
- **Folgen:** Neuer Datenfluss, in der Datenschutzerklärung beschrieben. `supabase/schema.sql` muss neu ausgeführt werden, sonst gehen die Meldungen ins Leere (die App merkt davon nichts).

## D-052 · Automatische Tests vor jeder Veröffentlichung

- **Entscheidung:** Vor jedem Deployment laufen in GitHub Actions: Lint, Vitest (`npm test`: Wörterbuch und Oberflächentexte auf fehlende Übersetzungen, Übersetzung, Mengen, Fehlerbereinigung und das Datenbank-Schema mit PGlite, einem echten Postgres im Speicher) und Playwright-Oberflächentests (`npm run e2e`, Ordner `e2e/`). Die Oberflächentests laufen gegen einen eigenen Build ohne Supabase, alle fremden Server sind gesperrt. Sie spielen durch: Profil und Liste anlegen, Übersetzung, Länder-Abweichung (Mexiko), Mengen zusammenzählen, eine Ansicht mit Löschen nur bei Abgehakten und Zeigen-Karte, Menü und Profil, Teilen mit QR-Code, Liste löschen mit Rückgängig, Datenschutzseite. Jeder Test schlägt zusätzlich fehl, wenn ein JavaScript-Fehler oder ein Verstoss gegen die Content-Security-Policy auftritt. Schlägt etwas fehl, wird nicht veröffentlicht; der Bericht liegt 7 Tage als Artefakt beim Lauf.
- **Begründung:** Befund der MVP-Beurteilung, vom Inhaber freigegeben. Änderungen werden damit sicherer, auch grössere Umbauten wie das Aufteilen der Oberfläche in `src/ui/`.
- **Folgen:** Ein Deployment dauert rund 2 Minuten länger. Neue Funktionen bekommen einen Ablauf in `e2e/app.spec.ts`, Schema-Änderungen einen Fall in `tests/schema.test.ts`.

## D-053 · Übersetzungen als Datendateien pro Sprache, mit Länder-Abweichungen

- **Entscheidung:** Vom Inhaber gewählt, noch im MVP umgesetzt.
  - **Artikel:** `src/data/dictionary/concepts.json` führt jeden Artikel einmal mit allen sprachunabhängigen Angaben: ID, Abteilung, Open-Food-Facts-Kategorie (`off`), Tipp (`hint`).
  - **Begriffe:** eine Datei pro Sprache (`de.json`, `es.json` …), pro Artikel eine Liste von Namen. Der erste Name wird angezeigt, alle werden bei der Eingabe erkannt.
  - **Länder-Abweichungen:** eigene Dateien wie `es-MX.json`, die nur die abweichenden Artikel enthalten. Das Land verweist darauf (`variant` in `src/data/countries.ts`). Bisher: en-US, es-MX, es-AR, pt-BR, de-CH (gilt auch für Liechtenstein), de-AT. Abweichende Begriffe werden in der ganzen Sprache erkannt, aber nur, wenn sie nicht schon einen anderen Artikel bezeichnen (brasilianisch „presunto“ = Kochschinken, in Portugal bleibt es Rohschinken).
  - **Laden:** Die App lädt nur die nötigen Sprachen nach (eigene, Landessprache, Sprachen der Einträge), jede als eigene kleine Datei. Die Liste erscheint, sobald eigene und Landessprache da sind. Die Dateien liegen im Offline-Speicher der App.
  - **Oberfläche:** `src/locales/<sprache>.json` im Standardformat ICU MessageFormat mit Einzahl/Mehrzahl (`{n, plural, one {…} other {…}}`) und Auswahl (`select`). Ein kleiner eigener Formatierer in `src/i18n.ts` nutzt die Mehrzahlregeln des Browsers (`Intl.PluralRules`), keine Zusatzbibliothek.
  - **Prüfen:** Tests melden fehlende oder unbekannte Begriffe pro Sprache, Doppeldeutigkeiten, fehlende Oberflächentexte und abweichende Platzhalter. `npm run review:export` erzeugt pro Sprache eine Prüftabelle (CSV) für Muttersprachler im Ordner `review/` (nicht im Repo).
- **Begründung:** Neue Sprachen und Länder kommen ohne Umbau dazu, Übersetzer arbeiten mit Dateien statt Code, Mexiko, Argentinien, Brasilien, die USA und die Schweiz bekommen ihre eigenen Begriffe. Jetzt umbauen ist günstiger als nach dem Start der nativen App.
- **Folgen:** Neuer Artikel: Eintrag in `concepts.json` und in jeder Sprachdatei (der Test meldet Lücken). Eine Übersetzungsplattform (z. B. Weblate) und das Wörterbuch in Supabase mit Prüfstatus folgen später, die Dateien sind dafür schon im passenden Format.

## D-054 · Listenübersicht zeigt die Teilnehmer

- **Entscheidung:** Unter der letzten Änderung steht in „Deine Listen“ pro Liste eine Zeile mit den anderen Mitgliedern (ohne einen selbst), jüngste Aktivität zuerst, z. B. „Anna, Bea, Carl“. Höchstens eine Zeile, der Rest wird mit „…“ abgeschnitten. Aktivität ist der jüngste Zeitpunkt aus Beitritt, selbst hinzugefügten Artikeln und Artikeln, die jemand holt. Dieselbe Person auf mehreren Geräten (gleicher Name und Sprache) erscheint einmal. Die Daten kommen in derselben Abfrage wie die letzte Änderung aus Supabase und werden auf dem Gerät gemerkt (`rl:people:`); ohne diese Angabe (offline, ohne Supabase) zeigt die App die Autoren der Artikel. Allein in einer Liste: keine Zeile. Logik in `src/lib/people.ts`.
- **Begründung:** Wunsch des Inhabers: auf einen Blick sehen, mit wem man eine Liste teilt.
- **Folgen:** Wer zuletzt etwas abgehakt hat, zählt nicht als Aktivität, weil die Datenbank nicht speichert, wer abhakt. Die Übersicht fragt zusätzlich die Mitglieder aller Listen ab (eine Abfrage mehr beim Öffnen der Startseite).

## D-055 · Eine Ansicht statt Laden- und Bearbeiten-Ansicht

- **Entscheidung:** Die Liste hat nur noch eine Ansicht, Wunsch des Inhabers. Das Eingabefeld steht immer oben. Jeder offene Artikel zeigt Fotos und Tipp (📷, D-095), in Listen mit mindestens zwei Personen „Ich hole das“ (✋, D-065) und das Menü „…“ mit Zeigen-Karte und Rückmeldung (D-073). Die Schrift hat die Grösse der früheren Bearbeiten-Ansicht. Löschen als sichtbares ✕ gibt es nur bei abgehakten Artikeln, damit offene nicht versehentlich verschwinden; offene löscht man über das Menü „…“ (D-085). Der Knopf „Ladenansicht/Bearbeiten“ und die Hinweise „Ladenansicht eingeschaltet · zurück“ entfallen.
- **Einkauf beginnt** (unsichtbar): beim ersten Abhaken oder beim Öffnen direkt im Supermarkt (D-020). Ab dann wird ein Ladenbesuch erfasst (D-043), und der Laden wird einmal genauer geprüft (D-046).
- **Begründung:** Zwei Ansichten mit automatischem Wechsel waren schwer zu verstehen; im Laden will man auch schnell etwas ergänzen.
- **Folgen:** Mehr Knöpfe pro Zeile. Die grosse Ladenschrift fällt weg. Der Kreis zum Abhaken bleibt 30 px gross, reagiert aber auf einen Bereich von rund 50 px (Wunsch des Inhabers).

## D-056 · Profilsprache mit Länder-Abweichung: Deutsch (Deutschland, Österreich, Schweiz)

- **Entscheidung:** Im Profil stehen „Deutsch (Deutschland)“, „Deutsch (Österreich)“ und „Deutsch (Schweiz)“ getrennt zur Wahl (Wunsch des Inhabers). Mit Österreich oder Schweiz erscheinen Artikel in der eigenen Sprache mit den Begriffen aus `de-AT.json` (Obers, Schlagobers, Topfen, Paradeiser, Erdäpfel, Marillen, Karfiol, Faschiertes, Fisolen, Melanzani, Semmeln, Germ, Staubzucker, Sackerl …) bzw. `de-CH.json` (Rahm, Poulet, Peperoni, Glace …). Das gilt auch für Artikel, die andere eingetragen haben, und für die Vorschläge beim Tippen. Ein selbst getippter Text wird nur ersetzt, wenn er genau ein Name des Artikels ist („Sahne“ → „Rahm“), Zusätze bleiben („Schwarze Schokolade“). Gespeichert wird das als `region` im Profil auf dem Gerät; bei den Mitgliedern der Liste steht weiter nur die Sprache. Ein Browser auf `de-CH`/`de-LI` bzw. `de-AT` wählt die passende Variante vor. Listen mit Reiseland Österreich zeigen den Landesbegriff ebenfalls österreichisch. Die Auswahl steht in `PROFILE_LANGS` (`src/data/countries.ts`). Der Profil-Knopf oben in der Listenübersicht zeigt Name, Flagge und Sprachkürzel, z. B. „Tobias · 🇨🇭 DE“, „Anna · 🇦🇹 DE“, „Max · 🇩🇪 DE“; Englisch ohne Abweichung mit 🇬🇧 (Wunsch des Inhabers); ausgeschrieben steht die Sprache im Profil.
- **Begründung:** Schweizer und Österreicher sollen ihre eigenen Wörter sehen, Deutsche die standarddeutschen.
- **Folgen:** Die österreichischen Begriffe sind von Claude und nur dort eingetragen, wo sie im Supermarkt üblich sind (S-001). Wer auf einem neuen Gerät ein bestehendes Mitglied wählt (D-029), bekommt die Sprache ohne Abweichung und muss sie im Profil nachstellen.

## D-057 · Reiseland standardmässig „Automatisch“

- **Entscheidung:** Beim Anlegen einer Liste steht das Reiseland auf „Automatisch (🇪🇸 Spanien)“ (Wunsch des Inhabers); ohne Standort fragt „Liste erstellen“ erst danach (D-066, D-067). In Klammern steht das Land, das gerade gilt: der Standort, wenn man in einem Land mit anderer Sprache ist, sonst die Vorauswahl (D-041). Ohne erklärenden Text, damit das Formular kurz bleibt. Erst in „Liste bearbeiten“ steht darunter: „Wechselt mit deinem Standort, ausser im Land deiner Sprache.“ Wer ein Land fest wählt, schaltet den automatischen Wechsel für diese Liste ab. Dieselbe Auswahl steht in „Liste bearbeiten“. Gespeichert in der Spalte `lists.auto_country` (Standard: an, gilt für alle Mitglieder). Bestehende Listen sind automatisch, wie bisher (D-040).
- **Begründung:** Auf Reisen soll die Liste ohne Handgriff die Sprache des Landes zeigen, in dem man gerade ist. Wer für ein bestimmtes Land plant (z. B. zu Hause für die Ferien), wählt es fest.
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden (neue Spalte). Bis dahin scheitert das Speichern neuer Listen und geänderter Listen-Einstellungen in Supabase („Could not find the 'auto_country' column“); die Liste bleibt auf dem Gerät und wird nach dem Ausführen nachgeliefert.

## D-058 · Neue Liste: Name zuerst und Pflicht

- **Entscheidung:** Im Formular „Neue Liste“ steht der Name zuoberst, vor dem Reiseland, und muss ausgefüllt sein; „Liste erstellen“ ist bis dahin ausgegraut. Den automatischen Namen „Einkauf Spanien“ gibt es nicht mehr. Als Beispiel im leeren Feld steht „z. B. Einkaufsliste Spanien“ mit dem gewählten bzw. vorausgewählten Reiseland (Wunsch des Inhabers). Beim Teilen ist der QR-Code grösser (bis 280 px breit, schärfer erzeugt), damit er sich leichter scannen lässt.
- **Begründung:** Wunsch des Inhabers. Mit automatischem Reiseland (D-057) sagt das Land wenig über die Liste aus, ein eigener Name unterscheidet die Listen in der Übersicht.
- **Folgen:** Ein Schritt mehr beim Anlegen.

## D-059 · Wörterbuch verbessern aus Nutzer-Rückmeldungen, ohne Muttersprachler

- **Entscheidung:** Entscheidung des Inhabers: weitgehend automatisch, einfache Rückmeldung, ohne Muttersprachler, KI vorerst nur von Hand (ohne API).
  - **Sammeln:** Findet die App für eine Eingabe keine Übersetzung, meldet sie das anonym („miss“), ausser die eigene Sprache ist die Landessprache. Im Menü „…“ eines Artikels steht „Begriff stimmt nicht?“; es öffnet das Blatt „Übersetzung falsch melden“ mit dem Begriff („Sahne → 🇪🇸 nata“), einem erklärenden Satz, einem freiwilligen Feld für einen besseren Begriff und dem Knopf „Fehler melden“ („wrong“, D-073). Auf der Zeigen-Karte steht es nicht mehr, weil das Personal sie sieht. Jede Meldung pro Gerät nur einmal. Tabelle `dictionary_feedback` (nur eintragen, höchstens 100 pro Person und Stunde, nach 180 Tagen gelöscht), Zusammenfassung `dictionary_feedback_summary` mit Zahl verschiedener Personen.
  - **Exportieren:** Workflow „Wörterbuch-Feedback exportieren“ (von Hand) schreibt `docs/woerterbuch-feedback.csv`, nur Einträge von mindestens 2 Personen (einstellbar). Bei Vorschlägen zählt `scripts/feedback-check.mjs`, wie viele Produkte im Reiseland bei Open Food Facts den alten bzw. den vorgeschlagenen Begriff im Namen tragen.
  - **Auswerten:** Claude von Hand nach festen Regeln (`docs/woerterbuch-feedback.md`): Mehrheit, Beleg in Open Food Facts, zweiter unabhängiger Prüfdurchgang, Änderungen als Commit mit Liste für den Inhaber.
- **Begründung:** Keine Muttersprachler verfügbar; das stärkste Signal sind fehlende Wörter. Mehrheit und Produktdaten ersetzen die menschliche Prüfung so weit wie möglich. Ohne API keine laufenden Kosten und kein Schlüssel.
- **Folgen:** Neuer Datenfluss, in der Datenschutzerklärung beschrieben. `supabase/schema.sql` muss erneut ausgeführt werden, sonst gehen die Meldungen ins Leere. Das bestehende Community-Modul (D-024, D-027) bleibt aus. Live-Übersetzung mit KI bleibt offen (F-004).


## D-060 · Schriftzug des App-Namens in Grand Hotel

- **Entscheidung:** Der App-Name neben dem Icon (Listenübersicht und Profil) steht in der schmalen Retro-Schreibschrift Grand Hotel, etwas grösser als die übrige Kopfzeile. Alle übrigen Texte bleiben in der Systemschrift. Die Schrift kommt als npm-Paket `@fontsource/grand-hotel` (nur lateinische Zeichen) mit der App und wird für offline vorgeladen, keine Verbindung zu Google Fonts.
- **Begründung:** Entscheidung des Inhabers aus zwei Runden mit Varianten. Verspielt im Retro-Stil, aber dünner und ruhiger als Pacifico (die gewählten Schriften gibt es nur in einer Strichstärke, dünner geht nur über eine andere Schrift); passt zum Road-Trip-Bild.
- **Folgen:** Wird der Platz knapp, kürzt der Name mit „…“. Bis die Schrift geladen ist (nur beim allerersten Öffnen), steht der Name kurz in einer Ersatzschrift.

## D-061 · Tipp „Auf den Home-Bildschirm“ mit Anleitung

- **Entscheidung:** Im Handy-Browser (iPhone oder Android, nicht als Home-Bildschirm-App) steht über der Liste ein kurzer Tipp: „Leg Cart on the Road auf den Home-Bildschirm, dann startet sie wie eine App.“ Knöpfe: „Anleitung“ und „Nicht mehr zeigen“ (`rl:installHint`). Die Anleitung zeigt drei Schritte passend zum Gerät (Safari: Teilen-Symbol bzw. „•••“ → „Zum Home-Bildschirm“ → „Hinzufügen“; Chrome: „⋮“ → „Zum Startbildschirm hinzufügen“/„App installieren“ → „Installieren“). Auf dem iPhone erklärt sie zusätzlich, dass die App einen eigenen Speicher hat, und bietet „Link kopieren“ für die aktuelle Liste an. Ausnahme: Kam man über einen fremden Listen-Link, erscheint stattdessen der Link-Hinweis (D-037). Ob das so war, merkt sich die App beim Start (Listen-Adresse und ob die Liste schon auf dem Gerät war).
- **Begründung:** Wunsch des Inhabers. Der Link-Hinweis war für Nutzer, die selbst eine Liste anlegen, verwirrend. Wer die App noch nicht installiert hat, soll erfahren, dass es geht und wie.
- **Folgen:** Vorübergehend ausgeschaltet (Wunsch des Inhabers, Schalter `SHOW_INSTALL_HINT` in `src/ui/list/AppHint.tsx`); der Link-Hinweis aus D-037 bleibt. Kein automatischer Installations-Dialog (Chrome würde ihn anbieten, ist aber nicht eingebaut). Die Menübezeichnungen in Safari und Chrome ändern sich je nach Version; die Anleitung nennt deshalb Alternativen.

## D-062 · Vietnamesisch im Wörterbuch

- **Entscheidung:** Vietnamesisch (`vi`) ist Wörterbuchsprache, nicht Oberflächensprache (Wunsch des Inhabers). Reiseland Vietnam 🇻🇳, im Profil „Tiếng Việt“ wählbar (Oberfläche dann Englisch, S-008), Sätze der Zeigen-Karte, Produktfotos aus Open Food Facts für Vietnam. Angezeigt wird der im Süden übliche Begriff (z. B. heo, bắp, đậu phộng, ngò), die nördlichen (lợn, ngô, lạc, rau mùi) werden bei der Eingabe erkannt. Beim Vergleich behält Vietnamesisch seine Zeichen, weil sie Wörter unterscheiden (bơ = Butter, bò = Rind); ohne Zeichen Getipptes („sua tuoi“) findet über die Vorschläge den richtigen Artikel. Vietnamesische Packungswörter (hộp, chai, gói, lon, túi …) zählen zur Menge.
- **Begründung:** Wunsch des Inhabers. Vietnamesisch ist ohne Zeichen stark mehrdeutig, deshalb kein automatisches Erkennen ohne Zeichen.
- **Folgen:** Wer ohne Zeichen tippt und keinen Vorschlag wählt, bekommt einen eigenen Begriff ohne Übersetzung. Open Food Facts hat für Vietnam wenige Produkte, Fotos fehlen oft. Die Übersetzungen sind ein ungeprüfter Entwurf (S-001).

## D-063 · Reihenfolge der Reiseland-Auswahl

- **Entscheidung:** Die Reiseland-Auswahl (neue Liste und „Liste bearbeiten“) zeigt nach „Automatisch“ zuerst bis zu drei „Vorschläge“: das zuletzt erkannte Land des Standorts und die Reiseländer der zuletzt geänderten Listen, ohne Länder der eigenen Sprache. Darunter stehen unter „Alle Länder“ alle Länder alphabetisch nach ihrem Namen in der Sprache der Oberfläche; Vorschläge erscheinen dort ein zweites Mal an ihrem alphabetischen Platz. Ohne Vorschläge gibt es nur die alphabetische Liste ohne Überschriften.
- **Begründung:** Wahl des Inhabers aus drei Varianten (alphabetisch, nach Sprache gruppiert, Vorschläge plus alphabetisch). Meist steht das gesuchte Land oben, sonst findet man es alphabetisch.
- **Folgen:** Der Standort wird für die Reihenfolge nicht neu abgefragt, es zählt nur das gespeicherte Ergebnis (höchstens 6 Stunden alt).

## D-064 · Taiwan und Chinesisch (traditionell) im Wörterbuch

- **Entscheidung:** Chinesisch (`zh`) ist Wörterbuchsprache, nicht Oberflächensprache (Wunsch des Inhabers: Taiwan). Die Grunddatei `zh.json` enthält traditionelle Schriftzeichen mit taiwanischen Begriffen (z. B. 鮮奶, 起司, 吐司, 高麗菜, 衛生紙). Reiseland Taiwan 🇹🇼, im Profil „繁體中文“ wählbar (Oberfläche dann Englisch, S-008), Sätze der Zeigen-Karte, Produktfotos aus Open Food Facts für Taiwan. Weil Chinesisch ohne Leerzeichen geschrieben wird, gilt ein Begriff als enthalten, wenn er irgendwo in der Eingabe steht („冰鮮奶“ → Milch), und Vorschläge gibt es schon ab einem Zeichen („蛋“). Mengen mit Zählwort ohne Leerzeichen werden abgetrennt, vorne oder hinten („2瓶鮮奶“, „雞蛋10顆“, „500公克絞肉“).
- **Begründung:** Wunsch des Inhabers. Traditionell und taiwanisch als Grundlage, weil Taiwan das erste chinesischsprachige Reiseland ist.
- **Folgen:** Kommt später China dazu, braucht es eine Länder-Abweichung in vereinfachten Schriftzeichen (`zh-CN.json`, D-053), die alle Begriffe abdeckt. Open Food Facts hat für Taiwan wenige Produkte, Fotos fehlen oft. Die Übersetzungen sind ein ungeprüfter Entwurf (S-001).

## D-065 · „Ich hole das“ nur in Listen mit mindestens zwei Personen

- **Entscheidung:** Der Hand-Knopf (D-031) erscheint nur, wenn die Liste mindestens zwei Mitglieder hat (verschiedene Personen; dieselbe Person auf mehreren Geräten zählt einmal, D-036). Geprüft wird beim Öffnen der Liste, das letzte Ergebnis merkt sich das Gerät (`rl:sole:`). Unabhängig davon, wo man ist. Wer einen Artikel übernommen hat, sieht den Knopf weiterhin, um ihn wieder freizugeben. Der Hinweis „Anna holt das“ bleibt für alle sichtbar.
- **Begründung:** Wunsch des Inhabers: einfach halten. Allein braucht man niemandem zu sagen, wer etwas holt. Eine Variante, die nur bei gemeinsamem Einkauf im selben Laden den Knopf zeigt, wurde verworfen (zu unzuverlässig und gibt den Aufenthaltsort an andere Mitglieder weiter).
- **Folgen:** Kommt jemand neu dazu, erscheint der Knopf erst beim nächsten Öffnen der Liste. Ohne Supabase (Demo) gibt es ihn nie.

## D-066 · Standort erst beim Erstellen fragen, mit Ausweg

- **Entscheidung:** Die App fragt nach dem Standort, wenn er gebraucht wird, und erklärt vorher den Nutzen (Option B aus dem [Konzept: Standortfreigabe](https://claude.ai/artifact/CENx17ikbrmFZZaZo91MN5)). Tippt man „Liste erstellen“ mit Reiseland „Automatisch“ und der Standort fehlt, öffnet sich ein Blatt „Reiseland automatisch“: „„Automatisch“ wechselt das Reiseland mit deinem Standort, zum Beispiel auf einer Rundreise. Dafür braucht die App deinen Standort.“, darunter Datenschutz-Satz mit Link und die Knöpfe „Standort freigeben“ und „Land selbst wählen“.
  - **Standort freigeben:** Rückfrage des Browsers. Erlaubt → die Liste entsteht auf „Automatisch“ mit dem aktuellen Land (falls unterstützt und nicht die eigene Sprache, sonst die Vorauswahl). Erlaubt, aber keine Ortung (Gebäude, Zeitüberschreitung) → trotzdem „Automatisch“ mit der Vorauswahl. Abgelehnt → Landwahl.
  - **Land selbst wählen:** Das Blatt zeigt „Reiseland wählen“ mit der Länderauswahl (D-063) und „Liste erstellen“; die Liste bekommt dieses Land fest.
  - **Im Browser gesperrt:** Das Blatt zeigt gleich die Landwahl mit dem Satz, dass der Standort in den Browser-Einstellungen gesperrt ist.
  - Dasselbe Blatt erscheint in „Liste bearbeiten“ beim Wechsel auf „Automatisch“ (Knopf „Speichern“). Die Ladenzeile der Liste bietet weiterhin „Standort freigeben“ an. Eine Frage auf der Startseite gibt es nicht mehr. Die Zustimmung in der App steht in `rl:locConsent`; hat der Browser den Standort schon erlaubt, fragt die App nicht.
- **Begründung:** Wahl des Inhabers. Die Frage kommt im Moment des Nutzens, niemand landet in einer Sackgasse, und die Einwilligung bleibt freiwillig, weil eine Liste mit festem Land keinen Standort braucht. Safari auf dem iPhone merkt sich ein „Nicht erlauben“; eine verfrühte Rückfrage ohne Erklärung lässt sich nur mühsam in den Einstellungen rückgängig machen.
- **Folgen:** Wer den Standort nicht freigibt, sieht das Blatt bei jeder neuen Liste auf „Automatisch“ wieder (ein Tipp mehr als mit festem Land).

## D-067 · „Automatisch“ immer Standard, aber nur mit Standort

- **Entscheidung:** Beim Anlegen einer Liste steht das Reiseland immer auf „Automatisch“, auch ohne Standort. Eine Liste auf „Automatisch“ entsteht aber nur mit freigegebenem Standort; sonst führt „Liste erstellen“ über das Blatt aus D-066 zu einer Liste mit festem Land. Die Option ist nie ausgegraut. Ohne Standort heisst sie „Automatisch (nach Standort)“, ohne Land in Klammern, weil das Land nur geraten wäre.
- **Begründung:** Wunsch des Inhabers. Ohne Standort würde „Automatisch“ nie wechseln und nur so tun als ob.
- **Folgen:** Ob der Browser den Standort sperrt, erfährt die App über die Permissions-API; wo sie fehlt, erst nach einer gescheiterten Abfrage.

## D-068 · Onboarding: Einkaufsliste zuerst, keine Hinweise in der Liste

- **Entscheidung:** Aus dem [Konzept: Onboarding](https://claude.ai/artifact/9qozxTcNmEQUd4EGFsUwJE) umgesetzt: klare Vorstellung auf dem ersten Bildschirm (Option D, ohne deren Hinweise in der Liste). Die App stellt sich als Einkaufsliste für die Reise vor; das Besondere ist die Sprache des Reiselands, das Teilen wird nur nebenbei erwähnt, weil es selbstverständlich ist (Wunsch des Inhabers).
  - **Erster Bildschirm:** Überschrift „Die Einkaufsliste für die Reise“, darunter „Du schreibst „Milch“, und im Laden in Spanien steht „leche“: Die App zeigt jeden Artikel so, wie er im Reiseland heisst. Teilen mit der Reisegruppe inklusive.“, dann Name und Sprache. Kein Beispielbild: Eine Beispiel-Liste über dem Formular war nicht von den Eingabefeldern zu unterscheiden und wurde wieder entfernt (Wunsch des Inhabers).
  - **Über einen Link eingeladen:** Überschrift „Anna hat dich zu einer Einkaufsliste eingeladen“ (erstes bekanntes Mitglied), sonst „Du wurdest zu einer Einkaufsliste eingeladen“, darunter direkt Name und Sprache, ohne Erklärungstext: Die Liste zeigt gleich danach, was die App macht (Wunsch des Inhabers). Bekannte Mitglieder der Liste (D-029) stehen ohne eigene Karte als Namen zum Antippen über dem Formular, getrennt durch eine Linie „oder neu“. Das Namensfeld bekommt hier nicht automatisch den Fokus, damit die Tastatur die Seite nicht verdeckt.
  - **Startseite:** „Neue Liste“ und „Liste beitreten“ sind eingeklappt, bis man sie antippt, auch ohne Listen (Wunsch des Inhabers). Das Formular hat immer ein ✕ zum Schliessen. Gibt es noch keine Liste, ist „Neue Liste“ gefüllt (hervorgehobener nächster Schritt), „Liste beitreten“ bleibt ein gleich grosser normaler Knopf (iPhone-Nutzer mit der App auf dem Home-Bildschirm treten nur darüber bei, D-037), und darunter steht „Noch keine Liste. Leg deine erste an, zum Beispiel für die nächste Reise.“ Die Knopfleiste bleibt an ihrem Platz, damit sie nach der ersten Liste nicht springt.
  - **Keine Hinweise in der Liste:** Der frühere Hinweis zur Übersetzung („Unter jedem Artikel steht, wie er im Laden des Reiselands heisst.“) und der Hinweis zum Teilen sind entfernt (Wunsch des Inhabers: Tipps reduzieren). Die Flagge vor dem Landesbegriff erklärt die Zeile. Es bleiben nur der Link-Hinweis auf dem iPhone (D-061) und die Frage nach dem Standort (D-066), beide nur, wenn sie anstehen.
  - Im Profil-Bearbeiten bleibt der kurze Satz (`tagline`).
- **Begründung:** Eine Testperson schrieb „Muesches mir denn mal erkläre. Chume no nid ganz drus“. Der Zweck muss auf dem ersten Bildschirm klar sein, die Schritte danach erklären sich, wenn sie anstehen.
- **Folgen:** Wirkung mit neuen Testpersonen prüfen (5-Sekunden-Test: „Was macht diese App?“). Ohne Beispiel hängt der erste Eindruck allein am Text.


## D-069 · Erstes Abhaken frischt Standort und Laden auf

- **Entscheidung:** Beim ersten Abhaken nach dem Öffnen einer Liste prüft die App still im Hintergrund nochmals Laden und Reiseland: die Ladensuche genau (Position höchstens 10 Sekunden alt, neue Suche ab 75 m Abstand, D-046), bei „Automatisch“ das Land mit einem höchstens 5 Minuten alten Ergebnis (sonst 30 Minuten, D-040). Das gilt auch, wenn der Einkauf schon beim Öffnen im Laden begonnen hat; höchstens eine genaue Ladenprüfung pro Minute.
- **Begründung:** Wunsch des Inhabers. Wer die Liste unterwegs öffnet und erst im Laden abhakt, soll den richtigen Laden und das richtige Land sehen, ohne etwas zu tippen.
- **Folgen:** Ohne Zustimmung zum Standort (D-066) passiert nichts. Ein Abhaken kann einen kurzen Standortzugriff auslösen.

## D-070 · Fusszeile am unteren Rand

- **Entscheidung:** „Über das Projekt“, „Datenschutz“ und die Version stehen auf der Startseite und beim ersten Start am unteren Bildschirmrand, auch wenn die Seite fast leer ist. Bei langen Seiten folgen sie wie bisher nach dem Inhalt.
- **Begründung:** Rückmeldung des Inhabers: Direkt unter „Noch keine Liste.“ wirkte die Fusszeile wie Inhalt und zog den Blick weg vom nächsten Schritt.
- **Folgen:** Keine.

## D-071 · Sprache beim ersten Start: Gerätesprache, sonst Englisch

- **Entscheidung:** Beim ersten Start schlägt die App die Sprache aus der Gerätesprache vor: Steht in einer der Gerätesprachen (`navigator.languages`) „de-CH“ oder „de-LI“ → Deutsch (Schweiz), „de-AT“ → Deutsch (Österreich). Sonst entscheidet bei Deutsch die Zeitzone des Geräts: Zürich oder Vaduz → Deutsch (Schweiz), Wien → Deutsch (Österreich), alles andere (auch „de-ES“) → Deutsch (Deutschland). Andere unterstützte Sprachen wie erkannt, alle übrigen → Englisch. Auch die Oberfläche vor dem Profil fällt auf Englisch zurück statt auf Deutsch. Die Auswahl lässt sich auf dem ersten Bildschirm ändern.
- **Begründung:** Wunsch des Inhabers: Standard-Deutsch ist Deutschland, international Englisch.
- **Folgen:** iPhones mit der Sprache „Deutsch“ melden oft nur „de-DE“, auch mit Region Schweiz; die Zeitzone fängt das zu Hause ab. Wer im Ausland zum ersten Mal startet und nur „de-DE“ meldet, bekommt Deutsch (Deutschland) und stellt einmal um. Die native App (D-009) kann die Gerätesprache ebenso auslesen und dieselbe Regel nutzen.

## D-072 · Laden wählen als Blatt

- **Entscheidung:** Im Kopf der Liste steht der Laden in einer Zeile: Symbol, Name (wird bei Platzmangel mit „…“ gekürzt), Distanz beim Vorschlag, ein kleiner Pfeil nach unten statt eines Stifts. Ohne Laden steht dort „Suche Laden …“ oder „Kein Supermarkt im Umkreis von 20 km“. Ein Tipp auf die ganze Zeile öffnet in jedem Zustand von unten das Blatt „Laden wählen“: der aktuelle Laden mit Häkchen, darunter bis zu 5 andere Läden als Zeilen mit Distanz, unten „Neu suchen“ und „Schliessen“. Ein Tipp auf einen Laden wählt ihn und schliesst das Blatt. Fehlermeldungen der Ladensuche mit Countdown und „jetzt“ stehen nur im Blatt (D-086); nur „Standort freigeben“ und „Hilfe“ bleiben in der Zeile, weil sie eine Handlung verlangen.
- **Begründung:** Rückmeldung des Inhabers mit Bildschirmfoto: Die Läden klappten als Knöpfe im Kopf auf, brachen um („276 / m“), der Stift stand allein auf einer Zeile, und die Liste rutschte weit nach unten.
- **Folgen:** Ein Tipp mehr zum Schliessen, dafür bleibt der Kopf der Liste immer gleich hoch. Gleiches Muster wie „Liste bearbeiten“ und „Teilen“.

## D-073 · Ganze Karte hakt ab, Menü „…“ für Zeigen-Karte und Rückmeldung

- **Entscheidung:** Ein Tipp irgendwo auf eine Artikelkarte hakt den Artikel ab bzw. öffnet ihn wieder, auch auf Name und Übersetzung. Ausgenommen sind die Knöpfe auf der Karte (📷, ✋, …, ✕), Fotos und Tipp sowie Eingabefelder. Der Kreis bleibt als Anzeige und eigener Knopf. Die Übersetzung ist kein eigener Knopf mehr. Hinter dem Knopf „…“ (alle offenen Artikel) liegt ein kleines Menü mit „Dem Personal zeigen“ (Zeigen-Karte, D-032, nur mit Übersetzung), „Begriff stimmt nicht?“ (D-059, nur mit Übersetzung und Supabase und nicht zu Hause, D-095) und „Löschen“ (D-085). Der Kamera-Knopf für Produktfotos (D-010) bleibt direkt auf der Karte, weil man ihn oft braucht und das Symbol zeigt, dass es Bilder gibt.
- **Begründung:** Wunsch des Inhabers. Eine grosse Tippfläche hilft im Laden mit einer Hand; Zeigen-Karte und Fotos braucht man seltener.
- **Folgen:** Abhaken aus Versehen ist leichter möglich, aber harmlos: Der Artikel rutscht nach „Im Wagen“ und ein Tipp holt ihn zurück. Text auf der Karte lässt sich nicht mehr markieren.

## D-074 · Knöpfe am Artikel ohne Rahmen, mittig

- **Entscheidung:** Die Knöpfe einer Artikelkarte (📷, ✋, …, ✕) haben keinen Rahmen mehr, nur ruhige graue Symbole mit gleich grosser Tippfläche (38 px); ein aktiver Knopf ist petrolfarben hinterlegt. Kreis und Knöpfe stehen senkrecht mittig neben Name und Übersetzung. Aufbau der Karte: Kreis | Name, darunter Übersetzung und Person | Knöpfe; Fotos und Hinweise darunter über die ganze Breite.
- **Begründung:** Wahl des Inhabers (Variante C aus fünf). Seit die ganze Karte abhakt (D-073), müssen die Knöpfe nicht mehr auffallen; Rahmen wirkten schwer und unruhig.
- **Folgen:** Die Zeile mit Übersetzung und Person nutzt nicht mehr die ganze Breite, sondern endet links der Knöpfe; lange Begriffe brechen früher um.

## D-075 · Ladensuche nur im Reiseland

- **Entscheidung:** Die App sucht Läden nur, wenn man sich im Reiseland der Liste befindet. Vor jeder automatischen Suche prüft sie das aktuelle Land (Nominatim, Ergebnis höchstens 30 Minuten alt, D-040); verglichen wird das Land ohne Region (Schweiz = Schweiz, egal ob Deutschschweiz oder Romandie). Ist man woanders oder in einem nicht unterstützten Land, gibt es keine Suche und keine Ladenzeile, und Produktfotos nutzen keinen Laden. Ein von Hand gewählter Laden bleibt sichtbar, bis man sich davon entfernt (D-033). Lässt sich das Land nicht bestimmen (kein Standort, Dienst nicht erreichbar), verhält sich die App wie bisher.
- **Begründung:** Wunsch des Inhabers. Wer zu Hause eine Liste für die Ferien vorbereitet, braucht keinen Laden um die Ecke.
- **Folgen:** Eine zusätzliche Abfrage bei Nominatim, höchstens alle 30 Minuten. Laden und Vorschlag sind wie bisher pro Gerät, nicht für alle Mitglieder gleich (D-033).

## D-076 · Listenname im Seitentitel und beim Teilen

- **Entscheidung:** In einer Liste heisst die Seite „<Listenname> · Cart on the Road“ (Tab, Lesezeichen, Verlauf), auf der Startseite „Cart on the Road“. Beim Teilen über das Teilen-Menü des Handys geht zusätzlich der Text „Einkaufsliste „<Listenname>““ mit, zum Link.
- **Begründung:** Wunsch des Inhabers: Beim Teilen soll der Listenname sichtbar sein.
- **Folgen:** Die Link-Vorschau in Nachrichten-Apps (Bild und Titel unter dem Link) zeigt weiterhin „Cart on the Road“: Die Vorschau liest die Seite ohne den Teil nach „#“, und GitHub Pages liefert für alle Listen dieselbe Datei. Eine eigene Vorschau pro Liste bräuchte einen Server, der den Listennamen öffentlich ausliefert.

## D-077 · Testversion: Logo mit durchsichtiger Strasse in App und Tab

- **Entscheidung:** Provisorisch zum Testen zeigen das Logo neben dem App-Namen (Startseite, erster Start, Profil) und das Symbol im Browser-Tab eine Version, bei der die Strasse durchsichtig ist (`public/logo-transparent.svg`): Sie nimmt die Farbe der Seite an. Die Symbole für den Home-Bildschirm (apple-touch-icon, icon-192/512, maskable, Manifest) bleiben unverändert aus `public/favicon.svg` mit dunkler Strasse (D-026).
- **Begründung:** Wunsch des Inhabers, eine leichtere Wirkung zu testen. Auf dem Home-Bildschirm brächte es nichts: iOS füllt durchsichtige Stellen schwarz, Android meist weiss oder farbig.
- **Folgen:** Auf hellem Hintergrund wird die Strasse weiss und das Logo wirkt zweigeteilt; bei 30 px ist die Lücke klein. Nach dem Test entscheiden: behalten oder `logo-transparent.svg` wieder durch `favicon.svg` ersetzen (`index.html`, `src/ui/AppLogo.tsx`).

## D-078 · „Im <Laden>“ während des Einkaufs

- **Entscheidung:** Während des Einkaufs steht in der Ladenzeile „Im <Laden>“ (englisch „At <shop>“, „Im“ in Grau) statt der Meterangabe, und das Laden-Symbol erscheint in der Akzentfarbe. Der Einkauf beginnt mit dem ersten Abhaken auf diesem Gerät oder beim Öffnen der Liste direkt im Supermarkt (D-020) und gilt bis 30 Minuten nach dem letzten Abhaken. Zusätzlich muss der Laden innerhalb von 50 m oder innerhalb der GPS-Ungenauigkeit (höchstens 100 m) vom letzten Standort dieser Sitzung liegen (`looksInside`); wer sich entfernt, sieht wieder die Entfernung. Das gilt auch für einen von Hand gewählten Laden. In der Ladenauswahl bleiben die Meter.
- **Begründung:** „Im …“ soll heissen „du kaufst gerade hier ein“, nicht „du stehst in der Nähe“ (Wunsch des Inhabers). Eine feste Grenze von 20 m griffe im Gebäude kaum, weil GPS dort oft 50–100 m ungenau ist und der Ladenpunkt in OpenStreetMap oft in der Gebäudemitte liegt. Die Erkennung „Einkauf beginnt“ (D-020) bleibt streng (50 m, GPS auf 60 m genau), weil sie sonst einen Einkauf im falschen Laden erfassen könnte.
- **Folgen:** Vor dem ersten Abhaken steht immer die Entfernung, auch im Laden. Abhaken durch andere Mitglieder zählt nicht. Die Anzeige folgt der regelmässigen Prüfung (D-080).

## D-079 · Auffindbarkeit und Vorschau beim Teilen

- **Entscheidung:** `index.html` hat eine Kurzbeschreibung und Open-Graph-Angaben mit einem Vorschaubild (`public/og-image.png`, 1200 × 630, Logo, Schriftzug, Satz zum Nutzen und Beispiel „Milch → leche · lait · latte“). Die App selbst ist für Suchmaschinen ausgeblendet (`noindex`); in den Suchergebnissen sollen die festen Seiten erscheinen (D-090, D-091). Dazu `robots.txt` (alles erlaubt) und `sitemap.xml` mit den festen Seiten, ihren Sprachangaben und dem Datum der letzten Änderung. Texte der App-Vorschau auf Deutsch, passend zur Zielgruppe in der Schweiz.
- **Begründung:** Listen werden als Link per Messenger geteilt. Eine Vorschau mit Bild wirkt bei einer Einladung vertrauenswürdiger. Unter der Hauptadresse sieht Google nur das Startformular („Dein Name“), das ist kein gutes Suchergebnis.
- **Folgen:** Alle Listen-Links zeigen dieselbe Vorschau. Der Listenname steht hinter dem # und ist für Messenger und Suchmaschinen unsichtbar, die Listen bleiben dadurch auch privat. Das Vorschaubild ist eine feste Datei: Ändern sich Logo oder Schriftzug, muss es neu erstellt werden. Kein Google-Code in der App; die Anmeldung bei der Google Search Console macht der Inhaber über einen TXT-Eintrag im DNS.

## D-080 · Laden regelmässig still prüfen

- **Entscheidung:** Solange eine Liste offen und sichtbar ist, prüft die App höchstens alle 2 Minuten still den Standort: mit gewähltem Laden, ob man noch dort ist, sonst den Vorschlag. Dazu wie bisher beim Öffnen, beim Zurückkehren in die App und beim Beginn des Einkaufs.
- **Begründung:** Bisher wurde nur bei diesen Ereignissen geprüft. Wer die App offen lässt und in einen anderen Laden geht, sah den alten Laden, und die Anzeige „Im <Laden>“ (D-078) wurde nicht nachgeführt.
- **Folgen:** Ohne Ortswechsel nutzt die Prüfung das letzte Ergebnis, es gibt also keine zusätzliche Anfrage an OpenStreetMap. Etwas mehr Akku für die Standortabfrage, nur solange die Liste offen ist.

## D-081 · Im eigenen Sprachraum keine Übersetzung

- **Entscheidung:** Zu Hause (gleiche Sprache und gleiche Länder-Abweichung wie im Profil, z. B. Deutsch (Schweiz) in einer Schweizer Liste) zeigt ein Artikel nie eine Zeile mit Flagge und Landesbegriff, nur gegebenenfalls den Namen der Person: Mundart wie „Herdöpfel“ ist dort schon richtig, und ein erkanntes Teilwort („Verpackte Äpfel“ → „Äpfel“) bringt nichts. Auf Reisen entfällt die Zeile, wenn der Landesbegriff gleich lautet wie der eigene Begriff; weicht er ab (z. B. „Sahne“ statt „Rahm“ in Deutschland), bleibt sie. „Keine Übersetzung“ erscheint nur, wenn die Sprache des Reiselands eine andere ist. Der Untertitel der Liste zeigt Land und Sprache ohne Doppelung („🇨🇭 Schweiz – Deutsch“, D-088); zu Hause entfällt er ganz (Wunsch des Inhabers).
- **Begründung:** Wunsch des Inhabers. Im eigenen Land wiederholte die Zeile nur den Namen, und der Untertitel nannte die Sprache doppelt. Gleiches gilt für die Suchvorschläge beim Eintippen: „Milch → leche“, aber nicht „Milch → Milch“.
- **Folgen:** Wer im eigenen Land eine Liste führt, sieht nur die eigenen Begriffe; die Zeigen-Karte im Menü „…“ bleibt verfügbar.

## D-082 · Namen bei Artikeln nur mit mehreren Personen

- **Entscheidung:** Unter einem Artikel steht der Name der Person, die ihn geschrieben hat, nur, wenn mehrere Personen beteiligt sind (und die Namen in den Listen-Einstellungen nicht ausgeschaltet sind, D-097): laut Server mindestens zwei Mitglieder, oder in der Liste haben verschiedene Personen geschrieben. Allein steht unter dem Artikel nur der Landesbegriff. Bleibt gar keine Zeile übrig (allein und im eigenen Sprachraum, D-081), steht der Name mittig in der Karte.
- **Begründung:** Allein wiederholt sich der eigene Name unter jedem Artikel. Gleiche Regel wie bei „Ich hole das“ (D-065).
- **Folgen:** Tritt eine zweite Person bei, erscheinen die Namen beim nächsten Öffnen der Liste, spätestens wenn sie etwas schreibt.

## D-083 · Startbildschirm beim Laden

- **Entscheidung:** Bis die App geladen ist, zeigt die Seite das Logo mittig auf dem Hintergrund (hell oder dunkel nach Gerät). Es erscheint erst nach 0,3 s, damit es bei schnellem Laden nicht aufblitzt. Kein Ladebalken.
- **Begründung:** Beim ersten Aufruf auf langsamem Netz war die Seite einige Sekunden leer. Einen echten Fortschritt kann der Browser nicht zuverlässig messen, ein Balken würde raten.
- **Folgen:** Reines HTML und CSS in `index.html`, React ersetzt es beim Start. Ab dem zweiten Aufruf lädt die App aus dem Speicher und der Startbildschirm ist kaum zu sehen.

## D-084 · Mitglieder entfernen

- **Entscheidung:** Im Blatt „Mitglieder“ hat jede andere Person einen Knopf zum Entfernen, mit Nachfrage („Anna aus der Liste entfernen? Mit dem Link kann Anna auf einem neuen Gerät wieder beitreten.“). Jedes Mitglied darf andere entfernen, sich selbst nicht (dafür gibt es „Liste verlassen“). Eine Person ist wie in der Mitgliederliste Name + Sprache; alle ihre Geräte werden entfernt. Die Datenbank merkt sich die entfernten Geräte (`list_removed`), `join_list` lässt sie nicht wieder beitreten. Öffnet eine entfernte Person die Liste, erscheint „Du wurdest aus dieser Liste entfernt. Änderungen werden nicht mehr abgeglichen.“ mit „Aus meinen Listen entfernen“.
- **Begründung:** Wunsch des Inhabers, z. B. für alte Geräte, doppelte Profile oder Personen, die nicht mehr mitreisen.
- **Folgen:** Kein echter Schutz gegen Personen mit dem Link: Auf einem neuen Gerät oder nach dem Löschen der Browserdaten können sie wieder beitreten, weil die Liste nur über ihren Link geschützt ist. Das sagt die Nachfrage offen. Ein neuer Link pro Liste wäre ein eigener Ausbau. Neue Datenbankfunktionen `remove_member` und `was_removed`; das Skript `supabase/schema.sql` muss einmal ausgeführt werden. Datenschutzerklärung ergänzt.

## D-085 · Offene Artikel über das Menü „…“ löschen

- **Entscheidung:** Jeder offene Artikel hat das Menü „…“, auch ohne Übersetzung. Darin steht zuunterst „Löschen“ in Rot. Abgehakte Artikel behalten das ✕ direkt auf der Karte. Nach dem Löschen erscheint wie bisher „Rückgängig“ (D-042).
- **Begründung:** Wunsch des Inhabers. Bisher musste man einen offenen Artikel erst abhaken, um ihn zu löschen, das war umständlich und verfälschte den Einkauf.
- **Folgen:** Das versehentliche Löschen bleibt unwahrscheinlich, weil es zwei Tipps braucht und rückgängig gemacht werden kann.

## D-086 · Ladensuche: Fehler im Blatt, am Anfang häufiger neu versuchen

- **Entscheidung:** Ist OpenStreetMap nicht erreichbar oder ausgelastet, steht in der Ladenzeile „Suche Laden …“. Die Fehlermeldung mit Countdown und „jetzt“ steht nur im Blatt „Laden wählen“, das ein Tipp auf die Zeile öffnet. Neue Versuche nach 5, 10, 20 und 30 s, nach 1 und 2 Minuten, dann alle 5 Minuten. Der Stift in der Ladenzeile ist durch einen kleinen Pfeil ersetzt.
- **Begründung:** Wunsch des Inhabers. Die lange Fehlermeldung verdrängte den Kopf der Liste, und ausgelastete Server sind oft nach wenigen Sekunden wieder frei.
- **Folgen:** In den ersten 30 Sekunden bis zu vier Versuche, verteilt auf zwei Overpass-Server. Danach so sparsam wie bisher.

## D-087 · Reiseland: Ergebnis nur am gleichen Ort wiederverwenden, Vorschlag auch zu Hause

- **Entscheidung:** Das erkannte Land wird zusammen mit der Stelle gespeichert. Die App verwendet es wieder, solange man weniger als 10 km davon entfernt ist und es höchstens 24 Stunden alt ist; sonst fragt sie Nominatim neu. Ohne Standort gilt wie bisher das letzte Ergebnis (bis 6 Stunden). Beim Anlegen einer Liste zeigt „Automatisch“ das erkannte Land auch im eigenen Sprachraum, z. B. „Automatisch (🇨🇭 Schweiz – Deutsch)“ zu Hause.
- **Begründung:** Rückmeldung des Inhabers: Nach der Rückreise aus Spanien wurde immer Spanien gewählt. Das Land war bis 6 Stunden gespeichert, ohne Rücksicht auf den Ort, und im eigenen Sprachraum gab es keinen Vorschlag, sodass Spanien als Standard stehen blieb.
- **Folgen:** Eine zu Hause angelegte Liste mit „Automatisch“ zeigt zuerst keine Übersetzung (D-081) und wechselt am Reiseziel ins fremde Land (D-040). Nach einem Ortswechsel von mehr als 10 km eine Anfrage mehr an Nominatim.

## D-088 · Reiseland als „Land – Sprache“

- **Entscheidung:** Das Reiseland erscheint überall als Flagge, Land und Sprache, die Sprache in der Sprache der Oberfläche: „🇪🇸 Spanien – Spanisch“, „🇬🇷 Griechenland – Griechisch“, „🇹🇼 Taiwan – Chinesisch (traditionell)“. Bei Regionen sagt die Sprache, welche gemeint ist, der Regionsname fällt weg: „🇨🇭 Schweiz – Deutsch“, „🇨🇭 Schweiz – Französisch“, „🇧🇪 Belgien – Niederländisch“. So in der Länderauswahl (alphabetisch nach diesem Text), bei „Automatisch (🇨🇭 Schweiz – Deutsch)“, im Untertitel der Liste und in der Meldung zum Länderwechsel. Der Platzhalter für den Listennamen nennt nur das Land („z. B. Einkaufsliste Schweiz“).
- **Begründung:** Rückmeldung des Inhabers mit Bildschirmfoto: „Schweiz (Deutschschweiz) – Deutsch“ war doppelt, und Sprachnamen in der Landessprache („Ελληνικά“, „繁體中文“) sind nicht für alle lesbar. Die Sprache ist das, worum es in der App geht; „Schweiz – Französisch“ ist klarer als „Romandie“.
- **Folgen:** Bei den meisten Ländern wirkt die Sprache selbstverständlich und die Zeilen werden etwas länger. Ein eigenes Auswahlblatt mit Suche wäre schöner, lohnt sich aber erst mit deutlich mehr Ländern. Die Regionsnamen („Deutschschweiz“) bleiben nur noch intern für die Länderwahl im Code.

## D-089 · Teilen: Knopf „Kopieren“ neben dem Link

- **Entscheidung:** Im Blatt „Liste teilen“ steht neben dem Link ein Knopf „Kopieren“. Er kopiert den Link und zeigt 2 Sekunden lang „Kopiert ✓“. „Link teilen“ öffnet wie bisher das Teilen-Menü des Geräts.
- **Begründung:** Wunsch des Inhabers. Bisher kopierte „Link teilen“ nur auf Geräten ohne Teilen-Menü; auf dem Handy gab es keinen direkten Weg, den Link zu kopieren, z. B. für eine E-Mail.
- **Folgen:** Erlaubt der Browser die Zwischenablage nicht, passiert beim Tipp nichts; der Link steht weiterhin im Feld zum Markieren.

## D-090 · Startseiten auf Deutsch und Englisch

- **Entscheidung:** Unter cartontheroad.app/de/ und /en/ gibt es je eine feste Startseite ohne JavaScript: Überschrift „Die Einkaufsliste für die Reise“, der Satz mit „Milch“ und „leche“, Knopf „App öffnen“ (führt zu cartontheroad.app), drei Screenshots aus der echten App (Eintippen mit Vorschlägen, Liste im Laden, „Dem Personal zeigen“), dann kurz Teilen, Reiseziele und „ohne Werbung und Tracking“, unten Datenschutz und Kontakt. Hell und dunkel nach Gerät. Für Google mit Sprachangaben (hreflang, Englisch als Standard) und in der Sitemap. Die App unter der Hauptadresse bleibt unverändert; der Service Worker speichert die Startseiten nicht und ersetzt weder sie noch Dateien mit Endung (`sitemap.xml`, `robots.txt`) durch die App.
- **Begründung:** Für den Test mit Nutzern (F-012): Die erste Testperson verstand die App ohne Erklärung nicht. Eine Startseite erklärt in wenigen Sekunden, was die App macht, und prüft dabei die Botschaft für spätere Store-Einträge. Weitere Sprachen erst zusammen mit der Oberfläche in dieser Sprache.
- **Folgen:** Testpersonen bekommen am besten den Link cartontheroad.app/de/ bzw. /en/. Die Screenshots (`public/landing/`) sind feste Bilder und müssen bei grösseren Änderungen der Oberfläche neu erstellt werden; sie zeigen nachgestellte Daten (Liste „Barcelona“ im Mercadona). Texte nach dem Test überarbeiten.

## D-091 · Feste Seiten für Datenschutz und „Über das Projekt“

- **Entscheidung:** Neben den Startseiten gibt es feste Seiten ohne JavaScript im gleichen Stil: `/datenschutz/` und `/privacy/` mit derselben Datenschutzerklärung wie in der App, `/ueber/` und `/about/` mit „Über das Projekt“: wer dahintersteht (Tobias Minder, Schweiz), wie die Idee entstand (Entwurf von Claude, vom Inhaber anzupassen), was die App ist (gratis, ohne Werbung und Tracking, ohne Konto, Wörterbuch von Hand, Testphase) und dass Rückmeldungen nur über „Begriff stimmt nicht?“ in der App gehen; persönlichen Support gibt es nicht, die E-Mail-Adresse steht nur im Datenschutz. Die Seiten entstehen beim Build aus `src/staticPages.ts`; die Datenschutztexte kommen aus `src/privacyText.ts`, derselben Quelle wie die Seite in der App. Alle festen Seiten haben dieselbe Fusszeile (Über das Projekt, Datenschutz) und einen Sprachwechsel. Die Fusszeile der App verlinkt zusätzlich „Über das Projekt“. Kein Impressum mit Postadresse.
- **Begründung:** Wunsch des Inhabers: Glaubwürdigkeit auch für ein nicht kommerzielles Projekt. Eine Seite mit Person und Geschichte schafft Vertrauen, ohne die Wohnadresse zu veröffentlichen. Die Datenschutzerklärung braucht eine normale Adresse, die ohne JavaScript lesbar ist und die Google und später die App-Stores finden.
- **Folgen:** Bei kommerziellem Betrieb (F-003) kommt ein vollständiges Impressum mit Geschäftsadresse dazu. Die App-Version des Datenschutzes bleibt für den Offline-Gebrauch. Der Service Worker liefert die festen Seiten immer vom Server.

## D-092 · Zeigen-Karte: Umschrift und Vorlesen

- **Entscheidung:** Die Zeigen-Karte („Dem Personal zeigen“) zeigt bei fremden Schriften unter dem Begriff eine Umschrift: Griechisch nach der Aussprache mit Betonung („γιαούρτι“ → „yaúrti“, Regeln in `src/lib/romanize.ts`), Chinesisch als Pinyin mit Tonzeichen („鮮奶“ → „xiān nǎi“). Das Pinyin wird einmalig mit `npm run dict:pinyin` aus `zh.json` erzeugt (`src/data/zh-pinyin.json`, Bibliothek pinyin-pro nur beim Erzeugen); ein Test meldet fehlende Einträge. Darunter ein Knopf „Vorlesen“: Die Sprachausgabe des Geräts spricht den Begriff etwas langsamer in der Landessprache. Der Knopf erscheint nur, wenn das Gerät eine Stimme für diese Sprache hat. Keine Lautschrift (IPA).
- **Begründung:** Idee des Inhabers „Phonetische Schrift“. IPA können die wenigsten lesen, eine eigene Lautschrift pro Begriff und Sprache wäre kaum zu pflegen. Vorlesen hilft beim Nachsprechen in allen Sprachen, ohne externen Dienst und ohne Kosten; die Umschrift macht Griechisch und Chinesisch überhaupt lesbar.
- **Folgen:** Welche Stimmen es gibt, hängt vom Gerät ab (iPhone und Android haben meist alle Sprachen der App). Eigene Landesbegriffe aus dem Community-Modul (D-027) haben bei Chinesisch keine Umschrift. Die griechischen Regeln sind vereinfacht (z. B. „δ“ als „d“). Vorlesen gibt es nur auf der Zeigen-Karte, nicht als eigenen Punkt im Menü „…“: wenig Zusatznutzen, und das Menü soll kurz bleiben. Im Test mit Nutzern beobachten, ob und wie Vorlesen genutzt wird.

## D-093 · Währung umrechnen

- **Entscheidung:** Im Menü der Liste gibt es „Umrechnen“, wenn die Währung des Reiselands nicht die eigene ist. Ein Blatt rechnet einen Betrag von der Landeswährung in die eigene Währung um („10 EUR ≈ CHF 9.40“), mit Knopf zum Tauschen der Richtung. Die eigene Währung ergibt sich aus dem Profil (Deutsch (Schweiz) → CHF) bzw. der Gerätesprache, sonst EUR, und lässt sich im Blatt ändern (auf dem Gerät gespeichert). Kurse von Frankfurter (api.frankfurter.dev, Referenzkurse u. a. der EZB, gratis, ohne Schlüssel), 12 Stunden auf dem Gerät gespeichert; ohne Netz gilt der letzte Kurs mit Datum. Hinweis: „Im Laden kann der Kurs der Karte leicht abweichen.“ Typische Produktpreise gibt es nicht (Idee verworfen: Open Prices hat für die meisten Länder zu wenige Daten).
- **Begründung:** Idee des Inhabers. Im Laden will man schnell wissen, was etwas in der eigenen Währung kostet.
- **Folgen:** Neuer externer Dienst, in der Datenschutzerklärung und der Content-Security-Policy eingetragen; übertragen werden nur die Währungscodes und die IP-Adresse, nur wenn man „Umrechnen“ öffnet.

## D-094 · Wiederholte Versuche: Countdown nach der Uhr, Zeitlimit pro Anfrage

- **Entscheidung:** Der Countdown bis zum nächsten automatischen Versuch (Fotos von Open Food Facts, Ladensuche) rechnet mit dem Zeitpunkt des Versuchs statt Sekunde für Sekunde herunterzuzählen (`src/ui/useCountdown.ts`). Er stimmt auch, wenn das Handy Zeitgeber im Hintergrund bremst, und der Versuch startet spätestens beim Zurückkehren in die App. Jede Anfrage an Open Food Facts hat ein Zeitlimit von 15 s, an Overpass von 35 s. Liefert Open Food Facts statt JSON eine Fehlerseite, gilt das als „nicht erreichbar“ mit neuem Versuch. Fotos warten länger als die Ladensuche: 15 s, 30 s, 1, 2, dann alle 5 Minuten.
- **Begründung:** Rückmeldung des Inhabers: Bei „Open Food Facts nicht erreichbar“ lief der Zähler nicht immer. Ursachen: Zeitgeber, die das Handy im Hintergrund anhält; Anfragen ohne Zeitlimit, die hängen bleiben und alle weiteren blockieren (Foto-Anfragen laufen nacheinander); und die Wartezeit aus der Ladensuche (ab 5 s, D-086), die bei Open Food Facts mit wenigen erlaubten Suchen pro Minute zu früh wiederholte.
- **Folgen:** Getestet mit nachgebildeter Uhr; das Verhalten im Hintergrund auf dem Handy nur indirekt.

## D-095 · Tipp im Fotobereich, Tipp und Rückmeldung nur auf Reisen

- **Entscheidung:** Der Tipp zu einem Artikel (z. B. H-Milch im Regal) hat keinen eigenen Knopf mehr. Er steht über den Fotos im selben Bereich, den der Kamera-Knopf öffnet. Gibt es keine Fotos (kein Laden, lose Ware), zeigt derselbe Knopf eine Glühbirne und öffnet nur den Tipp. Tipp und „Begriff stimmt nicht?“ erscheinen nur auf Reisen, nicht zu Hause (gleiche Sprache und Länder-Abweichung wie im Profil, wie D-081).
- **Begründung:** Wunsch des Inhabers. Weniger Knöpfe pro Artikel; Tipps und Übersetzungsfehler betreffen das Reiseland.
- **Folgen:** Wer den Tipp sucht, findet ihn hinter der Kamera, wenn es Fotos gibt.

## D-096 · Vorschläge zeigen das passende Wort; Passata und Sammelbegriffe

- **Entscheidung:** Ein Vorschlag zeigt das Wort, auf das die Eingabe passt, nicht immer den ersten Namen des Artikels („Obs“ → „Obst → fruta“ statt „Früchte“). Gewählt wird es auch so in die Liste übernommen. Hat die Länder-Abweichung im Profil ein eigenes Wort (Rahm statt Sahne), gilt weiterhin dieses. Ein Artikel mit dem gleichen Wort ersetzt den eingegebenen Text nur noch, wenn die Länder-Abweichung ein eigenes Wort hat. Neu im Wörterbuch: Passata als eigener Artikel (getrennt von Tomatensauce, Spanien „tomate tamizado“, Fotos aus `en:strained-tomatoes`) sowie die Sammelbegriffe Gemüse, Früchte/Obst, Fleisch, Getränke, Süssigkeiten, Snacks und Gewürze, je in allen 11 Sprachen.
- **Begründung:** Rückmeldung des Inhabers: Bei „Passata“ kam der Vorschlag „Tomatensauce“, und in der Liste stand danach „Tomatensauce“. Passata (passierte Tomaten) ist zudem ein anderes Produkt als Tomatensauce. Sammelbegriffe stehen oft auf Einkaufszetteln.
- **Folgen:** Die neuen Begriffe sind von Claude übersetzt, nicht von Muttersprachlern geprüft; Vietnamesisch und Chinesisch sind am unsichersten (S-001). Rückmeldungen über „Begriff stimmt nicht?“ fliessen in die Auswertung (D-059).

## D-097 · Namen bei Artikeln ausschaltbar

- **Entscheidung:** In den Listen-Einstellungen gibt es „Namen bei Artikeln zeigen“ (Standard: an). Die Einstellung gilt pro Liste und nur auf diesem Gerät.
- **Begründung:** Wunsch des Inhabers. Wer die Namen nicht braucht, hat eine ruhigere Liste; andere Mitglieder entscheiden für sich selbst.
- **Folgen:** Ein neues Gerät zeigt die Namen wieder, bis man sie dort ausschaltet.

## D-098 · Merkmale wie „gefroren“ und eigene Tiefkühl-Begriffe

- **Entscheidung:** Häufige Tiefkühl-Artikel sind eigene Begriffe, korrekt übersetzt: neu Tiefkühlspinat, Tiefkühlfisch und tiefgekühlte Garnelen (Schweiz: Crevetten), dazu Varianten wie „gefrorene Beeren“, „gefrorenes Gemüse“, „gefrorene Pizza“ bei den bestehenden (tiefgekühlte Beeren, Tiefkühlgemüse, Tiefkühlpizza, Pommes, Fischstäbchen, Glace). Auf Deutsch heissen sie „Spinat (tiefgekühlt)“, „Beeren (tiefgekühlt)“, „Gemüse (tiefgekühlt)“, „Fisch (tiefgekühlt)“, „Garnelen (tiefgekühlt)“ bzw. in der Schweiz „Crevetten (tiefgekühlt)“ und „Pizza (tiefgekühlt)“: Das Produkt steht vorne, „tiefgekühlt“ ist das Wort des Handels, die Abkürzung „TK“ ist in der Schweiz nicht gängig. Gleich auf Niederländisch („spinazie (diepvries)“). In den anderen Sprachen bleibt die übliche Form, dort steht das Produkt meist ohnehin vorne („espinacas congeladas“) oder die Form ist fest („frozen spinach“, „冷凍菠菜“). „Tiefkühlspinat“, „gefrorener Spinat“ und „TK-Spinat“ werden bei der Eingabe weiterhin erkannt. Gibt es keinen eigenen Begriff, erkennt die App Merkmale im eingegebenen Text (gefroren/tiefgekühlt/TK, Bio, laktosefrei, glutenfrei, vegan) und zeigt sie als kleine Marke neben dem Landesbegriff in der Grundform: „gefrorene Himbeeren“ → „frambuesas“ + „❄️ congelado“. Auf der Zeigen-Karte steht das Merkmal unter dem Begriff. Artikel mit „gefroren“ stehen in der Abteilung Tiefkühl. Ein Bindestrich trennt nun auch Wörter beim Erkennen („Bio-Joghurt“ → Joghurt).
- **Begründung:** Frage des Inhabers zu „gefrorene Himbeeren“. Ein angehängtes Wort wäre in vielen Sprachen grammatisch falsch (frambuesas congeladas, pan congelado); als getrennte Marke ist die Grundform verständlich, und das Personal sieht das Merkmal.
- **Folgen:** Die Merkmal-Wörter sind von Claude übersetzt (S-001). Merkmale werden nur erkannt, wenn der Artikel selbst bekannt ist. „Bio“ wird am Wortanfang erkannt; seltene Fehltreffer sind möglich.

## D-099 · Öffnungszeiten der Läden

- **Entscheidung:** Läden zeigen ihre Öffnungszeiten aus OpenStreetMap (Tag `opening_hours`, wird bei der Ladensuche schon mitgeliefert, keine zusätzliche Anfrage). In der Ladenzeile nur, wenn der Laden geschlossen ist: Name und Symbol grau, dahinter „· geschlossen“ (D-101); in der Ladenauswahl unter jedem Laden „offen bis 21:30“ bzw. „geschlossen · öffnet Mo. 09:00“, dazu der Hinweis „Öffnungszeiten laut OpenStreetMap, ohne Gewähr. Feiertage sind nicht berücksichtigt.“ Als Vorschlag (ohne gewählten Laden) zeigt die App den nächsten Laden, der nicht geschlossen ist; unbekannte Zeiten zählen als offen, sind alle zu, gilt der nächste. Steht man in einem Laden, gilt dieser (Wunsch des Inhabers). Ausgewertet wird der häufige Teil des Formats (Wochentage, mehrere Zeiten pro Tag, über Mitternacht, „off“, „24/7“) mit eigenem kleinem Code (`src/lib/openingHours.ts`); unbekannte Formate (Monate, Daten, Sonnenaufgang …) zeigen nichts.
- **Begründung:** Wunsch des Inhabers. Ladenzeiten sind je Land sehr verschieden (Sonntag, Mittagspause, Feiertage), ein vergeblicher Weg ist auf Reisen ärgerlich. Die vollständige Bibliothek für das Format wäre gross; der häufige Teil deckt die meisten Supermärkte ab.
- **Folgen:** Läden ohne eingetragene Zeiten zeigen nichts. Feiertage („PH“) werden übergangen, an Feiertagen kann „offen“ falsch sein. Gespeicherte Suchergebnisse älterer Versionen (ohne Zeiten) werden verworfen, damit nach dem Update neu gesucht wird.

## D-100 · Kleine Läden einer Kette wie Supermärkte behandeln

- **Entscheidung:** Kleine Läden (`shop=convenience`), die in OpenStreetMap eine Marke haben (`brand`), zählen wie Supermärkte: Sie werden auch weiter weg vorgeschlagen (Suche in Stufen bis 20 km), stehen bei der Auswahl vorne und gelten für „Einkauf beginnt“ (D-020). Beispiele: Denner Express, Coop Pronto, Migrolino, Spar Express, Carrefour Express. Kleine Läden ohne Marke (Kioske, Tankstellenshops) erscheinen weiterhin nur, wenn man praktisch davorsteht.
- **Begründung:** Rückmeldung des Inhabers: Ein Denner Express in der Nähe wurde nicht gefunden, obwohl er in OpenStreetMap eingetragen ist. Solche Läden sind meist als `convenience` eingetragen, die Suche ausserhalb des Ladens kannte aber nur `supermarket`.
- **Folgen:** Etwas grössere Antworten von Overpass. Ketten-Kioske mit Marke (z. B. k kiosk) erscheinen nun auch als Vorschlag; bei Bedarf eine Ausschlussliste ergänzen.

## D-101 · Ladenauswahl mit Strasse und Karten-Link, geschlossen dezent

- **Entscheidung:** In der Ladenauswahl steht unter jedem Laden die Strasse mit Hausnummer aus OpenStreetMap (`addr:street`, `addr:housenumber`) und die Öffnungszeit, z. B. „Bahnhofstrasse 12 · geschlossen · öffnet Mo 08:00“. Rechts in jeder Zeile öffnet ein Karten-Symbol die Karten-App: auf dem iPhone beim ersten Mal mit der Frage „Mit welcher Karten-App öffnen?“ (Apple Karten über `maps:`, Google Maps über `comgooglemaps:`, OpenStreetMap im Browser; die Wahl wird auf dem Gerät gespeichert; unten in der Ladenauswahl öffnet „Karten-App: Google Maps. Ändern“ direkt die Auswahl mit Häkchen bei der aktuellen App; eine Webseite kann nicht prüfen, welche App installiert ist, und Apple Karten kann gelöscht sein; ein https-Link zu maps.apple.com blieb in der Home-Bildschirm-App im eingebauten Browser hängen), auf Android die Auswahl der Karten-Apps (`geo:`), sonst OpenStreetMap in einem neuen Tab. Antippen der Zeile wählt weiterhin den Laden. Ein geschlossener Laden erscheint in der Ladenzeile und in der Auswahl grau statt in Warnfarbe; beim gewählten Laden zeigen ein Häkchen direkt nach dem Namen und der fette Name die Wahl, rechts steht wie bei allen die Distanz, Strasse und Zeiten bleiben grau (Grün hätte „offen“ suggeriert); die Ladenzeile zeigt bei offenen Läden keine Zeiten, damit der Name Platz hat.
- **Begründung:** Wunsch des Inhabers: Ohne Strasse stand mehrmals „Coop“; wer einen anderen Laden wählt, will oft hingehen; ein geschlossener Laden soll nicht wie ein Fehler wirken. Ein durchgestrichenes Laden-Symbol wurde verworfen, weil es wie „kein Laden gefunden“ wirkt.
- **Folgen:** Viele Läden haben in OpenStreetMap keine eigene Adresse (in der Schweiz oft am Gebäude oder als eigener Adresspunkt). Dann sucht die App beim Öffnen der Ladenauswahl in einer einzigen zusätzlichen Overpass-Anfrage die nächste Adresse im Umkreis von 40 m für die angezeigten Läden (höchstens 8) und speichert das Ergebnis auf dem Gerät, auch „keine gefunden“. Ohne Treffer stehen nur die Zeiten. Lage und Name des Ladens gehen erst beim Antippen an die Karten-App; in der Datenschutzerklärung ergänzt.

## D-102 · Ladensuche nur nach Ortswechsel

- **Entscheidung:** Die App sucht bei OpenStreetMap nur neu, wenn man sich bewegt hat (300 m, nach einem Laden 150 m, beim Einkaufsbeginn 75 m, mindestens die GPS-Ungenauigkeit) oder wenn man „Neu suchen“ antippt. Am gleichen Ort gilt ein Ergebnis bis 7 Tage; die frühere Grenze von 30 Minuten beim Einkaufsbeginn entfällt. Öffnungszeiten werden aus den gespeicherten Daten jedes Mal neu berechnet, Distanzen ebenso.
- **Begründung:** Rückmeldung des Inhabers: Die Suche lief sehr oft neu, obwohl sich die Läden nicht ändern. Ein Teil davon kam von Updates, die gespeicherte Ergebnisse verwarfen, weil neue Angaben (Öffnungszeiten, Strasse) dazukamen.
- **Folgen:** Weniger Anfragen an Overpass, weniger Akku. Ändert sich ein Laden in OpenStreetMap (neue Öffnungszeiten, neuer Laden), sieht man das am gleichen Ort erst nach bis zu 7 Tagen oder mit „Neu suchen“. Kommen neue Felder dazu, wird der Speicher-Schlüssel erhöht und einmal neu gesucht.
