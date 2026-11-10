# Konzept: Native App für iPhone und Android

Stand: 2026-11-10 · Entwurf von Claude. Entschieden ist noch nichts. Wann sich der Schritt lohnt, ist als F-006 offen.

## 1. Warum überhaupt eine native App?

Die PWA (D-001) deckt das MVP ab. Bei echten Nutzern stösst sie auf dem iPhone aber an Grenzen, die sich im Web nicht lösen lassen:

| Problem heute | Ursache | Native Lösung |
| --- | --- | --- |
| Geteilte Links öffnen sich in Safari, nicht in der Home-Bildschirm-App (D-037) | iOS leitet Links nie an Web-Apps weiter | Universal Links (iOS) und App Links (Android) |
| Safari und Home-Bildschirm-App haben getrennte Speicher, Profil und Listen gehen beim Wechsel verloren | Speichertrennung von iOS | Ein einziger App-Speicher |
| Safari vergisst die Standortfreigabe (S-027) | Websites bekommen nur kurzlebige Freigaben | Dauerhafte Freigabe der App |
| Die App erkennt den Supermarkt nur, wenn sie offen ist | Kein Hintergrund-Standort im Web | Geofencing: Mitteilung „Du bist bei Mercadona – Liste öffnen?“ |
| Keine Mitteilungen, wenn andere die Liste ändern | Web-Push auf iOS nur eingeschränkt | Push-Mitteilungen |
| Installieren muss man erklären („Teilen → Zum Home-Bildschirm“) | Kein Installationsdialog auf iOS | Normal aus dem App Store laden |
| Man findet die App nicht | Keine Store-Präsenz | Eintrag im App Store und bei Google Play |

## 2. Technischer Ansatz: Capacitor

Empfehlung: **Capacitor** (Ionic, Open Source). Es verpackt die bestehende React-App in eine echte iOS- und Android-App und gibt ihr Zugriff auf native Funktionen über Plugins. Stand November 2026 ist Capacitor 8.5 aktuell.

| Variante | Umbau | Gefühl | Aufwand für eine Person | Bewertung |
| --- | --- | --- | --- | --- |
| **Capacitor** | Gering: Oberfläche und Logik bleiben, native Teile kommen dazu | Fast nativ, für eine Listen-App ausreichend | Ein Code für Web, iOS und Android | **Empfohlen** |
| React Native / Expo | Oberfläche komplett neu (andere Bausteine), Logik teilweise übernehmbar | Nativ | Ein Code für iOS und Android, das Web läuft getrennt weiter | Erst bei hohen Ansprüchen an die Bedienung |
| Swift + Kotlin | Alles neu, zweimal | Bestes Ergebnis | Zwei getrennte Apps | Für ein Ein-Mann-Projekt zu viel |

Die PWA bleibt bestehen. Sie ist weiterhin der Weg für alle, die keine App installieren wollen (Z-3: Beitreten ohne Installation), und der Web-Teil der nativen Apps ist derselbe Code.

## 3. Architektur

```
                 ┌──────────────────────────────┐
                 │  React-App (heutiger Code)    │
                 │  src/ … gemeinsam für alle    │
                 └──────────────┬───────────────┘
          ┌─────────────────────┼──────────────────────┐
          ▼                     ▼                      ▼
   Web (PWA, GitHub Pages)   iOS-App (Capacitor)   Android-App (Capacitor)
          │                     │ native Plugins       │ native Plugins
          └──────────┬──────────┴──────────┬───────────┘
                     ▼                     ▼
              Supabase (DB, Auth,     Apple APNs / Google FCM
              Realtime, Edge Function  (Push-Mitteilungen)
              für Push)
```

Eine kleine Schicht `src/platform/` entscheidet, ob die Web- oder die native Variante einer Funktion läuft (Speicher, Standort, Kamera, Teilen). Der Rest der App merkt davon nichts.

## 4. Native Funktionen, nach Priorität

### Stufe 1: nötig für eine erste App

1. **Universal Links und App Links.** Ein Link wie `https://proviant.app/l/<id>` öffnet die App, falls installiert, sonst die Website.
   - Braucht eine **eigene Domain**. Die Prüfdateien (`/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`) müssen an der Wurzel der Domain liegen. Unter `tminder.github.io/reiseliste` geht das nicht.
   - Braucht **Pfad-Links statt Hash-Links**. Heute heisst es `#/l/<id>`, Universal Links werten den Teil nach `#` aber nicht aus. Die Website muss `/l/<id>` verstehen und weiterleiten. Alte Links und QR-Codes müssen weiter funktionieren.
2. **Speicher:** Profil, Listen und Warteschlange aus `localStorage` in den nativen Speicher verlegen (`@capacitor/preferences`, später eventuell SQLite). Sonst kann iOS die Daten bei Speichermangel löschen. Die Supabase-Sitzung ebenfalls.
3. **Standort:** `@capacitor/geolocation` statt Browser-Standort, mit dauerhafter Freigabe und eigenen Begründungstexten.
4. **Kamera und QR-Code:** nativer Scanner (z. B. ML Kit über ein Plugin). Schneller und zuverlässiger als jsQR (D-038).
5. **Teilen:** natives Teilen-Menü (`@capacitor/share`).
6. **App-Grundlagen:** App-Icon aus `public/favicon.svg` (D-026), Startbildschirm, Statusleiste, Zurück-Taste auf Android.

### Stufe 2: der eigentliche Mehrwert

7. **Push-Mitteilungen** („Anna hat 3 Artikel hinzugefügt“, „Tobias holt die Milch“): Supabase speichert die Gerätekennungen (neue Tabelle `push_tokens`), eine Supabase Edge Function verschickt bei Änderungen über APNs (Apple) und FCM (Google). Mit Ruhezeiten und Bündelung, damit es nicht nervt.
8. **Geofencing:** Die App merkt sich Supermärkte in der Nähe der Unterkunft und meldet sich beim Betreten: „Du bist bei Mercadona – 5 Artikel offen“. Ein Plugin wie `@capgo/background-geolocation` unterstützt das auf iOS und Android. Datenschutz und Akku brauchen hier besondere Sorgfalt: nur für Listen mit offenen Artikeln, abschaltbar, keine Bewegungsdaten an den Server.
9. **Widget** (iOS und Android): offene Artikel der aktuellen Liste auf dem Home-Bildschirm.

### Stufe 3: später

10. Siri- und Google-Assistant-Kurzbefehle („Milch auf die Reiseliste“), Apple Watch, Sprachnotizen.

## 5. Änderungen am bestehenden Code

| Bereich | Änderung |
| --- | --- |
| Routing | Pfad-Links `/l/<id>` zusätzlich zu `#/l/<id>`, Weiterleitung auf der Website, `appUrlOpen` in der App |
| `src/lib/store.ts` | Speicherzugriffe über eine Plattform-Schicht statt direkt `localStorage` |
| `src/lib/nearby.ts`, `country.ts` | Standort über die Plattform-Schicht |
| `src/QrScanner.tsx` | Native Variante, Web-Variante bleibt für die PWA |
| `src/lib/hardReload.ts` / Update-Prüfung (D-035) | In der App ersetzt durch App-Updates bzw. Live-Updates |
| `vite.config.ts` | Service Worker nur im Web, nicht in der App |
| `supabase/schema.sql` | Tabelle `push_tokens` und Regeln dazu (Stufe 2) |
| `App.tsx` | Vorher aufteilen (S-007), sonst wird der Umbau unübersichtlich |

## 6. Store-Anforderungen

### Konten und Kosten

| Posten | Kosten |
| --- | --- |
| Apple Developer Program | 99 USD pro Jahr |
| Google Play Console | 25 USD einmalig |
| Eigene Domain | ca. 10–30 CHF pro Jahr |
| Mac mit Xcode oder Cloud-Build (z. B. Codemagic, Ionic Appflow) | vorhandener Mac oder Gratis-/kleiner Tarif |

### Hürden

- **Apple Review, Richtlinie 4.2 („Minimum Functionality“):** Apple lehnt Apps ab, die nur eine verpackte Website sind. Stufe 1 allein ist knapp. Mit Push, Geofencing oder Widget ist die App klar mehr als eine Website.
- **Google Play, Testpflicht für neue private Konten:** Vor der Veröffentlichung braucht es einen geschlossenen Test mit mindestens **12 Testern über 14 zusammenhängende Tage**. Organisations-Konten sind davon ausgenommen, brauchen aber eine D-U-N-S-Nummer. Die MVP-Testgruppe (F-012) kann diese Rolle übernehmen.
- **Datenschutzangaben:** Apple „Privacy Nutrition Labels“ und Google „Data Safety“ ausfüllen: Standort, Name, Gerätekennung, Listeninhalte. Die Datenschutzerklärung (S-034) muss bis dahin geprüft sein.
- **Begründungstexte für Berechtigungen:** Standort („um den Supermarkt zu erkennen“), Hintergrund-Standort (streng geprüft), Kamera, Mitteilungen.
- **Anmeldung:** Die anonyme Anmeldung ist erlaubt. Kommen später Konten dazu, verlangt Apple „Mit Apple anmelden“, sobald es andere Social Logins gibt.
- **Konto-Löschung:** Apple verlangt, dass man Konto und Daten in der App löschen kann. Heute gibt es nur „Liste verlassen“ (D-036), das reicht nicht.

## 7. Tests und Veröffentlichung

1. **Intern:** Eigene Geräte, iOS über TestFlight, Android über interne Tests.
2. **Geschlossener Test:** Die MVP-Testgruppe über TestFlight und den geschlossenen Test bei Google, 14 Tage lang (Google-Pflicht, siehe oben).
3. **Veröffentlichung:** Store-Einträge in Deutsch und Englisch mit Screenshots, zuerst in der Schweiz, Deutschland und Österreich.
4. **Updates:** Änderungen an Oberfläche und Wörterbuch gehen per Live-Update ohne Review (z. B. Capgo oder Appflow, prüfen ob nötig). Native Änderungen gehen jedes Mal durch das Review.

## 8. Phasen und Aufwand

| Phase | Inhalt | Aufwand (Claude + Inhaber) |
| --- | --- | --- |
| 0. Vorbereitung | MVP-Test ausgewertet, `App.tsx` aufgeteilt (S-007), eigene Domain, Review (S-032), Datenschutz geprüft (S-034) | 2–4 Tage |
| 1. Erste App | Capacitor, Plattform-Schicht, Pfad-Links und Universal/App Links, nativer Speicher, Standort, QR, Teilen, Icons | 1–2 Wochen |
| 2. Store | Konten, Store-Texte, Datenschutzangaben, TestFlight, 14 Tage geschlossener Test bei Google | 2–3 Wochen, davon viel Warten |
| 3. Mehrwert | Push über Supabase Edge Function, danach Geofencing, Widget | 1–3 Wochen |

Laufende Kosten danach: 99 USD pro Jahr (Apple) und Domain, dazu der Backend-Tarif (F-014).

## 9. Risiken

| Risiko | Gegenmassnahme |
| --- | --- |
| Apple lehnt ab (4.2) | Stufe 2 (Push oder Geofencing) vor der ersten Einreichung einbauen |
| Google-Testpflicht verzögert den Start | Testgruppe aus dem MVP nutzen, Zeit einplanen |
| Doppelter Betrieb (Web + 2 Apps) überfordert eine Person | Ein Code dank Capacitor, Live-Updates, Tests und Lint vor jedem Build |
| Geofencing frisst Akku oder wirkt überwachend | Nur mit ausdrücklicher Zustimmung, nur aktive Listen, klar abschaltbar |
| Supabase-Gratis-Tarif reicht nicht mehr (Pausieren, keine Backups) | Spätestens zum Store-Start Supabase Pro oder Alternative (F-014, S-035) |
| Wörterbuch-Fehler fallen bei mehr Nutzern stärker auf | Muttersprachler-Prüfung (S-001) vor dem Store-Start, Community-Modul (D-027) einschalten |

## 10. Wann umsetzen? (Vorschlag zu F-006)

Die native App lohnt sich, sobald **alle** drei Punkte zutreffen:

1. Der MVP-Test zeigt, dass Gruppen die Liste im Laden wirklich nutzen.
2. Das Teilen auf dem iPhone (Links, getrennte Speicher) ist im Test eine der grössten Hürden, oder Testpersonen wünschen sich Mitteilungen bzw. die Supermarkt-Erkennung im Hintergrund.
3. Phase 0 ist erledigt: Domain, aufgeteilter Code, geprüfter Datenschutz.

## 11. Offene Punkte für den Inhaber

- Eigene Domain: welcher Name (hängt an F-005)?
- Privates Konto oder Organisations-Konto (D-U-N-S) bei Google und Apple?
- Mac vorhanden, oder Cloud-Build?
- Sollen Push-Mitteilungen und Geofencing Teil der ersten Version sein (empfohlen wegen Apple 4.2)?
