# SignLocal-Unterschriftenpad für Windows

Dieses Paket richtet den **lokalen** SignLocal-Companion auf einem Windows-PC ein. Damit kann ein iPad, iPhone oder Android-Gerät im selben **Firmennetz**, privaten WLAN oder am **eigenen Laptop-Hotspot** nur als Unterschriftenpad genutzt werden. PDFs werden dabei nicht an das Mobilgerät und nicht an einen Cloud-Dienst übertragen.

## Mitarbeiter ohne Administratorrechte

Viele Mitarbeiterkonten dürfen nicht selbst installieren. Der Ablauf ist deshalb:

1. Der Mitarbeiter bleibt angemeldet und startet `SignLocal-Companion-Installation-starten.cmd`.
2. Ein Administrator bestätigt die Windows-Sicherheitsabfrage (UAC).
3. Dateien, Zertifikate, Logs und Desktop-Verknüpfungen landen im **Profil des Mitarbeiters**, nicht im Administratorkonto.
4. Danach startet der Mitarbeiter den Companion über **„SignLocal Companion starten“** ohne weitere Admin-Rechte.

Bei umgeleitetem Desktop (`\\dc\…`) legt der Administrator die Verknüpfungen oft nicht speichern. Das Paket erzeugt sie danach im Mitarbeiterkonto.

## Firmennetz und Außendienst ohne Internet

Die Erstinstallation braucht einmalig Internet (Node.js, mkcert, Abhängigkeiten). Danach reicht ein lokales Netz zwischen Laptop und Mobilgerät.

- **Büro:** Firmennetz (auch wenn Windows es als Domäne oder öffentlich einstuft).
- **Außendienst:** Laptop-Hotspot unter **Windows-Einstellungen → Netzwerk & Internet → Mobiler Hotspot**, Mobilgerät damit verbinden, dann **„SignLocal Companion starten“**.

Gäste- und Café-WLANs bleiben ungeeignet.

## Einmal einrichten

1. Lade dieses ZIP-Paket herunter und entpacke es, zum Beispiel auf dem Desktop.
2. Doppelklicke `SignLocal-Companion-Installation-starten.cmd` und lass einen Administrator die UAC-Abfrage bestätigen.
3. Das Skript installiert bei Bedarf Node.js (über winget) und lädt mkcert direkt von GitHub, falls der Store/winget ausfällt.
4. Es erstellt lokale Zertifikate nur auf diesem PC und legt Desktop-Starts an.
5. Notiere die angezeigte lokale Adresse und richte auf dem iPad/iPhone die öffentliche CA-Datei ein. Vergleiche den Fingerabdruck auf beiden Geräten, bevor du vertraust.

> **Wichtig:** Übertrage nur `Signlocal-Local-CA.pem` auf dein eigenes Mobilgerät. Der private Schlüssel `signlocal-lan-key.pem` und alle Dateien mit `key` im Namen dürfen nie kopiert, geteilt oder versendet werden.

## Danach unterschreiben

1. Doppelklicke auf dem Desktop **„SignLocal Companion starten“**.
2. Öffne die angezeigte lokale `https://…:8787`-Adresse zuerst auf dem iPad/iPhone. Sie muss ohne Zertifikatswarnung laden.
3. Öffne SignLocal auf dem Computer, wähle **„Mobilgerät sicher koppeln“**, trage die lokale Adresse ein und scanne den QR-Code.
4. Vergleiche und bestätige den sechsstelligen Code auf beiden Geräten. Erst dann kann die Unterschrift übertragen werden.

Der Start erfolgt über PowerShell, damit Benutzernamen mit Umlauten die TLS-Pfade nicht zerstören.

## Lokalen Autostart einrichten oder beenden

Nach der Installation erscheinen auf dem Desktop zwei zusätzliche Aktionen: **„SignLocal Companion Autostart aktivieren“** und **„SignLocal Companion Autostart beenden“**. Der manuelle Start bleibt weiterhin nutzbar.

## Wenn etwas nicht funktioniert

- Beide Geräte müssen im gleichen Firmennetz bzw. Hotspot sein; Client-Isolation im Router darf nicht aktiv sein.
- Nach einem Netzwerk- oder Routerwechsel den Companion erneut starten. Das Zertifikat wird bei IP-Wechsel erneuert.
- Nicht mit `http://` arbeiten und Browser-Zertifikatswarnungen niemals umgehen.
- Installationsprotokoll: `%LOCALAPPDATA%\SignLocal\logs\install.log`

Der Companion ist ein lokaler technischer Signaturablauf und keine qualifizierte elektronische Signatur.

## Testanleitung für Domain-Umgebungen (IT-Administratoren)

Diese Checkliste hilft IT-Administratoren, die Installation auf Domain-Clients zu prüfen, bevor sie an Mitarbeitende ausgerollt wird.

### Voraussetzungen für den Test

| Komponente | Anforderung |
|---|---|
| Windows-Version | Windows 10/11, in Domäne eingebunden |
| Testkonto | Domänenbenutzer **ohne** lokale Administratorrechte |
| Admin-Zugang | Separates Administratorkonto für UAC-Bestätigung |
| Netzwerk | Firmennetz mit privater IPv4-Adresse (10.x.x.x, 172.16-31.x.x, 192.168.x.x) |
| Internet | Einmalig für Node.js und mkcert-Download erforderlich |

### Testschritte

#### 1. Installation starten (als Mitarbeiter)

1. Als Domänenbenutzer (ohne Admin-Rechte) anmelden
2. ZIP-Paket auf den Desktop entpacken
3. `SignLocal-Companion-Installation-starten.cmd` doppelklicken
4. **Erwartung:** UAC-Abfrage erscheint

#### 2. UAC-Bestätigung (als Administrator)

1. Administrator-Anmeldedaten in UAC-Dialog eingeben
2. **Erwartung:** Installation läuft durch, Ausgabe zeigt lokale IP-Adresse

#### 3. Desktop-Icons prüfen (als Mitarbeiter)

Nach erfolgreicher Installation müssen **drei Verknüpfungen** auf dem Desktop des Mitarbeiters erscheinen:

| Icon | Dateiname | Funktion |
|---|---|---|
| ✅ | `SignLocal Companion starten.lnk` | Startet den Companion manuell |
| ✅ | `SignLocal Companion Autostart aktivieren.lnk` | Aktiviert Autostart bei Anmeldung |
| ✅ | `SignLocal Companion Autostart beenden.lnk` | Deaktiviert den Autostart |

**Falls Icons fehlen (z.B. bei umgeleitetem Desktop `\\dc\...`):**
- Die Skripte erstellen die Verknüpfungen nach der UAC-Erhöhung nochmals im Mitarbeiterkonto
- Prüfen Sie das Installationsprotokoll: `%LOCALAPPDATA%\SignLocal\logs\install.log`

#### 4. Companion starten (als Mitarbeiter, ohne Admin)

1. `SignLocal Companion starten` auf dem Desktop doppelklicken
2. **Erwartung:** PowerShell-Fenster öffnet sich mit Ausgabe:
   ```
   SignLocal Companion: Firmennetz, eigener Hotspot oder privates WLAN.
   Lokale Adresse: https://192.168.x.x:8787
   ```
3. **Keine UAC-Abfrage** sollte erscheinen

#### 5. Erreichbarkeit testen

1. Im Browser des gleichen PCs: `https://<angezeigte-IP>:8787` öffnen
2. **Erwartung:** Seite lädt ohne Zertifikatswarnung
3. Von anderem Gerät im gleichen Netzwerk: gleiche URL testen
4. **Erwartung:** Seite lädt (nach CA-Installation auf dem Gerät)

### Bekannte Einschränkungen in Domain-Umgebungen

| Situation | Verhalten | Lösung |
|---|---|---|
| Desktop-Umleitung auf Netzlaufwerk | Admin kann Verknüpfung evtl. nicht schreiben | Skript erstellt sie im Mitarbeiterkonto nach UAC |
| Gruppenrichtlinie blockiert PowerShell | Installation schlägt fehl | Execution Policy für signierte Skripte erlauben |
| Proxy-Server für Internet | Node.js/mkcert-Download schlägt fehl | Proxy-Einstellungen in PowerShell setzen |
| Firewall-Gruppenrichtlinie | Ports 8787/8788 blockiert | Firewallregel zentral ausrollen |

### Installationspfade zur Prüfung

| Pfad | Inhalt |
|---|---|
| `%LOCALAPPDATA%\SignLocal\Companion\` | Anwendungsdateien |
| `%LOCALAPPDATA%\SignLocal\certs\` | TLS-Zertifikate (privater Schlüssel!) |
| `%LOCALAPPDATA%\SignLocal\logs\` | Protokolldateien |
| `%LOCALAPPDATA%\SignLocal\tools\` | mkcert.exe |

### Deinstallation

1. Desktop-Verknüpfungen löschen
2. Ordner `%LOCALAPPDATA%\SignLocal\` löschen
3. Optional: Firewallregel „SignLocal LAN Companion (private WLAN)" entfernen
4. Optional: Lokale CA aus Zertifikatsspeicher entfernen (`certmgr.msc` → Vertrauenswürdige Stammzertifizierungsstellen)
