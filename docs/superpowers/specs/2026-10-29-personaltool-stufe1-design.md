# Personaltool – Stufe 1: Fundament & Governance

Stand: 29.10.2026 · Basis: bestehende App „TeamZeit“ (dieses Repo)

Markierungen: **[Entscheidung Nutzer]** = so vom Auftraggeber festgelegt. **[Eigene Entscheidung]** = vom Konzept gesetzt, darf korrigiert werden. Alles Übrige ist Beschreibung des Ist-Stands oder dem Umsetzenden überlassen (Abschnitt 9).

---

## 1. Worum es geht und warum

Die DBS-Gruppe (Immobilien: Verwaltung, Projektentwicklung, Handwerk, Kurzzeitvermietung) hat ca. 18 Mitarbeitende in zwei anstellenden GmbHs. Personalthemen laufen heute über Excel-Listen, Zurufe und Nacharbeit: Benedikt (Geschäftsführung, zuständig für Personal) trägt Stunden anderer nach und läuft Informationen hinterher.

Ziel ist ein vollwertiges Personaltool, das funktional an Personio angelehnt ist, und eine **Mitarbeiter-Governance**: Das Tool setzt Regeln durch (Fristen, Freigaben, Zuständigkeiten), Erinnerungen gehen an die Person selbst, Eskalationen an die direkte Führungskraft – nicht alles an Benedikt.

- **[Entscheidung Nutzer]** Abläufe werden neu gedacht, nicht an den bisherigen Excel-Prozessen ausgerichtet.
- **[Entscheidung Nutzer]** Rechtlich sauber: Funktionen dürfen sich an Personio orientieren; Design, Texte, Logos, Inhalte oder Code von Personio werden nicht übernommen. TeamZeit behält sein eigenes Erscheinungsbild. Personaldaten werden DSGVO-konform verarbeitet.
- **[Entscheidung Nutzer]** Ausbau in vier Stufen; dieses Dokument beschreibt nur Stufe 1. Reihenfolge: 1 Fundament & Governance → 2 Dokumente & Lebenszyklus → 3 Lohn & Fristen → 4 Entwicklung & Recruiting.

Stufe 1 legt das Fundament, auf dem alle späteren Stufen aufsetzen: wer bei welcher Firma angestellt ist, wer für wen zuständig ist, wer was sehen darf, und ein Mechanismus für Aufgaben, Erinnerungen, Freigaben und Protokoll.

## 2. Organisation (Ausgangslage)

**Gesellschaften**
- DBS Home GmbH – operative GmbH, beschäftigt alle Handwerker (~16 Personen)
- DBS Immobilienverwaltung GmbH (~4 Personen)
- DBS Home MS, DBS Grundbesitz, Fulford Investment, FulMac RE – keine eigenen Angestellten; besitzen Objekte und sind später Auftraggeber der Handwerker
- **[Entscheidung Nutzer]** Zwei Personen haben je einen echten Arbeitsvertrag bei beiden anstellenden GmbHs. Eine Person kann also mehrere Arbeitsverhältnisse haben.

**Bereiche und Zuständigkeiten [Entscheidung Nutzer]**

| Bereich | Leitung |
|---|---|
| Verwaltung | künftig Jonas Held (Team-/Bereichsleitung); bis dahin Benedikt |
| Projektentwicklung & Handwerker | Benedikt; Team Handwerker mit Toni als Vorarbeiter |
| Buchhaltung, KI, Versicherungen | Daniel |
| Akquise, Steuern | Basti (Sebastian) |
| Kurzzeitvermietung | Felix (angestellter Mitarbeiter, keine GF) |

Benedikt verantwortet zusätzlich **Personal** (HR) für die ganze Gruppe. Benedikt, Daniel und Basti sind Geschäftsführung.

**Umliegende Systeme – bleiben unverändert, werden nicht ersetzt**
- Asana: tägliche Verteilung der operativen Aufgaben an die Handwerker
- Impower: Hausverwaltung (u. a. Mahnungen auf Knopfdruck)
- Immela: Vorgangsmanagement/Ticketsystem und Kundenportal
- Buchhaltungstool: daraus schreibt Toni die Rechnungen

## 3. Ziele von Stufe 1

### 3.1 Gesellschaften und Arbeitsverhältnisse
- Gesellschaften verwalten (alle sechs anlegbar, auch ohne Angestellte).
- Person ≠ Arbeitsverhältnis: Eine Person (ein Login, ein Kalender) hat ein oder mehrere Arbeitsverhältnisse, jedes bei genau einer Gesellschaft.
- Je Arbeitsverhältnis: Vertragsart (unbefristet, befristet, Minijob, Werkstudent, Ausbildung, Praktikum), Eintritt, Austritt, Probezeitende, Befristungsende, Tätigkeit/Stellenbezeichnung, Personalnummer (je Gesellschaft, für den späteren Lohnexport).
- **Vertragskonditionen mit Gültig-ab-Datum** (Historie, die Vergangenheit bleibt unverändert): Wochenstunden, Arbeitstage als konkrete Wochentage (z. B. Mo–Do), Urlaubstage pro Jahr, Vergütungsart (Monatsgehalt/Stundenlohn), Betrag, interner Kostensatz €/h. Auswertungen der Vergangenheit verwenden die damals gültigen Werte.
- **[Eigene Entscheidung]** Arbeitstage sind feste Wochentage je Arbeitsverhältnis; daraus ergeben sich Soll, Urlaubsabzug und Erinnerungen. Flexible Tagesmodelle sind nicht Teil von Stufe 1. Bei Stundenlohn und Minijob ist ein Soll optional – ohne Soll gibt es keinen Überstundensaldo, nur Ist-Stunden.
- Endet das letzte aktive Arbeitsverhältnis einer Person, wird ihr Zugang nach dem letzten Arbeitstag gesperrt (heutiges Verhalten von `syncExits`, übertragen auf Arbeitsverhältnisse).
- **[Eigene Entscheidung]** Es gibt auch Personen ohne Arbeitsverhältnis im Tool, ausdrücklich als „Zugang ohne Arbeitsverhältnis“ gekennzeichnet – z. B. Geschäftsführer ohne erfassten Vertrag oder ein externer technischer Admin. Für sie gilt die Sperre nach Austritt nicht; Personal sieht sie in einer eigenen Liste.

### 3.2 Personalakte (Stammdaten)
- Persönliche Daten: Name, Geburtsdatum, Anschrift, private Telefonnummer, private E-Mail, Notfallkontakt.
- Lohnrelevante Daten: Steuer-ID, Sozialversicherungsnummer, Krankenkasse, Bankverbindung (IBAN, Kontoinhaber). Nur so viel wie das Lohnbüro braucht; Steuerklasse und Konfession kommen über ELStAM und werden **nicht** erfasst. **[Eigene Entscheidung]**
- **Self-Service:** Jede Person sieht ihre eigenen Daten und kann Änderungen beantragen (Anschrift, Telefon, Bank, Notfallkontakt, Name). Personal bestätigt oder lehnt ab. Bei Änderung der Bankverbindung wird die Person zusätzlich an ihre hinterlegte E-Mail benachrichtigt (Schutz vor Betrug). **[Eigene Entscheidung]**

### 3.3 Organisation
- Organisationseinheiten als Baum: Bereich → optional Team (z. B. „Projektentwicklung & Handwerker“ → Team „Handwerker“).
- Je Einheit eine Leitung und eine Vertretung, jeweils **mit Gültig-ab/-bis-Datum**. Wechsel (z. B. wenn Jonas die Verwaltung übernimmt) wird ab Stichtag wirksam; die Historie bleibt sichtbar.
- Jede Person gehört (datiert) zu genau einer Einheit. **[Eigene Entscheidung]** Die Zuordnung gilt je Person, nicht je Arbeitsverhältnis – auch Personen mit zwei Verträgen haben eine Führungskraft.
- Einheit ohne Leitung → Zuständigkeit geht an die nächsthöhere Einheit, oben an die Geschäftsführung. Nichts bleibt liegen.
- **„Geschäftsführung“ als oberste Stelle [Eigene Entscheidung]:** alle Personen mit Rolle Geschäftsführung außer der betroffenen Person; jede von ihnen kann entscheiden, die erste Entscheidung gilt. Anträge eines Geschäftsführers (z. B. Benedikts Urlaub) gehen so an die anderen beiden. Eine Eskalation „von Personal an Geschäftsführung“ geht an die Geschäftsführer außer der Person, die Personal innehat.
- **Team Handwerker [Eigene Entscheidung]:** wird als eigenes Team unter „Projektentwicklung & Handwerker“ angelegt. Wer es leitet, trägt Benedikt in der App ein. Empfehlung: Toni als Leitung – sonst landen alle Urlaubsanträge und Monatsabschlüsse der größten Gruppe wieder bei Benedikt.
- Organigramm-Ansicht (einfach, eigene Gestaltung).

### 3.4 Rollen und Rechte
Die heutige Einzelrolle (`ADMIN | GF | LEAD | EMPLOYEE`) wird ersetzt durch:

- **Fachliche Rollen**, mehrere je Person möglich, jeweils optional auf Gesellschaften eingeschränkt:
  - *Geschäftsführung* – alle Auswertungen inkl. Kosten, Gehälter, Projekte
  - *Personal* – Personalakten, Arbeitsverhältnisse, Konditionen, Ein-/Austritte, Änderungsanträge, Löschfristen
  - *Lohn* – (Recht wird in Stufe 1 angelegt, Nutzung ab Stufe 3) lohnrelevante Daten lesen, keine Notizen/Gespräche
  - *Admin* – technische Verwaltung: Konten, Rollenvergabe, Einstellungen, Erinnerungsregeln
- **Führungskraft** ist keine vergebene Rolle, sondern ergibt sich aus der Organisation: Leitung (bzw. vertretende Leitung im Vertretungsfall) sieht für die Personen ihrer Einheit und darunterliegender Einheiten Zeiten, Soll/Ist, Abwesenheiten (nur „abwesend“, ohne Grund) und gibt frei. Kein Zugriff auf Personalakte, Gehalt, Kostensätze.
- **[Eigene Entscheidung]** *Admin* sieht **keine** Personalakten- und Gehaltsinhalte, solange die Person nicht zusätzlich Personal oder Geschäftsführung ist (Need-to-know; der technische Admin ist nicht automatisch HR). Das ändert die bisherige Regel „Admins haben immer alle Rechte“.
- Beibehaltene Schutzregeln: niemand ändert die eigenen Rollen; es bleibt immer mindestens ein aktiver Admin; Rollen vergeben nur Admins.
- Die Rechte-Matrix pro Rolle bleibt wie heute unter „Rollen & Rechte“ anpassbar.
- Mitarbeitende ohne Rolle: eigene Daten, eigene Zeiten und Abwesenheiten, Teamkalender (nur „abwesend“).
- **[Eigene Entscheidung]** Zwei-Faktor-Anmeldung (TOTP-App) ist Pflicht für alle mit Rolle Geschäftsführung, Personal, Lohn oder Admin; für alle anderen optional.

### 3.5 Aufgaben und Erinnerungen
- Jede Person hat eine Liste **„Zu erledigen“** in der App. Sie ist Startseite für Führungskräfte und Rollen; für Mitarbeitende ohne offene Aufgaben bleibt „Meine Zeiten“ Startseite.
- Aufgaben entstehen automatisch aus Regeln und verschwinden automatisch, wenn der Anlass erledigt ist (z. B. Zeiten nachgetragen, Antrag entschieden).
- Jede neue Aufgabe und jede Erinnerung kommt zusätzlich per E-Mail. Täglich höchstens eine Sammel-Mail pro Person. **[Eigene Entscheidung]**
- **Regeln mit Standardfristen [Entscheidung Nutzer: so wie vorgeschlagen], einstellbar durch Admin:**

| Anlass | Erinnerung an | Eskalation |
|---|---|---|
| Arbeitstag ohne erfasste Arbeitszeit (kein Urlaub, kein Feiertag, keine Abwesenheit) | Person: Werktag 1 und 3 | Werktag 5 an Führungskraft |
| Urlaubs-/Abwesenheitsantrag offen | Freigebende Person: nach 2 Tagen | nach 4 Tagen an Vertretung bzw. nächsthöhere Leitung |
| Monat nicht abgeschlossen (siehe 3.7) | Person: letzter Arbeitstag des Monats, 3. des Folgemonats | 5. des Folgemonats an Führungskraft |
| Monatsabschluss nicht bestätigt | Führungskraft: nach 2 Tagen | nach 5 Tagen an nächsthöhere Leitung |
| Stammdaten-Änderungsantrag offen | Personal: nach 2 Tagen | nach 5 Tagen an Geschäftsführung |

- **[Eigene Entscheidung]** Regeln sind je Organisationseinheit abschaltbar; standardmäßig sind alle an, auch für die Handwerker (sie erfassen selbst, siehe 3.7).
- Erinnerungen an Personen ohne eigenen Login (siehe 3.7) gehen direkt an ihre Führungskraft.
- Personen ohne Zeiterfassung (`tracksTime = false`, z. B. Gesellschafter) bekommen keine Zeit-Erinnerungen.

### 3.6 Freigaben
- Ein gemeinsamer Freigabe-Mechanismus für: Urlaub/Abwesenheit, Monatsabschluss, Stammdaten-Änderungsantrag.
- **[Eigene Entscheidung]** Eine Freigabestufe: direkte Führungskraft (Urlaub, Monatsabschluss) bzw. Personal (Stammdaten). Für ~18 Personen reicht eine Stufe; Eskalation statt Mehrfachfreigabe.
- **Vertretung automatisch:** Ist die freigebende Person am Tag des Antrags laut Tool selbst abwesend, geht der Antrag direkt an die Vertretung; ohne Vertretung an die nächsthöhere Leitung.
- Niemand gibt eigene Anträge frei; Anträge einer Leitung gehen an die nächsthöhere Leitung.
- Krankmeldungen gelten weiterhin sofort (wie heute), Personal wird informiert; die Führungskraft sieht nur „abwesend“.
- Freigebende sehen beim Urlaubsantrag, wer im Team gleichzeitig abwesend ist (wie heute).

### 3.7 Zeiterfassung und Urlaub auf dem neuen Fundament
Die bestehenden Funktionen bleiben erhalten und werden umgebaut:
- **Soll-Stunden, Überstundensaldo und Urlaubskonto je Arbeitsverhältnis**, berechnet mit den jeweils gültigen Konditionen.
- Arbeitszeit (Beginn/Ende/Pause) wird je Arbeitsverhältnis erfasst. Hat eine Person nur ein aktives Arbeitsverhältnis, wird es automatisch gewählt; sonst wählt sie es aus (Vorauswahl: das zuletzt genutzte). Projektbuchungen hängen ebenfalls am Arbeitsverhältnis.
- **ArbZG über beide Arbeitgeber:** Höchstarbeitszeit (10 h/Tag), Pausen und Ruhezeit (11 h, § 5) werden über alle Arbeitsverhältnisse einer Person zusammen geprüft (§ 2 Abs. 1 ArbZG). Hinweise wie heute, keine harte Sperre.
- Ein Urlaubsantrag gilt für die Person; die Urlaubstage werden je Arbeitsverhältnis nach dessen Arbeitstagen berechnet und vom jeweiligen Konto abgezogen.
- **Handwerker [Entscheidung Nutzer]:** erfassen ihre Zeiten selbst kurz am Rechner; wer das nicht kann, meldet sie an Toni, der sie einträgt. Daraus folgt:
  - **Erfassung durch die Leitung:** Die Leitung einer Einheit (und Personal) kann für Personen ihrer Einheit Arbeitszeit, Projektbuchungen und Abwesenheiten erfassen und den Monat abschließen. Solche Einträge sind sichtbar als „erfasst durch …“ gekennzeichnet, stehen im Protokoll, und die Person sieht sie.
  - **[Eigene Entscheidung]** Ein eigener Login ist optional: Eine Person kann ohne E-Mail-Adresse und ohne Zugang angelegt sein; dann erfasst ihre Leitung für sie. Ein Zugang lässt sich jederzeit per Einladung nachholen.
- **Neuer Monatsabschluss:** Person schließt ihren Monat selbst ab („Monat abschließen“), Führungskraft bestätigt. Danach ist der Monat gesperrt. Korrekturen danach nur durch Personal oder Geschäftsführung, mit Pflicht-Begründung, im Protokoll. Ersetzt die heutige feste Sperre am 5. des Folgemonats (`src/lib/lock.ts`).
- Feiertage weiterhin NRW.

### 3.8 Nachvollziehbarkeit und DSGVO-Werkzeuge
- **Änderungsprotokoll:** Jede Änderung an Personen, Arbeitsverhältnissen, Konditionen, Organisation, Rollen, Freigaben und gesperrten Monaten mit Wer/Wann/Was und Vorher/Nachher. Bei besonders schützenswerten Feldern (Bank, Steuer-ID, SV-Nummer) nur „geändert“ ohne Werte.
- **[Eigene Entscheidung]** Lesezugriffe auf die lohnrelevanten Daten einer anderen Person werden ebenfalls protokolliert.
- Sichtbar für: Personal (personalbezogene Einträge), Admin (technische Einträge wie Rollen, Einstellungen). Jede Person sieht in ihrem Profil, wer ihre Daten geändert hat.
- **Datenauskunft (Art. 15 DSGVO):** Jede Person lädt ihre eigenen Daten selbst herunter (lesbare Übersicht + maschinenlesbare Datei); Personal kann das für jede Person erzeugen.
- **Löschfristen:** je Datenkategorie eine Frist ab Ereignis (meist Austritt bzw. Jahresende). Ein täglicher Lauf kündigt fällige Löschungen 30 Tage vorher als Aufgabe bei Personal an; Personal kann eine Löschsperre mit Begründung setzen (z. B. laufender Rechtsstreit). Danach wird gelöscht bzw. anonymisiert; Projektstunden bleiben anonym für Projektkosten erhalten (wie heute bei der Anonymisierung). Die Löschung selbst wird ohne Inhalte protokolliert.
- Standardfristen sind **Vorschläge, die vor Inbetriebnahme fachlich bestätigt werden müssen** und einstellbar bleiben:
  - Arbeitszeitnachweise: 2 Jahre (§ 16 Abs. 2 ArbZG); sofern lohnrelevant (Stundenlohn) wie Lohnunterlagen
  - Lohnrelevante Stammdaten und Konditionen: 6 Jahre nach Ende des Austrittsjahres
  - Übrige Personalakte: 3 Jahre nach Ende des Austrittsjahres
  - Abwesenheiten inkl. Krankheitszeiträume: wie Lohnunterlagen
  - Änderungsprotokoll: 3 Jahre
- **Krankheit nur als Zeitraum**, nie Diagnose oder Grund; kein Feld dafür.

### 3.9 Betrieb
- **[Entscheidung Nutzer]** Hosting auf Azure. **[Eigene Entscheidung]** Region Germany West Central; Wechsel von SQLite auf **Azure Database for PostgreSQL (Flexible Server)** mit automatischen Backups; kleiner zweistelliger Eurobetrag pro Monat zusätzlich.
- **[Eigene Entscheidung]** Lohnrelevante Kennungen (IBAN, Steuer-ID, SV-Nummer) werden zusätzlich in der Anwendung verschlüsselt gespeichert; der Schlüssel liegt nicht in der Datenbank.
- **[Eigene Entscheidung]** E-Mail-Versand über Azure Communication Services (Microsoft, gleiche Auftragsverarbeitung wie Azure) mit eigener Absenderadresse der Firma. Versand über eine Warteschlange mit Wiederholung, damit keine Erinnerung verloren geht.
- Tägliche Läufe (Erinnerungen, Eskalationen, Austritte, Löschfristen) laufen zeitgesteuert, unabhängig davon, ob jemand die App öffnet, und sind bei Mehrfachausführung unschädlich.

### 3.10 DSGVO-Dokumente (Entwürfe)
Als Entwürfe zur fachlichen Prüfung (kein Rechtsrat) im Repo unter `docs/datenschutz/`:
- Verzeichnis der Verarbeitungstätigkeiten (je Gesellschaft)
- Datenschutzhinweis für Beschäftigte
- Technische und organisatorische Maßnahmen (TOM)
- Vertrag zur Auftragsverarbeitung zwischen den Gesellschaften (eine betreibt das Tool, die andere lässt verarbeiten)
- Kurze dokumentierte Prüfung, ob eine Datenschutz-Folgenabschätzung nötig ist (erwartetes Ergebnis für Stufe 1: nein)
- Vertraulichkeitsverpflichtung für einen externen technischen Admin

**[Eigene Entscheidung]** Welche GmbH das Tool betreibt (Azure-Vertrag) und wer technischer Admin ist, bleibt in den Entwürfen ein Platzhalter. Vorschlag: DBS Home GmbH als Betreiberin, weil sie die meisten Beschäftigten hat. Auf den Code hat das keinen Einfluss.

## 4. Nicht-Ziele (Stufe 1)
- Kein Ersatz für Asana, Impower, Immela oder das Buchhaltungstool.
- Keine Briefe, Mahnungen oder sonstige Kommunikation nach außen; keine Rechnungsstellung. Das Tool ist rein intern, ein Corporate Design nach außen ist nicht nötig.
- Keine Lohnberechnung – auch später nicht, nur vorbereitender Export (Stufe 3).
- Keine eigene E-Signatur (Befristungen brauchen Schriftform, Kündigungen zwingend Papier).
- Keine Dokumente/Uploads, kein On-/Offboarding, keine Ausstattung (Stufe 2).
- Kein Lohnexport, kein Fristen-Wächter für Probezeit/Befristung/Unterweisungen, keine Urlaubsverfall-Hinweise (Stufe 3).
- Keine Mitarbeitergespräche, Ziele, Bewerbermanagement (Stufe 4).
- **Keine Neugestaltung der Handwerker-Zeiterfassung** (Handy-Buchung unterwegs, Buchung je Auftrag/Auftraggeber, Übergabe an die Rechnungsstellung). **[Entscheidung Nutzer: nachgelagert]** Bis dahin erfassen Handwerker selbst am Rechner oder über Toni (3.7).
- Keine Mehrsprachigkeit, keine native App.

## 5. Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)
- Benedikt bekommt weiterhin jede Erinnerung und jede Freigabe.
- Führungskräfte oder der technische Admin sehen Gehälter, Bankdaten oder Krankheitsgründe ohne Bedarf.
- Daten werden still gelöscht – oder nie gelöscht.
- Das Tool sieht aus oder klingt wie Personio.
- Eine Änderung von Konditionen oder Organisation verändert rückwirkend Kosten, Salden oder Zuständigkeiten der Vergangenheit.
- E-Mail-Flut: so viele Erinnerungen, dass sie ignoriert werden.

## 6. Rahmenbedingungen
- **DSGVO:** Jede anstellende GmbH ist Verantwortliche für die Daten ihrer Beschäftigten; es gibt kein Konzernprivileg. Zugriff nach Rolle und Gesellschaft, Datensparsamkeit, Hosting in der EU. Rechtsgrundlage ist das Arbeitsverhältnis bzw. gesetzliche Pflicht, keine Einwilligung.
- **Arbeitszeitgesetz:** Arbeitszeiten bei mehreren Arbeitgebern werden zusammengerechnet.
- **Bestehender Stack bleibt:** Next.js 15 (App Router, Server Actions), Prisma 6, Tailwind 4, eigene Anmeldung (bcrypt + JWT-Cookie), Rechteprüfung zentral über `can()`. Neue Abhängigkeiten nur, wo nötig (z. B. TOTP, E-Mail-SDK).
- **Gestaltung:** bestehende Optik (an Apple HIG orientiert, Sidebar am Desktop, Tab-Leiste am iPhone, Dark Mode), Oberfläche auf Deutsch.
- **Größe:** ~20 Nutzer; keine Skalierungsanforderungen.
- **Noch nicht live [Entscheidung Nutzer]:** TeamZeit ist bisher nirgends im Einsatz. Sauberer Neustart ohne Datenübernahme; die Migrationshistorie darf für PostgreSQL neu begonnen werden.
- **Kosten:** Personaldaten nur für Berechtigte (bestehende Regel: Kosten nur für Geschäftsführung).

## 7. Erfolgskriterien
- Benedikt trägt keine Zeiten anderer mehr nach; Erinnerungen und Eskalationen landen nachweislich bei Person bzw. direkter Führungskraft.
- Alle Beschäftigten sind mit Personalakte und Arbeitsverhältnis(sen) im Tool; die Excel-Personallisten werden nicht mehr gebraucht.
- Jede Änderung an Personaldaten ist nachvollziehbar.
- Eine Datenauskunft ist in wenigen Minuten erstellt.
- Ein Leitungswechsel (z. B. Jonas übernimmt Verwaltung) ist ein Eintrag mit Stichtag, ohne weitere Nacharbeit.
- DSGVO-Entwürfe liegen zur fachlichen Prüfung vor.

## 8. Ausblick (nicht Teil von Stufe 1, aber nicht verbauen)
- **Handwerker-Zeiterfassung (eigene spätere Stufe):** Handwerker arbeiten etwa zur Hälfte für Objekte der eigenen Gesellschaften (Renovierung, Hausmeister, Garten) und zur Hälfte für externe Auftraggeber. Aufgaben werden morgens in Asana verteilt; abends melden die Handwerker ihre Stunden an Toni, der sie ins Buchhaltungstool überträgt und daraus Rechnungen schreibt. Später: Buchung unterwegs per Handy je Auftrag, Auftraggeber (eigene Gesellschaft oder extern), Übergabe an die Rechnungsstellung und die interne Verrechnung zwischen den Gesellschaften. Darum werden in Stufe 1 schon alle Gesellschaften angelegt, auch ohne Angestellte.
- Stufe 2–4 wie in Abschnitt 1.

## 9. Dem Umsetzenden überlassen
- Genaues Datenbankschema, Benennungen, Aufteilung in Migrationen.
- Seitenaufbau und Navigation im bestehenden Stil.
- Technik der zeitgesteuerten Läufe auf Azure.
- Verschlüsselungsverfahren und Schlüsselablage.
- Text und Gestaltung der E-Mails.
- Testaufbau. **[Eigene Entscheidung]** Es wird ein Test-Runner eingeführt; mindestens die Kernregeln haben automatische Tests: Zuständigkeit/Vertretung/Eskalation, Fristberechnung der Erinnerungen, Soll/Urlaub je Arbeitsverhältnis mit Konditionshistorie, ArbZG über mehrere Arbeitsverhältnisse, Fälligkeit von Löschfristen, Rechteprüfung inkl. Gesellschafts-Einschränkung.
