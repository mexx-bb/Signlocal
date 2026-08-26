# Signlocal LAN-Begleit-App – ungetesteter Prototyp

Dieser Ordner enthält einen **ungetesteten technischen Prototypen** für eine reine WLAN-Kopplung zwischen einem Windows- oder macOS-Computer und einem iPad, iPhone oder Android-Gerät. Die Begleit-App stellt einen lokalen HTTPS-Dienst bereit. Die geöffnete Signlocal-PDF-App erzeugt den QR-Code, das Mobilgerät zeichnet die Unterschrift, und die Signaturpunkte werden nur über die zeitlich begrenzte lokale TLS-Sitzung an die PDF-App weitergereicht.

> **Wichtige Grenze:** Die Übernahme einer empfangenen Signatur in die bestehende PDF-Ansicht ist vorbereitet, wurde aber noch nicht mit einem echten Mobilgerät und einem realen PDF im privaten WLAN geprüft.

## Sicherheitsmodell

| Schutzmaßnahme | Verhalten im Prototyp |
|---|---|
| Netzwerkgrenze | Der Dienst bindet an das lokale Netzwerk des Computers. Es gibt keine Cloud-API und keine externe Datenübertragung. |
| Transportverschlüsselung | Der Dienst startet nur mit einem lokalen TLS-Zertifikat und privatem Schlüssel. Ohne diese Dateien beendet er sich. |
| Pairing | QR-Code enthält eine kryptographisch zufällige Einmal-Sitzung. Die Sitzung läuft nach fünf Minuten ab. |
| Gerätebestätigung | Computer und Mobilgerät zeigen denselben sechsstelligen Vergleichscode. Beide müssen ihn ausdrücklich bestätigen; erst danach wird die Unterschrift freigegeben. |
| Datenminimierung | Das PDF wird nie an das Mobilgerät übertragen. Der Prototyp hält Signaturpunkte nur im Arbeitsspeicher der Sitzung und schreibt sie nicht auf die Festplatte. |
| Herkunftsschutz | Die Begleit-App akzeptiert Sitzungsanfragen aus der konfigurierten HTTPS-Herkunft der Signlocal-PDF-App. Andere Browser-Herkünfte werden abgewiesen. |
| Sitzungsende und Abbruch | Die Desktop-Seite kann die Sitzung beenden; abgelaufene Sitzungen schließen automatisch. Ein Abbruch wird an die Gegenseite gemeldet und kann mit derselben QR-Sitzung erneut verbunden werden. |

## Vor dem ersten privaten WLAN-Test

1. **Nicht in einem öffentlichen WLAN testen.** Computer und Mobilgerät müssen im gleichen privaten WLAN ohne Client-Isolation sein.
2. Auf dem Computer muss eine aktuelle Node.js-Laufzeit vorhanden sein. Im Prototyp-Ordner `pnpm install` ausführen.
3. Die Zertifikatsanleitung unten vollständig durchführen. Das Serverzertifikat muss die tatsächlich verwendete lokale IP-Adresse als **Subject Alternative Name (SAN)** enthalten.
4. Die öffentliche lokale CA einmalig auf dem iPad, iPhone oder Android-Gerät als vertrauenswürdig einrichten. Ohne diese Vertrauensfreigabe ist eine strenge Browser-TLS-Verbindung im lokalen Netz nicht zuverlässig nutzbar.
5. Den Dienst nur im **privaten Netzwerkprofil** der Betriebssystem-Firewall freigeben.

> **Begriffe:** Die lokale **CA** stellt das Serverzertifikat aus. Der Companion erhält ausschließlich das Serverzertifikat und seinen Schlüssel. Nur die **öffentliche** CA-Datei `rootCA.pem` wird einmalig auf bekannte Mobilgeräte übertragen. `rootCA-key.pem` und `signlocal-lan-key.pem` verbleiben ausschließlich auf dem Computer.

## Zertifikate lokal mit mkcert erstellen

Diese Anleitung verwendet [mkcert][2], ein Werkzeug zur Erstellung einer lokalen CA und lokaler Entwicklungszertifikate. Es ersetzt keine öffentliche Zertifizierungsstelle und darf **nie** für einen öffentlich erreichbaren Dienst eingesetzt werden. Für diesen Companion ist es geeignet, weil er nur im privaten WLAN laufen soll.

### Schnellstart für macOS und andere Bash-Umgebungen

Das Skript [`scripts/prepare-local-cert.sh`](./scripts/prepare-local-cert.sh) automatisiert die lokale CA-Initialisierung, die Suche nach einer privaten WLAN-Adresse, die Erstellung eines IP-SAN-Serverzertifikats und den Export der **öffentlichen** iPad-CA. Es schreibt Zertifikate nach `~/signlocal-lan/certs` außerhalb des Projekts, verweigert das stille Überschreiben bestehender Schlüssel und gibt den passenden Companion-Startbefehl aus.

```bash
cd /pfad/zu/Signlocal/mobile/companion
chmod +x scripts/prepare-local-cert.sh
./scripts/prepare-local-cert.sh
```

Falls die WLAN-Adresse nicht automatisch erkannt wird, kann sie bewusst übergeben werden. Die Adresse muss diejenige sein, die das iPad später aufruft:

```bash
./scripts/prepare-local-cert.sh --host 192.168.178.25
```

`--force` ersetzt vorhandene Companion-Zertifikate bewusst. `--origin` erlaubt nur eine exakte HTTPS-Herkunft ohne Pfad, falls die Signlocal-PDF-App unter einer eigenen Adresse geöffnet wird. Mit `--help` werden alle Optionen angezeigt.

### Lokale CA-Downloadseite für das iPad

Der Schnellstart aktiviert zusätzlich eine **lokale, zeitlich manuell steuerbare Einrichtungsseite** unter `http://<lokale-adresse>:8788/ca-setup.html`. Sie existiert nur, wenn `SIGNLOCAL_CA_DOWNLOAD=1` und `SIGNLOCAL_CA_FILE` gesetzt sind. Diese Seite liefert ausschließlich die öffentliche Datei `Signlocal-Local-CA.pem` und zeigt ihren SHA-256-Fingerabdruck. Der Companion gibt den gleichen Wert im Computer-Terminal und auf seiner lokalen Desktop-Seite aus.

> Die Einrichtungsseite verwendet bewusst **HTTP**, weil das iPad der lokalen CA vor der Installation noch nicht vertrauen kann. Sie stellt niemals einen privaten Schlüssel, PDF-Inhalte, Sitzungsdaten oder Signaturen bereit. Vergleiche den angezeigten Fingerabdruck auf iPad und Computer vor der Vertrauensfreigabe. Nach der Ersteinrichtung wird die Signaturkopplung ausschließlich über HTTPS verwendet. Beende den Companion nach der Einrichtung, wenn er nicht benötigt wird.

Auf der lokalen Desktop-Seite des Companions erscheint bei aktivierter Einrichtungsseite ein separater QR-Code. Dieser QR-Code dient nur zum Öffnen des lokalen CA-Downloads; der QR-Code für die spätere Signaturkopplung bleibt davon getrennt. Die Einrichtungsseite enthält zusätzlich einen großen QR-Code, der direkt auf die öffentliche CA-Datei zeigt. Damit kann ein weiteres eigenes iPad oder iPhone den Zertifikatsdownload unmittelbar mit der Kamera öffnen.

Der isolierte technische Rauchtest `scripts/test-ca-download.sh` prüft die Auslieferung der öffentlichen CA-Datei, die Einrichtungsseite und den angezeigten Fingerabdruck mit temporären Testzertifikaten. `scripts/test-signature-strokes.mjs` prüft zusätzlich, dass ein einzelner Signaturpunkt als eigener Zeichenstrich durch die lokale TLS-Sitzung an den Computer weitergereicht wird. Beide ersetzen keinen Test auf einem echten iPad im privaten WLAN.

### 1. Die richtige lokale Adresse festlegen

Der Companion verwendet standardmäßig die erste erkannte private IPv4-Adresse und Port `8787`. Ermittle die Adresse vor jeder Erstinstallation und verwende genau diese Adresse sowohl beim Erzeugen des Zertifikats als auch beim Start. Eine Adresse wie `192.168.178.25` ist nur ein Beispiel.

| Betriebssystem | Befehl | Erwartetes Ergebnis |
|---|---|---|
| macOS | `ipconfig getifaddr en0` | Private WLAN-Adresse, zum Beispiel `192.168.178.25` |
| Windows PowerShell | `Get-NetIPAddress -AddressFamily IPv4` | Die private WLAN-Adresse aus dem Bereich `10.x.x.x`, `172.16–31.x.x` oder `192.168.x.x` |

> **Wichtig:** Ein Zertifikat für `localhost` funktioniert nicht auf dem iPad. Wenn der Computer nach einem WLAN-Wechsel eine andere IP-Adresse hat, muss ein neues Serverzertifikat für die neue Adresse erzeugt und der Companion mit dieser Adresse neu gestartet werden. Eine DHCP-Reservierung im privaten Router verhindert solche Wechsel.

### 2. macOS: lokale CA und Serverzertifikat erstellen

Installiere zuerst Homebrew, falls es noch nicht vorhanden ist, und anschließend `mkcert`:

```bash
brew install mkcert
mkcert -install
```

`mkcert -install` erzeugt eine lokale CA und verankert sie im macOS-Systemspeicher. Erstelle anschließend einen geschützten Ordner außerhalb des Signlocal-Projekts, ermittle die WLAN-Adresse und stelle ein Serverzertifikat genau für diese Adresse aus:

```bash
mkdir -p "$HOME/signlocal-lan/certs"
chmod 700 "$HOME/signlocal-lan/certs"

LOCAL_IP="$(ipconfig getifaddr en0)"
test -n "$LOCAL_IP" || { echo "Keine WLAN-Adresse auf en0 gefunden."; exit 1; }
printf 'Lokale Companion-Adresse: %s\n' "$LOCAL_IP"

mkcert \
  -cert-file "$HOME/signlocal-lan/certs/signlocal-lan-cert.pem" \
  -key-file "$HOME/signlocal-lan/certs/signlocal-lan-key.pem" \
  "$LOCAL_IP"

chmod 600 "$HOME/signlocal-lan/certs/signlocal-lan-key.pem"
mkcert -CAROOT
```

Der letzte Befehl zeigt den Ordner der lokalen CA. Daraus wird später **nur** `rootCA.pem` auf das iPad übertragen. Teile niemals `rootCA-key.pem`.

### 3. Windows: lokale CA und Serverzertifikat erstellen

Öffne **PowerShell als Administrator**. Installiere `mkcert` über einen vorhandenen Paketmanager. Die offiziellen Installationswege sind Chocolatey oder Scoop [2]:

```powershell
# Variante A: Chocolatey
choco install mkcert

# Variante B: Scoop
scoop bucket add extras
scoop install mkcert
```

Erstelle danach die lokale CA, einen privaten Ordner außerhalb des Signlocal-Projekts und das Zertifikat. Der Befehl wählt die erste passende private IPv4-Adresse aus; kontrolliere die ausgegebene Adresse vor dem Fortfahren.

```powershell
mkcert -install

$CertDir = Join-Path $env:USERPROFILE "signlocal-lan\certs"
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

$LocalIp = (
  Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' } |
  Select-Object -First 1 -ExpandProperty IPAddress
)
if (-not $LocalIp) { throw "Keine private IPv4-Adresse gefunden. Mit privatem WLAN verbinden und erneut ausführen." }
Write-Host "Lokale Companion-Adresse: $LocalIp"

mkcert `
  -cert-file (Join-Path $CertDir "signlocal-lan-cert.pem") `
  -key-file (Join-Path $CertDir "signlocal-lan-key.pem") `
  $LocalIp

$CaRoot = mkcert -CAROOT
Copy-Item (Join-Path $CaRoot "rootCA.pem") (Join-Path $CertDir "Signlocal-Local-CA.pem")
```

Die Datei `Signlocal-Local-CA.pem` ist die **öffentliche** CA-Datei für das iPad. Die Dateien `rootCA-key.pem` und `signlocal-lan-key.pem` sind privat und dürfen weder übertragen, per E-Mail versendet noch in Git eingecheckt werden.

### 4. Öffentliche CA auf dem iPad oder iPhone vertrauen

Übertrage vom Computer ausschließlich `rootCA.pem` (macOS) beziehungsweise `Signlocal-Local-CA.pem` (Windows) per AirDrop, lokaler Dateifreigabe oder einem anderen bewusst gewählten direkten Weg auf dein eigenes iPad. Danach:

1. Öffne die empfangene CA-Datei auf dem iPad. In **Einstellungen** erscheint in der Regel **„Profil geladen“**.
2. Öffne **Einstellungen → Allgemein → VPN & Geräteverwaltung** und installiere das Profil.
3. Öffne anschließend **Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen**.
4. Aktiviere unter **„Volles Vertrauen für Root-Zertifikate aktivieren“** den Eintrag deiner Signlocal-CA und bestätige die Warnung.
5. Lösche die übertragene CA-Datei aus „Dateien“, nachdem das Profil installiert ist.

Apple weist darauf hin, dass manuell installierte Zertifikatsprofile nicht automatisch für SSL/TLS vertraut werden; die ausdrückliche Vertrauensfreigabe ist erforderlich [1]. Die CA sollte nur auf Geräten installiert werden, die du kontrollierst, und nur so lange existieren, wie du diese lokale Testumgebung benötigst.

### 5. Companion sicher starten

Installiere die Companion-Abhängigkeiten einmalig im Ordner `companion`. Setze dann **alle** Variablen. `SIGNLOCAL_HOST` muss der Adresse entsprechen, die im Zertifikat steht; `SIGNLOCAL_ALLOWED_ORIGIN` muss die **exakte** HTTPS-Adresse der geöffneten Signlocal-PDF-App enthalten.

#### macOS Terminal

```bash
cd /pfad/zu/Signlocal/mobile/companion
pnpm install

LOCAL_IP="$(ipconfig getifaddr en0)"
export SIGNLOCAL_TLS_KEY="$HOME/signlocal-lan/certs/signlocal-lan-key.pem"
export SIGNLOCAL_TLS_CERT="$HOME/signlocal-lan/certs/signlocal-lan-cert.pem"
export SIGNLOCAL_HOST="$LOCAL_IP"
export SIGNLOCAL_ALLOWED_ORIGIN="https://signlocal-etd6sbfb.manus.space"
pnpm start
```

#### Windows PowerShell

```powershell
cd C:\Pfad\zu\Signlocal\mobile\companion
pnpm install

$CertDir = Join-Path $env:USERPROFILE "signlocal-lan\certs"
$env:SIGNLOCAL_TLS_KEY = Join-Path $CertDir "signlocal-lan-key.pem"
$env:SIGNLOCAL_TLS_CERT = Join-Path $CertDir "signlocal-lan-cert.pem"
$env:SIGNLOCAL_HOST = $LocalIp
$env:SIGNLOCAL_ALLOWED_ORIGIN = "https://signlocal-etd6sbfb.manus.space"
pnpm start
```

Der Dienst meldet danach beispielsweise `https://192.168.178.25:8787`. Öffne diese Adresse zuerst direkt in Safari auf dem iPad. Erst wenn sie **ohne Zertifikatswarnung** die Companion-Seite öffnet, solltest du in Signlocal **„Mobilgerät sicher koppeln“** wählen, dieselbe lokale Adresse eintragen und den QR-Code scannen.

### 6. Firewall nur für das private Netzwerk freigeben

Unter macOS bestätige die Systemabfrage für eingehende Verbindungen nur im privaten WLAN. Unter Windows kann Port `8787` gezielt für das private Netzwerkprofil freigegeben werden:

```powershell
New-NetFirewallRule `
  -DisplayName "Signlocal LAN Companion (TCP 8787)" `
  -Direction Inbound `
  -Profile Private `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8787
```

Kontrolliere in Windows, dass das aktuelle WLAN als **Privat** und nicht als Öffentlich eingestuft ist. Wenn der Test beendet ist, kann die Regel wieder entfernt werden:

```powershell
Remove-NetFirewallRule -DisplayName "Signlocal LAN Companion (TCP 8787)"
```

## Fehlerdiagnose vor dem QR-Pairing

| Symptom auf dem iPad | Wahrscheinliche Ursache | Sichere Behebung |
|---|---|---|
| „Verbindung nicht privat“ | CA wurde nicht vollständig vertraut | Profil installieren und die Vertrauensfreigabe unter „Zertifikatsvertrauenseinstellungen“ aktivieren. |
| „Name des Servers stimmt nicht überein“ | Zertifikat enthält nicht die aufgerufene IP-Adresse | Mit der tatsächlichen `SIGNLOCAL_HOST`-Adresse ein neues Zertifikat erstellen und den Dienst neu starten. |
| Seite lädt nicht | Falsches WLAN, Client-Isolation oder Firewall | Beide Geräte ins gleiche private WLAN bringen und nur Port `8787` im privaten Profil freigeben. |
| PDF-App kann keine Sitzung starten | `SIGNLOCAL_ALLOWED_ORIGIN` fehlt oder weicht ab | Die exakt sichtbare `https://…`-Adresse der PDF-App eintragen, ohne zusätzlichen Pfad oder Schrägstrich. |
| Nach Router-Neustart Fehler | Lokale IP hat sich geändert | Neue IP prüfen, ein Zertifikat für diese IP erstellen und `SIGNLOCAL_HOST` anpassen; künftig DHCP-Reservierung nutzen. |

> **Keine Umgehung:** Verwende niemals `http://`, klicke Sicherheitswarnungen nicht weg und verwende kein Zertifikat für `localhost`. Die Verbindung ist erst bereit für den Pairing-Test, wenn Safari die lokale HTTPS-Seite ohne Warnung öffnet und beide Geräte denselben sechsstelligen Code zeigen.

## Start

Der Companion verwendet standardmäßig Port `8787`. Die Startbefehle für macOS und Windows stehen oben in Abschnitt 5. Bei Bedarf kann `SIGNLOCAL_PORT` auf einen freien lokalen TCP-Port gesetzt werden; dann muss dieser Port auch in der Firewall-Regel verwendet werden.

## Ausdrücklich noch zu testen

- Zertifikatsvertrauen und lokale TLS-Verbindung auf iPad, iPhone und Android.
- Windows- und macOS-Firewallfreigabe im privaten Netzwerkprofil.
- QR-Scan, Vergleichscode, Sitzungsablauf und Wiederverbindung.
- Übernahme der empfangenen Signatur in die bestehende PDF-Ansicht mit einem realen PDF.
- Verbindungsabbruch, Gerätewechsel, abgelaufene oder doppelt verwendete QR-Codes.

Der Prototyp ersetzt kein Sicherheits-Audit und keine qualifizierte elektronische Signatur.

## Quellen

[1]: https://support.apple.com/en-us/102390 "Apple Support: Manuell installierten Zertifikatsprofilen in iOS, iPadOS und visionOS vertrauen"
[2]: https://github.com/FiloSottile/mkcert "mkcert: Lokale Entwicklungszertifikate"
