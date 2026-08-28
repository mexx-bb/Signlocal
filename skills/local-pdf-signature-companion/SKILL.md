---
name: local-pdf-signature-companion
description: "Entwickle oder prüfe vollständig lokale Browser-PDF-Signaturen mit iPad/iPhone/Android als lokalem Unterschriftenpad. Verwende diesen Skill für lokale HTTPS/WSS-Companions, QR-Pairing, CA-Einrichtung, sichere Windows-/macOS-Installer, Büro-Signaturpads oder Benutzer-Autostarts ohne Cloud-Relay."
---

# Lokale PDF-Signaturen mit Mobil-Companion

Verwende diesen Skill für sichtbare handschriftliche Signaturen, bei denen PDFs auf dem Computer oder Mobilgerät bleiben und ein iPad, iPhone oder Android-Gerät ausschließlich als lokales Signaturpad dient. Behaupte nie eine qualifizierte, kryptografische oder rechtsverbindliche elektronische Signatur, sofern kein passender Vertrauensdienst integriert ist.

## Entscheidungsweg

| Bedarf | Vorgehen |
|---|---|
| Nur auf einem Gerät unterschreiben | PDF im Browser lokal öffnen, zeichnen, positionieren und als neue PDF speichern. |
| DOCX oder Bild unterschreiben | DOCX beziehungsweise Bild nur lokal zu einer **PDF-Kopie** aufbereiten; Original nicht verändern. |
| Mobilgerät als Pad pro Vorgang | Lokalen HTTPS/WSS-Companion mit QR-Einmalpairing und beidseitigem Vergleichscode verwenden. |
| Festes Büro-Pad | Mobilseite einmalig vorbereiten, sichtbar und entsperrt lassen; neue Sitzungen lokal sichtbar anfordern und dieselbe Pad-Bindung kontrolliert wiederverwenden. |
| Companion täglich bereithalten | Bewusst aktivierbaren Benutzer-Autostart für **Windows und macOS in derselben Lieferung** einrichten. |
| App im Hintergrund auf iPad/iPhone aufwecken | Nicht als streng lokalen Browserablauf versprechen; eine sichtbare, geöffnete Mobilseite verlangen. |

## Nicht verhandelbare Sicherheitsgrenzen

- Verarbeite PDF, DOCX, Bilder, Signaturpunkte, Tresorpasswörter und Schlüssel ausschließlich lokal. Eine Teilen- oder E-Mail-Aktion darf Dateien nur nach einem bewussten Tipp an die gewählte Ziel-App übergeben.
- Betreibe den Companion getrennt vom öffentlichen Webserver. Binde ihn nur an Loopback oder die aktuelle private IPv4-Adresse, niemals pauschal an `0.0.0.0`.
- Erlaube ausschließlich eigenes privates WLAN, Laptop-/Mac-Hotspot oder privaten Reiserouter. Lehne Gäste- und öffentliche Netzwerke ab.
- Verwende `https:` und `wss:`. Prüfe Browser-Origin gegen eine exakte HTTPS-Allowlist. Akzeptiere originlose Clients höchstens in bewusst isolierten Tests.
- Erzeuge zufällige Sitzungs-IDs und Token, begrenze Zeit, Nachrichtengröße, Punktzahl und aktive Sitzungen. Halte Signaturpunkte ausschließlich im Arbeitsspeicher.
- Speichere für ein ausdrücklich dauerhaft vorbereitetes Büro-Pad höchstens dessen zufällige Pad-Kennung und Ablaufzeit lokal auf dem Companion-Computer mit restriktiven Dateirechten und im lokalen Speicher des ausgewählten Mobilgeräts. Speichere dort nie PDFs, Signaturpunkte, Tresorpasswörter oder private Schlüssel.
- Lösche die dauerhafte Pad-Bindung sichtbar auf Wunsch der nutzenden Person. Nach Ablauf, bewusster Trennung, neuem Pad oder nicht wiederherstellbarer Verbindung muss wieder ein QR- und Codevergleich erfolgen.
- Zeige QR-Code und sechsstelligen Vergleichscode. Übertrage Signaturdaten erst nach ausdrücklicher Codebestätigung auf **beiden** Geräten.
- Erzeuge eine lokale CA sowie ein Serverzertifikat mit SAN der tatsächlichen privaten Adresse. Private CA- und Server-Schlüssel bleiben ausschließlich auf dem Computer.
- Biete die CA höchstens über eine standardmäßig deaktivierte, nur lokal gebundene HTTP-Einrichtungsseite an. Zeige dort und auf dem Computer denselben SHA-256-Fingerabdruck. Leite nie dazu an, Browserwarnungen wegzuklicken oder Schutzmechanismen zu deaktivieren.

## Implementierungsworkflow

1. **Datenfluss und Geräteablauf festlegen.** Benenne Besitzer des PDFs, die lokale Companion-Adresse, zulässige Netze und den Ablauf bei Abbruch. Erkläre sichtbar, dass der Mobil-Companion nur Signaturpunkte überträgt, nie das PDF.
2. **Lokalen PDF-Workflow umsetzen.** Erzeuge eine skalierbare Signaturgrafik, ermögliche Verschieben, Skalieren, Mehrfachplatzierung und Rückgängig/Wiederherstellen. Sperre den Export, bis eine empfangene Mobil-Signatur platziert oder verworfen wurde.
3. **Companion absichern.** Starte HTTPS/WSS nur mit vorhandenen lokalen Zertifikaten. Prüfe private Hostadresse, Origin, Limits und Codefreigabe vor jedem Zustandswechsel. Fange fehlende mobile Webdateien vor dem Serverstart ab, statt bei der ersten Anfrage abzustürzen.
4. **Mobilseite gestalten.** Führe durch CA-Fingerabdruck, Codevergleich, Zeichnen und einen klaren Abschluss **„Fertig ✓“**. Entferne Pairing-Token nach dem ersten Aufruf aus sichtbarer URL und Sitzungsspeicher.
5. **Büro-Pad optional ergänzen.** Biete eine eigene Einrichtungs-QR-Verbindung. Das sichtbare, entsperrte Pad erhält bei einer neuen Sitzung eine klare Aufforderung. Für ein bewusst als dauerhaft gewähltes Gerät darf die lokale Pad-Kennung zeitlich begrenzt wiederverwendet werden. Führe nach einer kurzen Unterbrechung oder einem Companion-Neustart nur für dieselbe gültige Pad-Kennung eine automatische lokale Wiederverbindung aus; zeige eine klare Bereitschaft an und biete „Dieses Signaturpad trennen“ an.
6. **Desktop-Status verständlich machen.** Zeige nach erfolgreicher Mobilverbindung eine prominente, barrierearme Bestätigung mit Häkchen, Gerätename, lokalem Sicherheitskontext und dem nächsten Schritt zum Codevergleich.
7. **Externe Website strikt eingrenzen.** Wenn die Browser-App auf einer eigenen Domain gehostet wird, setze die Companion-Allowlist auf exakt diese HTTPS-Herkunft ohne Pfad, etwa `https://sign.example.de`. Setze keine Wildcards ein und dokumentiere die gleichwertige Konfiguration für macOS und Windows.

## Installer und lokale Autostarts

Behandle Windows und macOS als **gleichwertige gemeinsame Zielplattformen**. Liefere, dokumentiere und prüfe beide Varianten zusammen; markiere eine Funktion nicht als abgeschlossen, wenn sie nur auf einem Betriebssystem implementiert oder getestet ist. Packe beide Downloads vollständig: Companion-Server, produktive Mobil-Webdateien, Paketmanifest, Zertifikatsskript und Anleitung. Lege **nie** `node_modules`, Schlüssel, CA-Dateien, Zertifikate, Logs oder `.env`-Dateien in ein Download-ZIP. Ein Installer darf keine Dateien anonym aus einem privaten GitHub-Branch abrufen.

> Die einmalige Installation kann Internet für Node.js, mkcert und Abhängigkeiten benötigen. Die spätere Kopplung im eigenen Hotspot oder privaten WLAN funktioniert ohne Internet, sofern die Software bereits eingerichtet ist.

### Gemeinsame Plattformparität

| Bereich | Windows und macOS müssen jeweils bieten |
|---|---|
| Installation | Vollständiges lokales Paket, überprüfte produktive Companion-Dateien, verständlicher Erstinstallationshinweis. |
| Lokaler Betrieb | HTTPS/WSS, aktuelle private IP, lokale CA-Fingerabdruckprüfung, keine Cloud-Relay- oder Dokumentübertragung. |
| Bedienung | Manueller Start, sichtbarer Status, verständliche Fehlerhilfe und Möglichkeit zum sicheren Beenden. |
| Bereitschaft | Bewusstes Aktivieren und Deaktivieren eines Autostarts im angemeldeten Benutzerkonto. |
| Netzwerkwechsel | Keine Bereitstellung ohne privates Netz; Zertifikaterneuerung nur bei einer tatsächlich geänderten privaten Adresse. |
| Abnahme | Paketinhalt, Sicherheitsgrenzen, QR-/Code-Ablauf, Abbruch und realer Gerätetest für beide Plattformen separat dokumentieren. |

### macOS

- Verwende einen `LaunchAgent` im Benutzerkonto, keinen systemweiten Daemon: `~/Library/LaunchAgents/`.
- Stelle bewusste Desktop-Aktionen zum **Autostart aktivieren** und **Autostart beenden** bereit.
- Verwende `launchctl bootstrap` im aktuellen `gui/<uid>`-Kontext, `RunAtLoad`, `KeepAlive` und einen begrenzten Neustartabstand.
- Prüfe beim Start die aktuelle private Adresse. Bewahre die letzte Zertifikatsadresse lokal auf und erneuere Zertifikate nur bei echter Adressänderung.

### Windows

- Verwende eine Aufgabe beim Anmelden des aktuellen Benutzers mit begrenzten Rechten, keine unkontrollierte systemweite Aufgabe.
- Stelle sichtbare Desktop-Verknüpfungen zum Aktivieren und Beenden bereit.
- Prüfe vor jedem Start privates Netzwerk und private IPv4-Adresse. Ohne Voraussetzung darf der Hintergrundprozess nur warten und keine Kopplung anbieten.
- Protokolliere nur technische Startfehler lokal; protokolliere keine PDFs, Signaturpunkte, Tokens oder Schlüssel.

## Abnahme

Prüfe vor der Lieferung mindestens:

| Prüfung | Erwartung |
|---|---|
| Unit- und Komponententests | Signaturdaten, Codefreigabe, Abbruch, Büro-Pad und sichtbare Verbindungsbestätigung sind abgedeckt. |
| Typprüfung und Produktions-Build | Ohne Fehler; große Chunks als Leistungsrisiko dokumentieren. |
| Produktions-Audit | Keine bekannten hohen oder kritischen Befunde. |
| Companion-Rauchtests | TLS, Origin-Ablehnung, Limits, Codefreigabe, Abbruch, Einmalübertragung, Folgeanforderung, Wiederverbindung, Companion-Neustart, bewusste Pad-Trennung und Ablauf einer Pad-Bindung bestehen. |
| Installer- und Pakettests | Für **Windows und macOS**: vollständige Produktivdateien vorhanden; keine Schlüssel, Zertifikate oder Buildabhängigkeiten enthalten. |
| Echte Geräte | Für **Windows und macOS** separat: Computer plus iPad/iPhone/Android im privaten WLAN oder Hotspot: CA, Fingerabdruck, HTTPS, QR, Code, Übertragung, Abbruch und Autostart testen. |

Dokumentiere verbleibende reale Gerätetests klar. Eine technische Prüfung ersetzt keine Compliance-Zertifizierung.
