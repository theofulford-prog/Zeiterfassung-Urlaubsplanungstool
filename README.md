# TeamZeit – Zeiterfassung, Projektkosten & Urlaubsplanung

Web-App für ein Team von ca. 20 Personen. Mitarbeitende buchen ihre Stunden auf Projekte bzw. Themen (z. B. „Renovierung Musterstr. 12, WE 3" oder „Hausverwaltung") und beantragen Urlaub. Die Geschäftsführung sieht Auslastung, Abwesenheiten und Personalkosten pro Projekt.

## Funktionen

**Alle Mitarbeitenden**
- *Meine Zeiten*: Stunden pro Tag auf ein Projekt buchen (Viertelstunden), bearbeiten/löschen, Wochenübersicht mit Soll/Ist
- *Arbeitszeit*: Beginn, Ende, Pause pro Tag (gesetzliche Arbeitszeiterfassung) mit Hinweisen nach ArbZG (Pausen, max. 10 h)
- *Monatsabschluss*: Korrekturen bis zum 5. des Folgemonats, danach nur noch durch die GF
- *Mein Urlaub*: Urlaub (auch halbe Tage) beantragen, Krankheit eintragen, Urlaubskonto inkl. Resturlaub; Krankheit im Urlaub wird gutgeschrieben (§ 9 BUrlG)
- *Teamkalender*: Monatsansicht mit durchgehenden Balken oder Zeitleiste (Mitarbeitende sehen nur „abwesend", nicht den Grund)
- *Konto*: Passwort ändern (meldet andere Geräte ab); CSV-Export der eigenen Arbeitszeiten

**Geschäftsführung (Rolle „GF")** – zusätzlich
- *Übersicht*: Stunden, Personalkosten, Ø Auslastung, offene Anträge; Kostenentwicklung je Projekt (12 Monate); Auslastung je Person (Ist vs. Soll); Projektkosten im Monat inkl. Budgetverbrauch
- *Projekte*: anlegen/bearbeiten/abschließen, optionales Budget, Detailseite mit kumulierten Kosten vs. Budget
- *Mitarbeitende*: anlegen und **per Einladungslink einladen** (Person setzt ihr Passwort selbst), Wochenstunden, Urlaubstage, Resturlaub, **interner Kostensatz €/h (nur GF sichtbar)**; Detailseite je Person mit Monatsübersicht, **Überstunden-Saldo**, Urlaub, Krankheitstagen und Projektverteilung
- *Anträge*: Urlaub genehmigen/ablehnen (mit Hinweis wer gleichzeitig weg ist), Abwesenheit für eine Person eintragen
- *Hinweise*: fehlende Buchungen der letzten 10 Arbeitstage, fehlende Kostensätze, Verteilung nach Kategorie
- *Export*: CSV für Excel (Projektzeiten & Kosten, Arbeitszeiten, Abwesenheiten) pro Monat, Person oder Projekt

**Rollen & Rechte** (Details in der App unter *Rollen & Rechte*, Definition in `src/lib/permissions.ts`)
| Rolle | Darf |
|---|---|
| Administrator:in | alles, inkl. Rollen vergeben und weitere Admins ernennen |
| Geschäftsführung | alle Auswertungen inkl. Kosten, Mitarbeitende & Projekte verwalten, Urlaub genehmigen, Export |
| Team-/Projektleitung | Auslastung & Stunden sehen (ohne Kosten/Kostensätze, ohne Krankheitsgründe), Urlaub genehmigen, Projekte verwalten |
| Mitarbeiter:in | eigene Zeiten, Arbeitszeit, Urlaub; Teamkalender (nur „abwesend") |

Admins können unter *Rollen & Rechte* für jede Rolle zusätzliche Rechte anhaken oder entfernen (gespeichert in der Datenbank, „Auf Standard zurücksetzen" jederzeit möglich).

Regeln: Admins haben immer alle Rechte · Rollen vergeben nur Admins · wer Mitarbeitende verwalten darf, vergibt höchstens die eigene Stufe und bearbeitet nur Konten bis zur eigenen Stufe · niemand ändert die eigene Rolle · es bleibt immer mindestens ein aktiver Admin · von GF/Admin gesetzte Passwörter und Startpasswörter müssen beim ersten Login geändert werden.

**Einladung & Zugang**
1. GF legt die Person unter *Mitarbeitende* an (ohne Passwort).
2. Auf der Personenseite „Einladungslink erzeugen" → *Kopieren* oder *Per E-Mail senden* (öffnet das eigene Mailprogramm mit fertigem Text).
3. Die Person öffnet den Link, legt ihr Passwort fest und ist angemeldet. Links sind 7 Tage gültig und nur einmal verwendbar.
4. Passwort vergessen → GF erzeugt auf der Personenseite einen Link zum Zurücksetzen (3 Tage gültig).

**Bedienung (Apple Human Interface Guidelines)**
- Sidebar am Mac/Desktop, Tab-Leiste unten auf dem iPhone; Dark Mode folgt dem System
- Auf dem iPhone über Safari → Teilen → „Zum Home-Bildschirm" wie eine App nutzbar

**Rechenregeln**
- Personalkosten = gebuchte Stunden × Kostensatz der Person *zum Zeitpunkt der Buchung* (spätere Satzänderungen verändern die Vergangenheit nicht)
- Soll = Arbeitstage × Wochenstunden / 5, abzüglich genehmigter Abwesenheiten; Feiertage nach **NRW** (`src/lib/dates.ts`)
- Krankmeldungen gelten sofort (wenn sie spätestens in 3 Tagen beginnen), Urlaub und Sonstiges brauchen Freigabe
- Soll zählt ab dem Tag, an dem die Person angelegt wurde
- Login: nach 5 Fehlversuchen 15 Minuten Sperre

## Lokal starten

```bash
cp .env.example .env          # AUTH_SECRET mit `openssl rand -base64 32` füllen
npm install
npx prisma migrate dev        # legt prisma/dev.db an
npm run db:admins             # legt fehlende Konten aus INITIAL_ADMINS / INITIAL_GF an
npm run dev                   # http://localhost:3000
```

## Betrieb auf Azure (App Service)

Empfohlen: **Azure App Service (Linux), Plan B1** – ca. 12 €/Monat, reicht für 20 Personen gut. Die Daten liegen in einer SQLite-Datei auf dem persistenten `/home`-Speicher des App Service.

1. Im Azure-Portal: **Web-App erstellen** → Veröffentlichen: *Code*, Laufzeit: *Node 22 LTS*, Betriebssystem: *Linux*, Region: *Germany West Central*, Plan: *B1*.
2. Unter **Einstellungen → Umgebungsvariablen** setzen:
   | Name | Wert |
   |---|---|
   | `DATABASE_URL` | `file:/home/data/teamzeit.db` |
   | `AUTH_SECRET` | langer Zufallswert (`openssl rand -base64 32`) |
   | `INITIAL_ADMINS` | erste Admins als `mail:Name,mail:Name`, z. B. `fulford@dbshome.de:Benedikt Fulford,theodore.fulford@consileon.de:Theodore Fulford` |
   | `INITIAL_GF` | erste GF-Konten, gleiches Format, z. B. `kroll@dbshome.de:Daniel Kroll,machens@dbshome.de:Sebastian Machens` |
   | `INITIAL_ADMIN_PASSWORD` | das vereinbarte Startpasswort – muss beim ersten Login geändert werden |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
   | `APP_URL` | öffentliche Adresse, z. B. `https://zeit.firma.de` (für Einladungslinks) |
3. Unter **Konfiguration → Starteinstellungen → Startbefehl**: `npm run start:azure`
   (führt Datenbank-Migrationen aus, legt fehlende Admin-Konten aus `INITIAL_ADMINS` an und startet die App; vorhandene Konten werden nie verändert)
4. Code deployen, z. B. per VS Code „Azure App Service"-Erweiterung, `az webapp up` oder GitHub Actions (Bereitstellungscenter).
5. Nachdem beide Admins ihr Passwort geändert haben, `INITIAL_ADMIN_PASSWORD` aus den Umgebungsvariablen entfernen.
6. **Backups** unter *Sicherungen* aktivieren (sichert `/home` inkl. Datenbank).
7. Optional eigene Domain (z. B. `zeit.firma.de`) unter *Benutzerdefinierte Domänen* + kostenloses Zertifikat.

> Wenn die App später deutlich wächst oder mehrere Instanzen braucht: in `prisma/schema.prisma` `provider = "postgresql"` setzen und auf *Azure Database for PostgreSQL* umziehen.

## Technik

Next.js 15 (App Router, Server Actions) · Prisma + SQLite · Tailwind CSS 4 · Recharts · Login per E-Mail/Passwort (bcrypt, signiertes Session-Cookie)
