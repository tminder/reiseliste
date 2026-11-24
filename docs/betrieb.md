# Betrieb und Störungen

Stand: 2026-11-24 · Kurzanleitung für den Inhaber: wo was läuft, was bei welcher Störung zu tun ist. Ohne Claude nutzbar.

## Wo läuft was

| Teil | Wo | Zugang |
| --- | --- | --- |
| App und Website | GitHub Pages, Repo `tminder/reiseliste`, Domain **cartontheroad.app** | GitHub-Konto des Inhabers |
| Domain und DNS | Hostfactory (A/AAAA-Einträge auf GitHub Pages, `www` als CNAME auf `tminder.github.io`, D-006) | Hostfactory-Konto |
| Datenbank, Anmeldung, Echtzeit | Supabase, Projekt `evglhiivucccditqtjkm` (Gratis-Tarif) | Supabase-Konto, Dashboard: https://supabase.com/dashboard/project/evglhiivucccditqtjkm |
| Läden | Öffentliche Overpass-Server (overpass-api.de, Private.coffee) | keiner nötig |
| Land | Nominatim (OpenStreetMap) | keiner nötig |
| Fotos | Open Food Facts | keiner nötig |
| Wechselkurse | Frankfurter (api.frankfurter.dev) | keiner nötig |

**Geheimnisse** stehen nur in GitHub (Settings → Secrets and variables → Actions), nie im Repo und nie im Chat: `SUPABASE_SECRET_KEY` (Exporte), später `SUPABASE_DB_URL` und `BACKUP_PASSPHRASE` (Sicherung, D-050). Der Publishable Key in `.env.production` ist öffentlich und darf dort stehen.

**Automatische Abläufe** (GitHub → Actions):

- „Deploy to GitHub Pages“: bei jedem Push auf `main`. Lint, Tests, Build, Veröffentlichung.
- „Supabase wach halten“: täglich. Hält das Gratis-Projekt aktiv und prüft, ob `supabase/schema.sql` ausgeführt ist (D-107).
- „Wörterbuch-Feedback exportieren“, „Korrekturvorschläge exportieren“: von Hand.
- „Datenbank sichern“: vorbereitet, noch aus (D-050).

## Störungen

### Die App lädt nicht oder zeigt eine alte Version

1. https://www.githubstatus.com prüfen (GitHub Pages gestört?).
2. GitHub → Actions → letzter Lauf „Deploy to GitHub Pages“: rot? Fehlermeldung lesen. Meist ein Test, der nach einer Änderung scheitert. Dann den letzten Commit rückgängig machen (auf GitHub beim Commit „Revert“) oder Claude fragen.
3. Domain: `cartontheroad.app` erreichbar, aber `tminder.github.io/reiseliste` nicht (oder umgekehrt)? DNS bei Hostfactory prüfen; GitHub → Settings → Pages: „Custom domain“ muss `cartontheroad.app` sein, „Enforce HTTPS“ an.
4. Auf dem Handy hängt eine alte Version: App schliessen und neu öffnen; sie lädt neue Versionen selbst (D-016).

### Listen werden nicht geteilt („nur auf diesem Gerät“), Änderungen kommen nicht an

1. Supabase-Dashboard öffnen. Steht dort „Project paused“: **Resume project** klicken. Passiert, wenn das Projekt 7 Tage keine Aktivität hatte; der Workflow „Supabase wach halten“ verhindert das normalerweise. Prüfen, ob er zuletzt grün war.
2. https://status.supabase.com prüfen.
3. Mail von GitHub „Supabase wach halten failed“ mit „Datenbank nicht auf dem Stand“: Skript ausführen (nächster Abschnitt).
4. Änderungen auf dem Handy gehen nicht verloren: Sie warten in der Warteschlange und werden gesendet, sobald Supabase wieder erreichbar ist.

### Datenbank-Skript ausführen

Nötig nach Änderungen an `supabase/schema.sql` (Claude sagt Bescheid, und der Workflow „Supabase wach halten“ meldet es per Mail).

1. https://github.com/tminder/reiseliste/raw/main/supabase/schema.sql öffnen, alles kopieren.
2. https://supabase.com/dashboard/project/evglhiivucccditqtjkm/sql/new öffnen, einfügen, **Run**.
3. Das Skript darf beliebig oft laufen, Daten bleiben erhalten.

### Schlüssel ungültig oder kompromittiert

- Publishable Key (öffentlich): Supabase → Project Settings → API Keys → neuen erzeugen, in `.env.production` eintragen, pushen.
- Secret Key: in Supabase neu erzeugen, in GitHub unter Secrets `SUPABASE_SECRET_KEY` ersetzen. Nie in Chat, Mail oder Repo.

### Ladensuche, Fotos, Land oder Kurse gehen nicht

Das sind öffentliche Gratis-Dienste; die App zeigt dann „ausgelastet“ und versucht es selbst wieder (D-086, D-094). Nichts zu tun, ausser es dauert Tage:

- Läden: Status unter https://overpass-api.de/api/status. Fällt ein Server dauerhaft weg, Claude bitten, ihn in `src/lib/nearby.ts` zu ersetzen (nur EU-Betreiber, Datenschutzerklärung anpassen).
- Fotos: Bei einer Sperre der App (viele Fehler 429/503 über Tage) Open Food Facts per Mail kontaktieren.
- Sperren vermeiden: Die Regeln der Dienste regelmässig prüfen (R-002).

### Fehlermeldungen der App ansehen

Die App schreibt Fehler anonym in die Tabelle `client_errors` (D-051, 30 Tage). Supabase → Table Editor → `client_errors_summary` zeigt sie gruppiert.

## Zugänge sichern

- GitHub, Supabase und Hostfactory mit Zwei-Faktor-Anmeldung und im Passwort-Manager.
- Domain-Verlängerung bei Hostfactory im Auge behalten (läuft sie aus, ist die App unter der Domain weg).
