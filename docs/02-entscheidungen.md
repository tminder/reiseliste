# Entscheidungen

Stand: 2026-11-12 · Nur aktuell gültige Entscheidungen. Format: Entscheidung · Begründung · Folgen.

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

- **Entscheidung:** Artikel werden über ein festes Wörterbuch übersetzt (`src/data/dictionary.ts`, 358 Grundbegriffe inkl. Küchenutensilien in der Abteilung „Küche & Geschirr“, 9 Sprachen. In der deutschen Spalte stehen zusätzlich Schweizer Ausdrücke als Varianten, z. B. Rahm, Poulet, Rüebli, Zucchetti, Chriesi, Schoggi, Kehrichtsack, Bidon. Sie werden bei der Eingabe erkannt, angezeigt wird die erste, standarddeutsche Variante). Es gibt keine KI und keinen externen Übersetzungsdienst. Unbekannte Artikel können Nutzer mit einem eigenen Landesbegriff ergänzen.
- **Begründung:** Keine laufenden Kosten, offline verfügbar, die Begriffe sind vorhersehbar.
- **Folgen:** Die Abdeckung ist begrenzt (siehe Ziel in Z-1). Das Wörterbuch muss geprüft werden (S-001, F-001). Die KI-Ergänzung ist offen (F-004).

## D-005 · Anonyme Anmeldung, Beitritt per Link

- **Entscheidung:** Jedes Gerät meldet sich bei Supabase anonym an. Eine Liste sehen nur Mitglieder (`list_members`). Mitglied wird, wer die Liste erstellt (`created_by` plus Trigger) oder den Link öffnet (`join_list`). Beim Öffnen einer Liste werden Name und Sprache aus dem Profil in der Mitgliedschaft gespeichert bzw. aktualisiert. Mitglieder einer Liste sehen sich gegenseitig im Menü unter „Mitglieder“.
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

## D-008 · Landessprache über das Reiseland der Liste, Vorschlag per Standort

- **Entscheidung:** Jede Liste hat ein Reiseland, daraus folgt die Landessprache. Beim Anlegen schlägt die App das Land des aktuellen Standorts vor, sofern es unterstützt wird und nicht das eigene Wohnland ist (D-041). Dafür werden die Koordinaten über Nominatim (OpenStreetMap) einem Land zugeordnet. Das Ergebnis gilt 6 Stunden. Zu Hause, z. B. in Deutschland oder der Deutschschweiz, bleibt die Auswahl von Hand. Bestehende Listen ändern ihr Land nicht automatisch. Name und Land lassen sich über das Menü ändern (D-017). Länder mit mehreren Sprachen sind als einzelne Einträge auswählbar, z. B. Belgien (Flandern/Wallonie) oder die Schweiz (Romandie/Tessin). Der Vorschlag ordnet sie über die Region zu.
- **Begründung:** Man kann die Liste vor der Reise anlegen, das Land bleibt also wählbar. Ist man schon vor Ort, spart der Vorschlag einen Schritt (Wunsch des Inhabers).
- **Folgen:** Auf der Startseite fragt der Browser nach dem Standort. Die Koordinaten gehen an Nominatim, das steht in der Datenschutzerklärung (D-023).

## D-009 · Native Apps später mit Capacitor

- **Entscheidung:** Wenn native Apps kommen, wird die bestehende Web-App mit Capacitor verpackt. Ein Neubau mit React Native oder Swift/Kotlin ist nicht geplant.
- **Begründung:** Rund 95 % des Codes lassen sich wiederverwenden, der Aufwand liegt bei Tagen statt Wochen. Geofencing, Kamera und Push kommen über Plugins.
- **Folgen:** Das Apple Developer Program kostet 99 $ pro Jahr, Google Play einmalig 25 $. Für iOS braucht es einen Mac oder einen Build-Dienst in der Cloud. Der Zeitpunkt ist offen (F-006).

## D-010 · Produktfotos aus Open Food Facts, über die Produktkategorie

- **Entscheidung:** Ein Kamera-Knopf am Artikel zeigt bis zu 4 Packungsfotos aus Open Food Facts. Den Knopf gibt es nur in der Ladenansicht und nur, wenn ein Laden gefunden oder gewählt ist (D-011). Ohne Laden sind allgemeine Landesfotos wenig hilfreich. Gesucht wird über die **Produktkategorie** (z. B. Milch → `en:milks`), nicht per Freitext. Die Suche ist auf Produkte im Reiseland beschränkt, die meistgescannten kommen zuerst. Zuerst kommen Produkte der Kette dieses Ladens, sonst die üblichen Produkte im Land. Für lose Ware (Obst, Gemüse, Frischfleisch, Fisch) und für Non-Food (Haushalt, Drogerie, Baby) gibt es keinen Foto-Knopf. Für eigene Landesbegriffe ohne Eintrag im Wörterbuch wird per Freitext gesucht. Dabei zählen nur Produkte, deren Name mit dem Begriff beginnt oder ihn als ganzes Wort enthält. Die Fotos werden nur auf Antippen gesucht („Fotos werden gesucht …“), 30 Tage lokal gespeichert und bleiben offline verfügbar. Ist Open Food Facts ausgelastet oder nicht erreichbar, versucht es die App automatisch erneut, mit denselben Wartezeiten wie bei der Ladensuche (15 s, 30 s, 1, 2, dann alle 5 Min.), mit Countdown und „jetzt“. Die Quelle wird genannt (CC BY-SA). Es gibt keine KI-Bilder und keine Fotos aus Online-Shops von Supermärkten oder Herstellern.
- **Begründung:** Die Freitextsuche lieferte oft Unpassendes, z. B. bei „tomates“ Ketchup und Pastasauce (Rückmeldung des Inhabers). Kategorien sind deutlich treffsicherer. Open Food Facts kennt fast nur verpackte Lebensmittel, ein Knopf ohne sinnvolle Treffer wäre schlechter als gar keiner. Es sind nur wenige Suchanfragen pro Minute erlaubt, deshalb wird nur auf Antippen geladen und zwischengespeichert.

## D-011 · Supermarkt erkennen: Vorschlag über OpenStreetMap, Bestätigung durch den Nutzer

- **Entscheidung:** Die Supermarktsuche ist dezent im Kopf der Liste untergebracht, unter Land und Sprache. Sobald eine Liste offen ist und kein Laden gewählt ist, sucht die App automatisch. Beim ersten Mal fragt der Browser dafür nach dem Standort. Dabei bestimmt sie der Standort bestimmt und über die Overpass API von OpenStreetMap nach Läden in der Nähe gesucht. Der Radius richtet sich nach der GPS-Genauigkeit, er liegt zwischen 75 und 400 m. Vorgeschlagen werden zuerst Supermärkte, danach Kioske, Drogerien und Gemüseläden, jeweils der nächste zuerst. Der nächste Laden wird direkt als aktueller Laden angezeigt („Mercadona 20 m“), ohne Bestätigung. Daneben steht nur ein Stift-Symbol zum Ändern. Ein Tipp darauf zeigt bis zu 5 andere Läden und „Neu suchen“. Ist kein Laden in diesem Umkreis, sucht die App Supermärkte in Stufen (1, 3, 10, 20 km, je höchstens 40 Treffer). Alle Stufen laufen in einer einzigen Anfrage, das schont die öffentlichen Server und vermeidet Sperren, und zeigt den nächsten an („Dia 370 m“). Weitere Supermärkte erscheinen ebenfalls erst über das Stift-Symbol. Ist ein Server ausgelastet oder nicht erreichbar, versucht es die App automatisch erneut, nach 15 s, 30 s, 1, 2 und dann alle 5 Minuten, mit Countdown in der Zeile und „jetzt“ für einen sofortigen Versuch. Bei verweigertem Standort gibt es keinen automatischen neuen Versuch. Stattdessen erscheinen „Standort freigeben“ (neuer Versuch per Antippen) und „Hilfe“ mit einer Anleitung für iPhone/Safari: Ortungsdienste für Safari-Websites einschalten und den Standort für die Seite dauerhaft erlauben. Ein über das Stift-Symbol gewählter Laden ersetzt den Vorschlag. Er gilt nur auf diesem Gerät und pro Liste, wie lange: siehe D-033. So bleibt die Suche in Städten vollständig und findet auf dem Land trotzdem etwas. Ist ein Overpass-Server ausgefallen oder überlastet (z. B. Fehler 502), versucht die App automatisch zwei weitere öffentliche Server. Wann neu gesucht wird, regeln D-033 und D-046. Die Produktfotos zeigen zuerst Produkte des gewählten Ladens, laut Angabe in Open Food Facts. Ist noch keiner gewählt, gilt der angezeigte Vorschlag. Unter den Fotos steht „Bei Spar“ oder „Keine Treffer für Spar, übliche Produkte im Land“. Unter jedem Foto steht der Produktname, nicht die Marke, denn Eigenmarken wie „Mercadona“ würden sonst wie Ladennamen wirken.
- **Begründung:** Wunsch des Inhabers, auch die dezente Darstellung mit nur einem Laden und einem Symbol zum Ändern. OpenStreetMap ist kostenlos. GPS ist in Gebäuden ungenau, deshalb wird bestätigt statt still gewählt. Die automatische Suche beim Öffnen und die automatischen Wiederholungen hat sich der Inhaber gewünscht. Dafür nimmt er in Kauf, dass schon beim Öffnen der Liste die Erlaubnis-Abfrage für den Standort erscheint.
- **Folgen:** Die Koordinaten gehen an die Overpass API (FOSSGIS-Server) und werden in der App nicht gespeichert. Das steht in der Datenschutzerklärung (D-023). Die Benachrichtigung beim Betreten des Ladens gibt es erst in nativen Apps (D-009).

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

- **Entscheidung:** Jeder Artikel zeigt gross den Namen in der Sprache des Betrachters, wie eingegeben oder aus dem Wörterbuch übersetzt. Darunter steht klein der Begriff in der Landessprache, mit der Flagge des Reiselands davor („🇪🇸 leche“). Reine Zahlen werden als Anzahl angezeigt („2x“), Mengen mit Einheit bleiben unverändert („500 g“). Im Kopf der Liste stehen nur Land und Sprache, z. B. „Spanien · Español“. Tipps zu Artikeln (z. B. „Kochsahne und Schlagsahne sind oft getrennt beschriftet“) erscheinen nur in der Ladenansicht und nur auf Antippen des Glühbirnen-Symbols.
- **Begründung:** Wunsch des Inhabers: Die eigene Sprache ist schneller lesbar, die Ansicht wird kompakter, und die Tipps stören beim Schreiben der Liste nicht.

## D-016 · Automatisch aktuell: neue App-Versionen und Listendaten

- **Entscheidung:** Neue App-Versionen werden automatisch geladen. Geprüft wird beim Start, stündlich und jedes Mal, wenn die App wieder in den Vordergrund kommt, und bei einer neuen Version lädt die Seite selbst neu. Listendaten kommen per Echtzeit. Zusätzlich gleicht die App ab, wenn sie in den Vordergrund kommt, und alle 20 Sekunden, solange die Liste sichtbar ist.
- **Begründung:** Wunsch des Inhabers. Handys trennen die Echtzeit-Verbindung im Hintergrund, der Abgleich fängt das auf.
- **Folgen:** Ein Update kann die Seite mitten in der Eingabe neu laden. Bereits gespeicherte Artikel gehen dabei nicht verloren. Der Abgleich alle 20 Sekunden erzeugt mehr Anfragen an Supabase, im Gratis-Tarif ist das unkritisch.

## D-017 · Menü (☰) in der Liste

- **Entscheidung:** Oben rechts in der Liste sitzt ein Menü-Knopf ☰ statt des Knopfs „Teilen“. Das Menü enthält: Teilen, Ladenansicht an/aus, Name & Reiseland bearbeiten, Alle Listen, Von diesem Gerät entfernen. Der Knopf für die Ladenansicht bleibt zusätzlich über der Liste.
- **Begründung:** Wunsch des Inhabers. Der Kopf bleibt kompakt, und weitere Funktionen haben Platz.
- **Folgen:** „Von diesem Gerät entfernen“ entfernt die Liste nur lokal. Die anderen Mitglieder behalten sie (S-010).

## D-018 · Symbole statt Emojis

- **Entscheidung:** Die Bedienelemente nutzen einheitliche Linien-Symbole aus `lucide-react`, z. B. Kamera, Menü, Stift, Laden, Standort, Glühbirne, Teilen, Papierkorb. Emojis bleiben nur für Länderflaggen.
- **Begründung:** Wunsch des Inhabers: moderner und schöner. Emojis sehen je nach Gerät anders aus, Symbole passen sich an Farbe und Dunkelmodus an.

## D-019 · Sync-Status nur bei Problemen sichtbar

- **Entscheidung:** Es gibt keine Statuszeile „Synchronisiert“ mehr. Läuft alles normal, ist nichts zu sehen. Offline erscheint im Kopf eine Wolke mit Strich, bei einem Fehler eine orange Wolke mit Ausrufezeichen. Ein Tipp darauf erklärt den Zustand, bei Fehlern mit der Meldung von Supabase. Während des Abgleichs wird nichts angezeigt.
- **Begründung:** Wunsch des Inhabers, die Zeile störte. Synchron ist der Normalzustand, nur Abweichungen sind für den Nutzer relevant.

## D-020 · Automatisch in die Ladenansicht, wenn man im Supermarkt ist

- **Entscheidung:** Ergibt die Ladensuche **beim Öffnen einer Liste** (innerhalb von 30 s), dass ein **Supermarkt** höchstens 50 m entfernt ist, bei einer GPS-Genauigkeit von höchstens 60 m, wechselt die App in die Ladenansicht. Ein Hinweis erscheint: „Ladenansicht – du bist bei Spar · zurück“. Kein Wechsel, wenn im Eingabefeld Text steht, die Ladenansicht schon aktiv ist, es nur ein Kiosk, eine Drogerie o. ä. ist, oder der Nutzer bei diesem Laden in den letzten 3 Stunden „zurück“ getippt hat. Während der Bearbeitung wird nie gewechselt.
- **Begründung:** Wunsch des Inhabers. Im Laden sind große Schrift und Tipps sofort da, ohne Tippen. Die Leitplanken verhindern ungewollte Wechsel durch ungenaues GPS, z. B. wenn man neben einem Supermarkt wohnt oder vorbeigeht.
- **Folgen:** Eine Web-App kann den Standort nicht im Hintergrund prüfen. Der Wechsel passiert also nur beim Öffnen der Liste, nicht beim Betreten des Ladens. Das ginge erst mit nativen Apps (D-009).

## D-022 · Oberfläche mehrsprachig (Deutsch, Englisch)

- **Entscheidung:** Alle Texte der Oberfläche stehen in `src/i18n.ts`, auf Deutsch und Englisch. Die Sprache der Oberfläche folgt der Sprache im Profil. Vor dem Anlegen des Profils gilt die Sprache des Browsers. Für Sprachen ohne eigene Texte wird Englisch verwendet. Ländernamen kommen in der Oberflächensprache vom Browser (`Intl.DisplayNames`), Abteilungen und Tipps sind übersetzt. Wechselt man im Profil die Sprache, wechselt die Oberfläche sofort mit.
- **Begründung:** Mitreisende mit anderer Sprache sollen die App bedienen können (Ziel Z-2). Englisch deckt die meisten ab, weitere Sprachen lassen sich ohne Umbau ergänzen.
- **Folgen:** Neue Texte immer in `de` und `en` anlegen. Die übrigen Sprachen sind offen (S-008).

## D-023 · Datenschutzerklärung und Kontakt in der App

- **Entscheidung:** Die App hat eine Seite „Datenschutz & Kontakt“ (`#/datenschutz`, `src/Privacy.tsx`, Deutsch und Englisch). Sie ist erreichbar über die Fusszeile der Startseite und der Profil-Einrichtung sowie über das Menü der Liste. Inhalt: Betreiber (Tobias Minder, Schweiz, mail@tobiasminder.ch, privat und nicht kommerziell), bearbeitete Daten und Zwecke, Empfänger (Supabase, GitHub, OpenStreetMap/Overpass/Nominatim, Open Food Facts), Rechtsgrundlagen für EU-Nutzer, Speicherdauer, Rechte (Auskunft, Berichtigung, Löschung per E-Mail, Beschwerde beim EDÖB oder bei der EU-Aufsicht), Fotos und Marken. Auf der Startseite erscheint einmalig ein Hinweis zum Standort, bis man „OK“ tippt. Ein Impressum mit Postadresse gibt es nicht: Für private, nicht kommerzielle Websites besteht in der Schweiz laut UWG keine Impressumspflicht. Kontakt per E-Mail ist angegeben.
- **Begründung:** Eine Datenschutzerklärung ist nach Schweizer DSG (Art. 19) und für EU-Nutzer nach DSGVO (Art. 13) Pflicht, auch bei privaten öffentlichen Angeboten. Der Inhaber betreibt die App von der Schweiz aus, privat und ohne Einnahmen.
- **Folgen:** Ändern sich Datenflüsse (neuer Dienst, Speicherdauer, Werbung oder Einnahmen), muss die Seite angepasst werden. Werden Einnahmen erzielt, ist das Impressum neu zu prüfen. Rechtliche Restpunkte stehen in F-013. Geprüft hat das keine Fachperson.

## D-024 · Korrekturen von Nutzern: sofort in der Liste, gesammelt und vom Inhaber geprüft

- **Entscheidung:** Gilt nur mit eingeschaltetem Community-Modul, im MVP ist es aus (D-027). Ein Tipp auf den Begriff in der Landessprache, z. B. „🇪🇸 nata“, öffnet „Begriff korrigieren“. Das geht auch bei Artikeln ohne Übersetzung. Die Korrektur gilt sofort für alle Artikel mit demselben Wörterbuch-Eintrag in dieser Liste, auch für später hinzugefügte. Damit sehen sie alle Mitglieder. Zusätzlich wird sie als Vorschlag in der Supabase-Tabelle `term_suggestions` gespeichert. Nutzer dürfen dort nur eintragen, nicht lesen. Offline bleibt der Vorschlag auf dem Gerät und wird beim nächsten Abgleich gesendet. Ins Wörterbuch kommen Vorschläge nur nach Prüfung durch den Inhaber, nie automatisch. Die Zusammenfassung `term_suggestions_summary` (gruppiert nach Begriff und Anzahl verschiedener Nutzer, ohne Kennungen) exportiert ein GitHub-Actions-Job montags und auf Knopfdruck nach `docs/korrekturvorschlaege.csv` im Repo. So kann Claude sie lesen, ohne Zugang zu Supabase. Der Job braucht das GitHub-Secret `SUPABASE_SECRET_KEY` und sendet es nur im `apikey`-Header. Gute Vorschläge übernimmt Claude auf Zuruf („übernimm die Korrekturen“) in `src/data/dictionary.ts`. Alternativ lässt sich im Supabase SQL Editor `select * from term_suggestions_summary;` ausführen.
- **Begründung:** Entscheidung des Inhabers. Kein Risiko durch Spam oder Manipulation, und die Nutzer profitieren trotzdem sofort in ihrer Liste.
- **Folgen:** Das Wörterbuch wird nur besser, wenn regelmässig ausgewertet wird. Die Zusammenfassung ist öffentlich, weil das Repo öffentlich ist (nur Begriffe, keine Kennungen). Die Vorschläge und der Export sind in der Datenschutzerklärung aufgeführt (D-023).

## D-025 · Die App heisst „Proviant“

- **Entscheidung:** Der Name der App ist „Proviant“ (Oberfläche DE und EN, Manifest, Seitentitel, Datenschutz, README). Untertitel im Manifest: „Einkaufsliste für Reisen“. Der Markenname bekommt später einen Zusatz (F-005). Repo `tminder/reiseliste`, URL und interne Schlüssel (`rl:`) bleiben unverändert.
- **Begründung:** Entscheidung des Inhabers. Positionierung als Einkaufsliste mit Reisebezug, Sprache zweitrangig, ohne „shop“. „Proviant“ verstehen viele Sprachen (DE, SV, DA, NO, NL „proviand“, EN/FR „provisions“). „Travel List“ wäre auf Englisch als Packliste missverstanden worden.
- **Folgen:** „Proviant“ allein ist generisch und schon belegt, deshalb nicht als Marke schützbar (F-005). Zudem ist „Proviant“ eine bekannte deutsche Getränkemarke (Proviant Fruchtmanufaktur Berlin, Bio-Limonaden im Detailhandel). International verstehen das Wort vor allem Deutsch-, Skandinavisch- und Niederländischsprachige, auf Englisch, Spanisch, Italienisch und Französisch ist es ein Fremdwort. Als Arbeitstitel fürs MVP tauglich, als internationale Marke fraglich. Bereits installierte PWAs zeigen den neuen Namen erst nach einem Update bzw. neuem Hinzufügen zum Home-Bildschirm.

## D-026 · App-Icon: gefüllter Einkaufswagen auf geschwungener Strasse

- **Entscheidung:** Das Icon zeigt einen weiss gefüllten Einkaufswagen, der leicht schräg auf einer dunklen, S-förmig geschwungenen Strasse (#1e293b) fährt. Petrolfarbener Grund (#14b8a6), keine weiteren Details. Quelle ist `public/favicon.svg`. Daraus entstehen mit `rsvg-convert` favicon-32, icon-192/512, apple-touch-icon (180 px, ohne Rundung, weil iOS selbst rundet) und icon-maskable-512 (Motiv auf 80 % verkleinert, Strasse läuft bis zum Rand).
- **Begründung:** Entscheidung des Inhabers (Variante „i-b“). Der gefüllte Wagen bleibt auch in Home-Bildschirm-Grösse gut lesbar. Die Strasse verbindet Einkaufen und Unterwegs-Sein. iOS zeigt auf dem Home-Bildschirm nur PNG-Symbole, deshalb die PNG-Dateien.
- **Folgen:** Bereits installierte PWAs zeigen das neue Icon erst nach dem Entfernen und erneuten Hinzufügen zum Home-Bildschirm.

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

- **Entscheidung:** Über der Gruppe „Im Wagen“ steht der Knopf „Erledigte entfernen“ (automatisch: D-043). Er entfernt alle abgehakten Artikel (Soft-Delete) ohne Rückfrage, danach ist „Rückgängig“ möglich (D-042). Unter dem Eingabefeld zeigt „Schon mal gekauft“ bis zu 8 entfernte Artikel dieser Liste, die gerade nicht auf der Liste stehen (neueste zuerst, ohne Doppelte). Ein Tipp setzt den Artikel ohne Menge wieder auf die Liste, in der Sprache des Tippenden. Nur in der Bearbeiten-Ansicht, nur bei leerem Eingabefeld und nur, solange man ins Eingabefeld getippt hat (Wunsch des Inhabers).
- **Begründung:** Auf Reisen kauft man fast täglich ein, eine Liste wird immer wieder verwendet (Vorschlag „wenige, aber gute Funktionen“, vom Inhaber gewählt).
- **Folgen:** Auch ohne Kauf gelöschte Artikel erscheinen unter „Schon mal gekauft“. Keine Datenbank-Änderung nötig.

## D-031 · Wer holt was: „Ich hole das“

- **Entscheidung:** In der Ladenansicht hat jeder offene Artikel einen Hand-Knopf (✋). In der Bearbeiten-Ansicht fehlt er, der Hinweis „holt das“ ist aber in beiden Ansichten sichtbar. Ein Tipp trägt den eigenen Namen ein (Spalte `items.claimed_by`), alle sehen „🙋 Anna holt das“ bzw. „Du holst das“. Nochmals tippen gibt ihn frei. Tippt jemand anderes, übernimmt er den Artikel. Beim Abhaken wird der Eintrag zurückgesetzt (Wunsch des Inhabers). Der Hinweis bricht nicht um.
- **Begründung:** Verhindert Doppelkäufe, wenn sich die Gruppe im Laden aufteilt. Hauptnutzen einer geteilten Liste. Nur in der Ladenansicht, damit die Bearbeiten-Ansicht ruhig bleibt (Wunsch des Inhabers).
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden (neue Spalte). Bis dahin schlägt nur das Speichern eines „Ich hole das“ fehl, alle anderen Änderungen werden weiter synchronisiert, weil `claimed_by` nur mitgeschickt wird, wenn es gesetzt ist. Der Name wird in der Datenschutzerklärung erwähnt.

## D-032 · Zeigen-Karte fürs Personal

- **Entscheidung:** In der Ladenansicht öffnet ein Tipp auf den Begriff in der Landessprache (z. B. „🇪🇸 nata“) eine bildschirmfüllende Karte. In der Bearbeiten-Ansicht ist der Begriff nicht antippbar (Wunsch des Inhabers). Inhalt der Karte: oben „Entschuldigung, wo finde ich das?“, gross der Begriff (mit Menge), darunter „Danke!“, alles in der Landessprache, klein der Artikel in der eigenen Sprache. Antippen oder ✕ schliesst sie. Die Sätze stehen in `src/data/phrases.ts` und enthalten den Begriff bewusst nicht, damit Fall und Artikel in keiner Sprache falsch werden. Ist das Community-Modul eingeschaltet, öffnet der Tipp in der Bearbeiten-Ansicht „Begriff korrigieren“.
- **Begründung:** Hilft genau dann, wenn man im Laden nicht weiterkommt, ohne die Sprache sprechen zu müssen.
- **Folgen:** Die Sätze sind nicht von Muttersprachlern geprüft (S-001).

## D-033 · Ladensuche: neu suchen nur nach Ortswechsel, Prüfung im Hintergrund

- **Entscheidung:** Ein Suchergebnis bleibt 12 Stunden gespeichert (`rl:nearby`) und erscheint beim Öffnen sofort, ohne „Suche …“. Beim Öffnen der Liste und beim Zurückkehren in die App (höchstens alle 2 Minuten) fragt die App still den Standort ab. Bei OpenStreetMap neu gesucht wird nur, wenn man sich mehr als 300 m bewegt hat (150 m, wenn man in einem Laden war), mindestens aber um die GPS-Ungenauigkeit. Sonst werden nur die Distanzen neu berechnet. Schlägt die Prüfung im Hintergrund fehl, bleibt der bisherige Laden stehen, ohne Fehlermeldung. „Neu suchen“ fragt immer neu. Ein gewählter Laden gilt, bis man sich mehr als 1 km davon entfernt hat (höchstens 24 Stunden, ältere Einträge ohne Lage 3 Stunden). Danach wird er verworfen und der nächste Laden vorgeschlagen. Kein Dauer-Tracking.
- **Begründung:** Rückmeldung des Inhabers: Der Laden wurde neu gesucht, obwohl sich der Standort nicht geändert hatte. Ursache waren die kurze Gültigkeit (5 Minuten) und GPS-Sprünge in Gebäuden (mehr als 50 m). Läden ziehen nicht um, also zählt die Strecke statt der Zeit. Weniger Anfragen schonen auch die öffentlichen Server (S-025).
- **Folgen:** Ein neuer Laden direkt nebenan erscheint erst nach etwa 300 m Bewegung oder über „Neu suchen“. Auf dem Gerät werden die Stelle der letzten Suche und die Lage der gefundenen Läden gespeichert (in der Datenschutzerklärung erwähnt).


## D-035 · Neue Version auf allen Geräten erzwingen

- **Entscheidung:** Jeder Build bekommt eine Kennung (Commit-Hash auf GitHub, sonst Zeitstempel). Sie steckt im Code und in `version.json`. Beim Start und beim Zurückkehren in die App (höchstens jede Minute) lädt die App `version.json` am Service Worker vorbei. Weicht die Kennung ab, lädt sie hart neu: Service Worker abmelden, App-Cache leeren, Seite frisch laden. Offline gespeicherte Produktfotos bleiben. Gegen Schleifen gilt: pro Build höchstens ein Versuch alle 10 Minuten. Das bestehende automatische Update des Service Workers bleibt zusätzlich aktiv. Die laufende Version (Commit-Kennung) steht im Menü ☰ und in der Fusszeile, dazu der Hinweis, wenn Animationen wegen „Bewegung reduzieren“ aus sind.
- **Begründung:** Wunsch des Inhabers. Installierte PWAs zeigten nach einem Deployment teilweise noch altes CSS und alten Code.
- **Folgen:** Jedes Deployment lädt alle offenen Apps beim nächsten Öffnen bzw. Zurückkehren einmal neu. Geräte mit einer Version ohne diese Prüfung bekommen sie erst mit dem nächsten normalen Update des Service Workers. Einen „Neu laden“-Link gibt es deshalb nicht mehr.

## D-036 · Listenübersicht: letzte Änderung zeigen, Listen entfernen

- **Entscheidung:** Unter jedem Listennamen in „Deine Listen“ steht die letzte Änderung („Geändert heute 10:58“, „gestern 18:20“ oder Datum mit Uhrzeit). Massgeblich ist die jüngste Änderung an der Liste oder an einem Artikel, zuerst aus dem Gerätespeicher, dann aktuell aus Supabase. Die Listen sind danach sortiert, die neueste oben. Das Papierkorb-Symbol fragt nach („Aus deinen Listen entfernen? Für die anderen Mitglieder bleibt sie bestehen.“) und entfernt die Liste dann vom Gerät und beendet die Mitgliedschaft in Supabase (Policy „members: leave“). Dasselbe macht „Aus meinen Listen entfernen“ im Menü der Liste, dort mit einem Warnfenster („„Barcelona“ entfernen?“, Entfernen/Abbrechen). Beide Warnungen sind rot hervorgehoben. Mit dem Link kann man wieder beitreten. Für alle löschen lässt sich eine Liste nicht (S-010).
- **Begründung:** Wunsch des Inhabers. Bisher wurde eine Liste nur vom Gerät „vergessen“, die Mitgliedschaft blieb bestehen.
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden (neue Policy). Bis dahin wird die Liste nur lokal entfernt. Verlässt das letzte Mitglied eine Liste, bleibt sie verwaist in der Datenbank (F-010).


## D-037 · Listen in der iPhone-App vom Home-Bildschirm öffnen

- **Entscheidung:** Auf der Startseite öffnet „Liste beitreten“ ein Feld mit zwei Wegen: oben gross „QR-Code scannen“ (D-038), darunter „oder Link einfügen“. Für den Link gilt: Link (oder Text mit Link) einfügen, auf Wunsch mit „Einfügen“ aus der Zwischenablage, und die Liste öffnet sich. Wird ein Listen-Link auf dem iPhone in Safari geöffnet (nicht in der Home-Bildschirm-App), erklärt ein Hinweis über der Liste den Weg und bietet „Link kopieren“ an. Er lässt sich mit „Nicht mehr zeigen“ ausblenden. Auch das Teilen-Fenster nennt den Weg.
- **Begründung:** Rückmeldung des Inhabers: Haben beide die Web-App auf dem Home-Bildschirm, klappt das Teilen nicht. iOS öffnet Links immer in Safari, und Safari und die Home-Bildschirm-App haben getrennten Speicher.
- **Folgen:** Ein Schritt mehr für iPhone-Nutzer (Link kopieren, in der App einfügen). Eine echte Lösung wären native Apps mit Universal Links (D-009, F-006).

## D-038 · QR-Code einer Liste in der App scannen

- **Entscheidung:** Unter „Liste beitreten“ (D-037) ist „QR-Code scannen“ der primäre Weg. Er öffnet die Rückkamera bildschirmfüllend mit Rahmen. Erkannt wird mit der Bibliothek jsQR direkt im Browser (etwa 5 Bilder pro Sekunde, verkleinert). Sobald ein QR-Code mit Listen-Link erkannt ist, öffnet sich die Liste. Andere QR-Codes ergeben einen Hinweis. Unten im Scanner führt „Stattdessen Link einfügen“ zurück zum Link-Feld, auch wenn die Kamera nicht erlaubt ist. Der Scanner wird erst beim Öffnen geladen (eigene Datei, etwa 50 kB komprimiert).
- **Begründung:** Wunsch des Inhabers. Auf dem iPhone öffnet die Kamera-App QR-Codes in Safari, nicht in der Home-Bildschirm-App (D-037). Mit dem Scanner in der App landet die Liste direkt dort.
- **Folgen:** Kamerazugriff nur auf Knopfdruck und mit Erlaubnis, Bilder werden weder gespeichert noch gesendet (in der Datenschutzerklärung erwähnt). Auf einem echten iPhone noch nicht getestet (S-031).


## D-039 · Supabase wach halten per täglichem Ping

- **Entscheidung:** Der GitHub-Job „Supabase wach halten“ (`.github/workflows/keepalive.yml`) ruft täglich um 04:37 UTC die Datenbank-Funktion `ping()` auf. Sie schreibt einen Zeitstempel in die Tabelle `keepalive` (eine Zeile, kein direkter Zugriff). Fehlt die Funktion noch, macht der Job eine einfache Leseanfrage und warnt. Antwortet Supabase gar nicht, schlägt der Job fehl, und GitHub schickt eine E-Mail. Er nutzt URL und Publishable Key aus `.env.production`, es braucht kein Secret.
- **Begründung:** Gratis-Projekte werden nach 7 Tagen mit zu wenig Datenbank-Aktivität pausiert. Während einer Testreise mit wenigen Nutzern wäre die App dann ohne Sync. Eine kleine Schreibaktion zählt sicher als Aktivität.
- **Folgen:** `supabase/schema.sql` muss erneut ausgeführt werden. Supabase garantiert nicht, dass das reicht. Den Pausier-Schutz garantiert nur der Pro-Tarif (25 $ pro Monat). GitHub stoppt geplante Jobs in Repos ohne Aktivität nach 60 Tagen.

## D-040 · Reiseland passt sich beim Grenzübertritt automatisch an

- **Entscheidung:** Beim Öffnen einer Liste prüft die App still das aktuelle Land (Nominatim, Ergebnis höchstens 30 Minuten alt). Ist man in einem anderen unterstützten Reiseland als dem der Liste, wechselt sie das Reiseland der Liste automatisch (für alle Mitglieder) und zeigt „Reiseland auf 🇫🇷 Frankreich geändert · Rückgängig“. „Rückgängig“ stellt das alte Land wieder her, und für diese Liste wird nicht mehr automatisch auf dieses Land gewechselt (nur auf diesem Gerät). Im eigenen Wohnland (D-041) und in nicht unterstützten Ländern passiert nichts.
- **Begründung:** Wunsch des Inhabers. Auf Rundreisen (z. B. Spanien → Frankreich) soll die Liste ohne Handgriff die neue Landessprache zeigen.
- **Folgen:** Ein Mitglied, das ein falsches oder kein Wohnland angegeben hat, kann das Reiseland zu Hause umstellen. Dafür gibt es „Rückgängig“. Fällt der Standort weg (keine Erlaubnis), bleibt alles wie es ist.

## D-041 · International: Wohnland im Profil als „zu Hause“

- **Entscheidung:** Das Profil hat neben Name und Sprache ein Wohnland („Wo wohnst du?“, alle Länder der App oder „Anderes Land“). Es ist die Basis für „zu Hause“: Dort wechselt die App das Reiseland nicht automatisch (D-040), und beim Anlegen einer Liste wird das Wohnland nicht vorgeschlagen. Ältere Profile ohne Angabe bekommen einen geratenen Wert (Browsersprache mit Region, z. B. de-CH → Deutschschweiz, sonst aus der Sprache, z. B. Spanisch → Spanien), änderbar über den Namen oben rechts. Damit jedes Land Wohn- und Reiseland sein kann, sind die deutschsprachigen Länder (Deutschland, Österreich, Deutschschweiz, Liechtenstein) sowie Brasilien, Argentinien, Kanada, Australien und Neuseeland dazugekommen (jetzt 27 Länder). Die Ländererkennung liefert für die Deutschschweiz jetzt „Schweiz (Deutschschweiz)“.
- **Begründung:** Wunsch des Inhabers: Die App soll international funktionieren, nicht nur für Reisende aus dem deutschsprachigen Raum. Ein Spanier auf Reisen in der Schweiz braucht Deutsch als Landessprache.
- **Folgen:** Das Wohnland wird nur auf dem Gerät gespeichert, nicht bei der Mitgliedschaft. Bei „bestehendes Mitglied auswählen“ (D-029) wird es geraten. Die Oberfläche gibt es weiterhin nur auf Deutsch und Englisch (S-008).

## D-042 · „Rückgängig“ nach dem Löschen statt Swipen

- **Entscheidung:** Nach dem Löschen eines Artikels (✕) oder nach „Erledigte entfernen“ erscheint unten 5 Sekunden lang „„Milch“ gelöscht · Rückgängig“ bzw. „2 Artikel entfernt · Rückgängig“. „Rückgängig“ stellt die Artikel mit Menge, Autor und Status wieder her. Gelöscht wird weiterhin über das sichtbare ✕, Swipen gibt es vorerst nicht.
- **Begründung:** Empfehlung von Claude, vom Inhaber bestätigt. Testpersonen sollen die App ohne Erklärung bedienen können, ein sichtbares ✕ ist dafür besser als eine versteckte Wischgeste. Das grössere Problem war, dass versehentlich Gelöschtes weg war.
- **Folgen:** Ob die Zeilen ohne Swipen zu voll wirken, zeigt der Test mit Testpersonen. Swipen liesse sich dann mit wenig Aufwand ergänzen, das Rückgängig ist schon da.

## D-043 · Erledigte automatisch entfernen: nach dem Ladenbesuch oder nach 1 Tag

- **Entscheidung:** Abgehakte Artikel werden automatisch entfernt (Soft-Delete, danach „Rückgängig“ wie in D-042):
  - **Laden verlassen:** Ist die Ladenansicht mit einem Laden offen und ist man nachweislich dort (höchstens 100 m vom Laden, GPS-Genauigkeit höchstens 100 m), merkt sich das Gerät den Besuch (Lage des Ladens, `rl:shopvisit:<Liste>`, höchstens 12 Stunden). Ein bloss vorgeschlagener Laden in der Nähe zählt nicht, auch nicht, wenn das Abhaken in die Ladenansicht schaltet (D-047). Beim Zurückkehren in die App und alle 2 Minuten, solange sie offen ist, prüft es den Standort (und ob man inzwischen beim Laden angekommen ist). Ist man nach einem Besuch mehr als 150 m weg (mindestens die GPS-Ungenauigkeit), werden alle Erledigten entfernt: „Erledigte entfernt: 2 (Laden verlassen) · Rückgängig“.
  - **Nach 1 Tag:** Artikel, die vor mehr als 24 Stunden abgehakt wurden, werden beim Öffnen der Liste und alle 5 Minuten entfernt.
  - **Einstellung pro Liste:** „Erledigte automatisch entfernen“ unter Menü → Name & Reiseland, Standard an. Gespeichert in `lists.auto_clear`, gilt für alle Mitglieder.
- **Begründung:** Wunsch des Inhabers. Nach dem Einkauf soll die Liste ohne Handgriff wieder nur zeigen, was noch fehlt. Entfernte Artikel bleiben unter „Schon mal gekauft“ verfügbar.
- **Folgen:** Als Web-App prüft Proviant nur, wenn sie offen ist oder wieder geöffnet wird, nicht im Hintergrund. `supabase/schema.sql` muss erneut ausgeführt werden (neue Spalte), bis dahin funktioniert alles, nur das Abschalten wird nicht synchronisiert. Ohne Standortfreigabe greift nur die 1-Tages-Regel.

## D-044 · Weiche Übergänge bei Statuswechseln

- **Entscheidung:** Statuswechsel sind sichtbar animiert, kurz (150–400 ms) und ohne Spielerei:
  - **Abhaken:** Der Kreis ploppt, das Häkchen zeichnet sich, der Artikelname wird von links nach rechts durchgestrichen. Erst nach etwa 0,4 s rutscht die Zeile nach „Im Wagen“. Auf Android vibriert das Handy kurz.
  - **Umsortieren:** Zeilen und Abteilungs-Überschriften gleiten an ihren neuen Platz (FLIP-Technik, `src/lib/motion.ts`), statt zu springen.
  - **Hinzufügen und Rückgängig:** Neue Zeilen gleiten ein und leuchten kurz türkis auf. Liegt ein selbst hinzugefügter Artikel ausserhalb des sichtbaren Bereichs, scrollt die Liste nicht weg (man tippt oft mehrere Artikel hintereinander). Bestätigt wird direkt am Eingabefeld: Ein angetippter Vorschlag färbt sich kurz mit „✓ … hinzugefügt“ bzw. „Menge erhöht“, bevor die Vorschläge schliessen. Beim Hinzufügen mit Enter oder „+“ wird das „+“ kurz zum Häkchen und das Eingabefeld leuchtet. Das Eingabefeld bleibt beim Scrollen oben stehen.
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
  - **Beim Tippen:** Vorschläge, die schon offen auf der Liste stehen, zeigen die Menge: „✓ 3x auf der Liste“, bei mehreren Zeilen „✓ 3x · 2 × 100 g auf der Liste“ (ohne Menge „1x“).
- **Begründung:** Entscheidung des Inhabers: Zusammenfassen über verschiedene Einheiten schuf unverständliche Mengen („1 + 2 × 100 g + 2“) und falsche Verschmelzungen (schwarze Schokolade mit Schokolade). Nachfragen ist umständlich.
- **Folgen:** Werden derselbe Artikel und dieselbe Einheit gleichzeitig auf zwei Geräten eingetragen, entstehen zwei Zeilen (selten, kein automatisches Aufräumen).

## D-046 · Wechsel in die Ladenansicht prüft den Laden genauer

- **Entscheidung:** Beim Wechsel in die Ladenansicht (von Hand oder automatisch) prüft die App im Hintergrund, ob der angezeigte Laden stimmt: frischer Standort (höchstens 10 Sekunden alt), neue Suche bei OpenStreetMap schon ab 75 m Abstand zur letzten Suche (sonst gilt D-033 mit 300 m) oder wenn die letzte Suche älter als 30 Minuten ist. Ein von Hand gewählter Laden wird verworfen, wenn man mehr als 150 m davon entfernt ist, danach sucht die App den Laden am aktuellen Standort. Der bisherige Laden bleibt bis zum Ergebnis stehen, ohne „Suche …“ und ohne Fehlermeldung. Höchstens eine solche Prüfung pro Minute.
- **Begründung:** Wunsch des Inhabers. Wer in die Ladenansicht wechselt, steht meist im Laden. In Städten liegen oft mehrere Supermärkte innerhalb von 300 m, die Regel aus D-033 hätte dann den falschen Laden stehen lassen. Der richtige Laden zählt für Fotos und „Laden verlassen“ (D-043).
- **Folgen:** Etwas mehr Anfragen an OpenStreetMap, aber nur beim Wechsel in die Ladenansicht.

## D-047 · Abhaken schaltet in die Ladenansicht

- **Entscheidung:** Wird in der normalen Ansicht ein Artikel abgehakt, wechselt die App nach der Abhak-Animation in die Ladenansicht. Ein Hinweis erscheint: „Ladenansicht eingeschaltet · zurück“. Nach „zurück“ wechselt die App nicht mehr, solange die Liste offen ist. Wieder-Öffnen eines Artikels löst nichts aus. Die Laden-Prüfung aus D-046 startet dabei wie bei jedem Wechsel.
- **Begründung:** Entscheidung des Inhabers nach einem Test. Abhaken ist das deutlichste Zeichen, dass jemand gerade einkauft, und funktioniert auch ohne Standort.
- **Folgen:** Schon der erste Haken schaltet um, auch beim Aufräumen zu Hause. Wer das nicht will, tippt einmal auf „zurück“.
