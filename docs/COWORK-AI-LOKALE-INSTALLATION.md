# Cowork-AI: lokale Signlocal-Installation und IP-Anzeige

Diese Anleitung ist für eine Cowork-AI bestimmt, die eine **bewusst freigegebene** lokale Signlocal-Installation auf einem Windows- oder macOS-Rechner unterstützt. Der Companion verbindet den Rechner und ein iPad, iPhone oder Android-Gerät ausschließlich im selben privaten Netzwerk. Das Mobilgerät ist nur ein Unterschriftenpad; PDF-Dateien und private Schlüssel verlassen den Rechner nicht.

> **Öffentliche Signlocal-Website:** `https://mexx-bb.github.io/Signlocal/`
> **Zugelassene Browser-Herkunft für den Companion:** `https://mexx-bb.github.io`
> Der Unterpfad `/Signlocal/` gehört **nicht** in die Herkunftsangabe, weil Browser-Herkünfte nur aus Schema, Host und optionalem Port bestehen.

## Bindende Sicherheitsregeln für die Cowork-AI

| Regel | Pflichtverhalten |
|---|---|
| Netzwerk | Nur im eigenen Büro-WLAN, eigenen Laptop-Hotspot oder privaten Reiserouter arbeiten. Gäste-, Hotel-, Flughafen- und öffentliche WLANs ablehnen. |
| Daten | Keine PDF, DOCX, Bilder, Signaturpunkte, Tresorpasswörter oder Schlüssel hochladen, versenden oder in Tickets kopieren. |
| Schlüssel | `rootCA-key.pem`, `signlocal-lan-key.pem` und andere private Schlüssel niemals anzeigen, exportieren oder übertragen. |
| iPad/iPhone | Die Vertrauensfreigabe in den iOS-Einstellungen ist eine bewusste Handlung der Person am Gerät; sie darf nicht umgangen werden. |
| Zertifikatswarnungen | Niemals zum Wegklicken, Ignorieren oder Deaktivieren von Sicherheitswarnungen anleiten. Bei einer Warnung stoppen und IP, CA und Netzwerk prüfen. |
| Drittzugriffe | Keine unbekannten OAuth-, MCP- oder Datenbankfreigaben akzeptieren. Signlocal benötigt keine externe Datenbank. |

## 1. Vorprüfung und sichtbare IP-Adresse

Die Cowork-AI muss zuerst eine private IPv4-Adresse des Rechners ermitteln und sie **sichtbar ausgeben**. Gültig sind ausschließlich `10.x.x.x`, `172.16.x.x` bis `172.31.x.x` sowie `192.168.x.x`. Ist keine solche Adresse vorhanden, muss sie anhalten und erklären: „Bitte zuerst den eigenen Hotspot, das Büro-WLAN oder den privaten Reiserouter verbinden.“

| Plattform | Zulässiger Prüfweg | Erwartete Anzeige |
|---|---|---|
| macOS | `ipconfig getifaddr en0` und bei Bedarf `ipconfig getifaddr en1` | Zum Beispiel `192.168.1.42` |
| Windows PowerShell | `Get-NetIPAddress -AddressFamily IPv4` | Eine private IPv4-Adresse, nicht `127.0.0.1` |
| Beide Installer | Der Installer und der Companion erkennen die private Adresse zusätzlich selbst | `Signlocal LAN Companion läuft nur lokal unter https://<IP>:8787` |

Die Cowork-AI soll die Ausgabe in dieser Form zeigen:

```text
Verwendete lokale Signlocal-Adresse: https://<PRIVATE-IP>:8787
Lokale CA-Einrichtung:              http://<PRIVATE-IP>:8788/ca-setup.html
Öffentliche PDF-App:                https://mexx-bb.github.io/Signlocal/
```

`<PRIVATE-IP>` wird durch die tatsächlich gefundene Adresse ersetzt. Die Adresse darf nicht erfunden, geraten oder aus einem alten Netzwerk wiederverwendet werden.

## 2. Windows-Installation

1. Die Cowork-AI öffnet ausschließlich die öffentliche Signlocal-Seite und lädt dort das aktuelle **Windows-Companion-ZIP** herunter.
2. Sie entpackt das ZIP in einen benutzerkontrollierten Ordner, beispielsweise `Downloads\SignLocal-Windows-Companion-Installation`.
3. Sie erklärt vor dem Start, dass Windows für Firewallregel und lokales Zertifikat eine sichtbare Administratorbestätigung anfordern kann. Diese Bestätigung darf nur durch eine berechtigte Person erfolgen.
4. Die Person startet `Install-SignLocal-Companion.ps1` über den vorgesehenen Windows-Startweg. Die Cowork-AI setzt keine Sicherheitsrichtlinien global herab und umgeht keine SmartScreen- oder UAC-Warnung.
5. Der Installer verwendet standardmäßig `https://mexx-bb.github.io` als erlaubte Website-Herkunft. Eine andere Website darf nur bei einer bewusst gewählten eigenen HTTPS-Domain eingetragen werden.
6. Danach startet die Person die Desktop-Verknüpfung **„SignLocal Companion starten“**. Die Cowork-AI liest die angezeigte lokale HTTPS-Adresse und gibt sie wie in Abschnitt 1 aus.

## 3. macOS-Installation

1. Die Cowork-AI lädt von der öffentlichen Signlocal-Seite das aktuelle **macOS-Companion-ZIP** und entpackt es.
2. Sie weist die Person auf den vorgesehenen bewussten Finder-Schritt hin, falls macOS die Datei anzeigt: Die konkrete Datei `Install-SignLocal-Companion.command` im Finder prüfen, mit Control-Klick öffnen und nur die geprüfte Datei freigeben. Gatekeeper und andere macOS-Schutzfunktionen dürfen nicht deaktiviert werden.
3. Der Installer kann Homebrew, Node.js und `mkcert` für die lokale Einrichtung benötigen. Er verwendet standardmäßig `https://mexx-bb.github.io` als erlaubte Website-Herkunft.
4. Anschließend startet die Person **„SignLocal Companion starten.command“** auf dem Schreibtisch. Die Cowork-AI übernimmt die tatsächliche lokale HTTPS-Adresse aus der Terminalausgabe und zeigt sie wie in Abschnitt 1 an.

## 4. iPad, iPhone oder Android als Unterschriftenpad verbinden

Das Tablet oder Telefon muss mit **demselben privaten Netzwerk** wie der Rechner verbunden sein. Das Gerät darf für die lokale Signaturseite sichtbar und entsperrt bleiben; iOS und Android können diese Seite nicht verlässlich und sicher aus dem Hintergrund öffnen.

### iPad oder iPhone: einmalige lokale CA-Einrichtung

1. Die Person öffnet auf dem iPad/iPhone ausschließlich `http://<PRIVATE-IP>:8788/ca-setup.html`.
2. Sie vergleicht den dort dargestellten SHA-256-Fingerabdruck mit dem vom Companion auf dem Rechner gezeigten Wert.
3. Nur wenn beide Werte identisch sind, lädt sie die **öffentliche** Signlocal-CA herunter.
4. Die Person installiert das Profil unter **Einstellungen → Allgemein → VPN & Geräteverwaltung**.
5. Danach aktiviert sie ausschließlich für die zuvor geprüfte Signlocal-CA das volle Vertrauen unter **Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen**.
6. Sie öffnet `https://<PRIVATE-IP>:8787` in Safari. Die Seite muss ohne Zertifikatswarnung laden. Andernfalls nicht fortfahren.

> Apple verlangt für manuell installierte Zertifikate eine getrennte Vertrauensfreigabe für SSL/TLS. [1]

### Android

Die Cowork-AI erklärt, dass der genaue Installationsweg für eine lokale CA vom Hersteller und der Android-Version abhängt. Sie darf keine Schutzmechanismen deaktivieren. Erst wenn der Browser `https://<PRIVATE-IP>:8787` ohne Sicherheitswarnung öffnet, darf die QR-Kopplung beginnen.

### Erste Kopplung und dauerhafter Pad-Betrieb

1. Auf dem Rechner wird die öffentliche Signlocal-App unter `https://mexx-bb.github.io/Signlocal/` geöffnet.
2. Die Cowork-AI trägt die angezeigte lokale Adresse `https://<PRIVATE-IP>:8787` ein oder hilft der Person, sie einzutragen.
3. Beim ersten Mal wird **„Büro-Signaturpad vorbereiten“** gewählt und der QR-Code auf dem Mobilgerät gescannt.
4. Beide Geräte vergleichen und bestätigen einmalig den sechsstelligen Code.
5. Das Mobilgerät bleibt danach als Büro-Pad bereit. Weitere Signaturanfragen erscheinen direkt auf dem sichtbaren Pad, ohne einen neuen QR-Code oder neuen Codevergleich pro Unterschrift.
6. Die Person kann das Pad auf dem Mobilgerät jederzeit bewusst über **„Dieses Signaturpad trennen“** lösen. Bei Ablauf, Trennung, Gerätewechsel oder Sicherheitsverlust ist wieder eine neue Kopplung mit Codevergleich erforderlich.

## 5. Fehlergrenzen und Stoppregeln

| Beobachtung | Erlaubte sichere Maßnahme | Nicht zulässig |
|---|---|---|
| Keine private IP | Eigenes WLAN/Hotspot einschalten und die IP neu ermitteln | Öffentliche oder alte IP verwenden |
| Safari-Zertifikatswarnung | CA-Fingerabdruck, Profil, volles Vertrauen und aktuelle lokale IP prüfen | Warnung wegklicken oder Vertrauen allgemein abschalten |
| Website kann keine Sitzung starten | Sicherstellen, dass der aktuelle Installer die Standardherkunft `https://mexx-bb.github.io` verwendet | Einen fremden Origin pauschal freigeben |
| Mobilgerät nicht erreichbar | Gleiches privates WLAN, sichtbares/entsperrtes Pad und lokale Firewall prüfen | Cloud-Relay, Portfreigabe ins Internet oder öffentliches WLAN einsetzen |
| Lokale IP hat gewechselt | Companion neu starten; er erzeugt das lokale Zertifikat für die neue Adresse | Alte Zertifikate oder URLs weiterverwenden |

## Abschlussmeldung der Cowork-AI

Nach einer erfolgreichen Installation soll die Cowork-AI nur diese sachliche Meldung ausgeben:

```text
Signlocal Companion ist lokal bereit.
Rechneradresse: https://<PRIVATE-IP>:8787
CA-Einrichtung:  http://<PRIVATE-IP>:8788/ca-setup.html
PDF-App:         https://mexx-bb.github.io/Signlocal/
Netzwerk:        privat und lokal; keine PDF- oder Signaturübertragung nach außen.
```

## Referenzen

[1]: https://support.apple.com/de-de/102390 "Apple Support: Manuell installierten Zertifikaten vertrauen"
