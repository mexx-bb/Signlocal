# Technische Sicherheits- und Datenschutzprüfung

**Stand:** 26. August 2026  
**Geltungsbereich:** Signlocal-Web-App, lokaler Dokumenttresor, PDF-Ausgabe, lokale Companion-Prototypen und deren Zertifikats-Einrichtung.

> Diese Prüfung ist eine technische Bestandsaufnahme und kein rechtsverbindliches Datenschutz-, Compliance- oder Zertifizierungsgutachten. Insbesondere bestätigt sie weder eine qualifizierte elektronische Signatur noch eine vollständige DSGVO-Konformität für einen konkreten organisatorischen Einsatz.

## Ergebnis im Überblick

| Bereich | Ergebnis | Einordnung |
|---|---|---|
| PDF-Verarbeitung | PDF-Import, Signaturbild-Erzeugung und PDF-Export laufen im Browser; es gibt keinen Dokument-Upload aus dem Anwendungsablauf. | Positiv |
| Tresorinhalt | PDF-Inhalte werden mit AES-256-GCM verschlüsselt; die Schlüssel werden per PBKDF2-SHA-256 mit 600.000 Iterationen aus dem lokalen Passwort abgeleitet. | Positiv |
| Freigaben | Die Buttons für E-Mail und Dateien übergeben die PDF erst nach einem bewussten Nutzer-Tipp an die native Teilen-Auswahl. | Positiv, aber bewusster Export |
| Web-App-Drittquellen | Webfonts, Produktanalyse-Skript und ungenutzte externe Karten-/Diagrammkomponenten wurden entfernt. | Verbessert |
| Produktionsauslieferung | CSP, Frame-Schutz, No-Referrer, Permissions Policy und MIME-Schutz wurden ergänzt. | Verbessert |
| LAN-Companion | TLS/WSS, zufällige 256-Bit-Tokens, Codevergleich, exakte Herkunftsprüfung, Größenlimits, Sitzungsgrenzen und Einmalübertragung sind umgesetzt. | Positiv mit Restgrenzen |
| Abhängigkeiten | Produktionsabhängigkeits-Audit nach Bereinigung: 0 kritisch, 0 hoch, 0 mittel, 0 niedrig. | Positiv |

## Tatsächliche Datenflüsse

| Datenart | Speicher / Übertragung | Schutz und Grenze |
|---|---|---|
| Geöffnetes PDF | Arbeitsspeicher des Browsers; optional verschlüsselt in IndexedDB | Kein regulärer Server-Upload. Ein direkter Download, eine E-Mail oder „In Dateien sichern“ erzeugen bewusst eine Datei außerhalb des Tresors. |
| Signaturzeichnung | Browser-Arbeitsspeicher und im exportierten PDF | Bei LAN-Kopplung nur Punktdaten, optionaler Name und lokaler Zeitstempel über TLS/WSS an den gekoppelten Computer. |
| Tresor-PDF | IndexedDB, AES-GCM-verschlüsselt | Schutz setzt ein starkes, nicht weitergegebenes Passwort und ein vertrauenswürdiges Gerät voraus. |
| LAN-Sitzung | Nur Arbeitsspeicher des Companion | 5 Minuten, QR-Token, Code auf beiden Geräten, höchstens eine übertragene Signatur pro Sitzung. |
| Öffentliche lokale CA | Opt-in-HTTP-Einrichtungsseite auf der privaten IP | Liefert nur das öffentliche CA-Zertifikat. Vor Vertrauen muss der SHA-256-Fingerabdruck außerhalb des Übertragungswegs verglichen werden. |

## Umgesetzte Härtungen

Die veröffentlichte App verzichtet nun auf externe Google-Fonts und auf das Analyse-Skript. Der Produktcode enthält keine aktive Karten- oder Diagrammkomponente mehr, die zusätzliche Drittanbieterpfade eröffnen könnte. Der Produktionsserver setzt Sicherheitsheader mit CSP, `frame-ancestors 'none'`, `object-src 'none'`, `Referrer-Policy: no-referrer`, einer restriktiven Permissions Policy und `X-Content-Type-Options: nosniff`.

Der Companion bindet sich nur an eine private oder Loopback-IPv4-Adresse, statt alle Netzwerkadapter zu öffnen. Browser-Anfragen ohne `Origin` werden im Normalbetrieb abgelehnt. Für den Companion wird eine exakte HTTPS-Herkunft geprüft, WebSocket-Kompression ist deaktiviert, die Nutzlast ist auf 64 KB begrenzt, die Zahl paralleler Sitzungen auf zehn und die Zahl übertragener Punkte auf 2.000. Jede Sitzung akzeptiert nach beidseitigem Vergleichscode genau eine Signatur.

## Verbleibende Grenzen und Maßnahmen

| Priorität | Grenze | Bedeutung | Empfohlene Maßnahme |
|---|---|---|---|
| Hoch | Die CA-Ersteinrichtung nutzt bewusst lokales HTTP, weil das iPad der lokalen CA davor noch nicht vertrauen kann. | In einem kompromittierten oder fremden WLAN könnte ein Angreifer die öffentliche CA austauschen, falls der Fingerabdruckvergleich übersprungen wird. | Nur im eigenen privaten WLAN aktivieren, Fingerabdruck am Computer und iPad vergleichen, Dienst danach beenden. Kein öffentliches oder Gäste-WLAN verwenden. |
| Hoch | Ein kompromittiertes oder entsperrtes Endgerät kann Klartext-PDFs lesen oder exportieren. | Browser-Verschlüsselung schützt nicht gegen Malware, Geräteübernahme oder unberechtigte Nutzung einer aktiven Sitzung. | Betriebssystem aktuell halten, Gerätesperre und vollständige Festplattenverschlüsselung aktivieren, Gerät nicht unbeaufsichtigt entsperrt lassen. |
| Mittel | Dateiname, Erstellzeit und Größe eines Tresordokuments liegen derzeit als technische Metadaten unverschlüsselt in IndexedDB und im verschlüsselten Backup-Container vor. | Der PDF-Inhalt bleibt geschützt, aber lokale Dritte mit Browserprofilzugriff können Metadaten sehen. | Metadaten in einer nächsten Sicherheitsiteration zusammen mit dem PDF-Inhalt verschlüsseln; bestehende Backups versioniert migrieren. |
| Mittel | Die E-Mail- und Dateien-Aktionen sind absichtliche Datenfreigaben an die vom Nutzer gewählte App bzw. deren Anbieter. | Nach dem Teilen gelten deren Speicher-, Empfänger- und Datenschutzregeln. | Vor dem Versenden Empfänger, Anhang und E-Mail-Konto prüfen; sensible PDFs bevorzugt im Tresor oder in einem kontrollierten Dienst ablegen. |
| Mittel | Der Companion wurde automatisiert und mit temporären TLS-Zertifikaten geprüft, nicht jedoch mit echten iPad/iPhone/Android-Geräten im privaten WLAN. | Zertifikatsvertrauen, Firewall, Private Network Access und reale Browserunterschiede bleiben offen. | Geräteabnahme in einem privaten WLAN mit Mac/Windows und iPad/iPhone/Android dokumentieren. |
| Niedrig | Eine handschriftliche Bildsignatur mit optionalem Namen/Zeitstempel ist keine kryptografische oder qualifizierte elektronische Signatur. | Herkunft und Integrität des finalen PDFs werden rechtlich nicht in dem Maß nachgewiesen wie bei einer qualifizierten Signatur. | Bei regulatorisch verlangter Signatur eine geeignete Signaturplattform bzw. ein qualifiziertes Vertrauensdiensteverfahren einsetzen. |

## Prüfnachweise

Die Prüfung umfasste Datenflussanalyse, Quellcodeprüfung, TLS-/WebSocket-Rauchtests, Tests für CA-Download und Zertifikatsskript, TypeScript-Prüfung, Produktions-Build und einen Produktionsabhängigkeits-Audit. Der Audit-Endstand enthielt keine bekannten Produktionsschwachstellen nach dessen Datenbasis.

## Referenzen

[1] [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)  
[2] [OWASP: WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)  
[3] [OWASP: Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)  
[4] [EDPB: Secure personal data](https://www.edpb.europa.eu/sme/be-compliant/secure-personal-data_en)
