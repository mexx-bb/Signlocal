# SignLocal-Unterschriftenpad für macOS

Dieses Paket richtet den **lokalen** SignLocal-Companion auf einem Mac ein. Ein iPad, iPhone oder Android-Gerät kann damit im selben **eigenen privaten Netzwerk** als Unterschriftenpad dienen. Das PDF bleibt auf dem Mac; die Unterschrift wird nur über die lokale, verschlüsselte Verbindung übertragen.

## Einmalige Vorbereitung mit Internet

1. Lade das ZIP herunter und entpacke es, beispielsweise auf dem Schreibtisch.
2. Doppelklicke `Install-SignLocal-Companion.command`. Falls macOS die Datei blockiert, halte die Control-Taste gedrückt, wähle **Öffnen** und bestätige bewusst den Dialog.
3. Das Skript zeigt zuerst die Offline-Anleitung. Tippe nur `JA` ein, wenn du dein eigenes Mac-WLAN oder einen privaten Reiserouter verwendest.
4. Wenn Homebrew fehlt, öffne [brew.sh](https://brew.sh) und führe die dort beschriebene Installation bewusst aus. Das SignLocal-Skript installiert Homebrew nicht automatisch aus dem Internet.
5. Das Paket installiert dann Node.js und mkcert, verwendet die bereits im ZIP enthaltenen Companion-Dateien, erstellt lokale Zertifikate außerhalb des Projektordners und legt auf dem Schreibtisch **„SignLocal Companion starten“** an. Dafür ist kein GitHub-Zugang erforderlich.

> Die Erstinstallation benötigt Internet, weil Node.js, mkcert und die benötigten lokalen Abhängigkeiten eingerichtet werden. Die Companion-Dateien kommen bereits mit dem ZIP. PDFs und Signaturen werden dabei nicht hochgeladen. Führe diese Einrichtung vor dem Außendiensteinsatz im Büro oder zuhause durch.

## Außendienst ohne Internet

Nach der Einrichtung benötigt die Signaturkopplung weder Router noch Internetzugang. Du benötigst nur ein lokales Netzwerk zwischen Mac und Mobilgerät.

1. Öffne auf dem Mac **Systemeinstellungen → Allgemein → Freigaben → Internetfreigabe**.
2. Teile die Verbindung über ein eigenes WLAN und lege ein starkes WLAN-Passwort fest. Wenn dein Mac keine passende Internetfreigabe anbieten kann, verwende einen eigenen kleinen Reiserouter ohne Internetzugang.
3. Verbinde iPad, iPhone oder Android mit diesem eigenen Netzwerk.
4. Doppelklicke auf dem Schreibtisch **„SignLocal Companion starten“**.
5. Öffne die angezeigte lokale `https://…:8787`-Adresse zuerst auf dem Mobilgerät. Die Seite muss ohne Zertifikatswarnung laden.
6. Öffne SignLocal auf dem Mac, wähle **„Mobilgerät sicher koppeln“**, scanne den QR-Code und bestätige den sechsstelligen Code auf beiden Geräten.

## Büro-Signaturpad bereithalten

Im Büro kann ein eigenes iPad, iPhone oder Android-Gerät als dauerhaft sichtbares lokales Signaturpad vorbereitet werden. Es bleibt dabei ausschließlich im privaten Büro-WLAN mit dem Companion-Computer verbunden.

1. Öffne in SignLocal auf dem Mac nach dem Laden eines Dokuments **„Mobilgerät sicher koppeln“** und gib die lokale Companion-Adresse ein.
2. Wähle **„Büro-Signaturpad vorbereiten“** und scanne den QR-Code einmalig auf dem iPad/iPhone. Lasse die danach geöffnete Pad-Seite sichtbar und entsperrt.
3. Wähle am Mac **„Unterschrift am Büro-Pad anfordern“**. Auf dem bereits geöffneten Gerät erscheint sofort die Aufforderung mit dem sechsstelligen Vergleichscode.
4. Vergleiche den Code auf beiden Geräten, zeichne die Unterschrift und tippe nach erfolgreicher Übergabe auf **„Fertig ✓“**. Das Pad zeigt anschließend wieder seine Bereitschaft für die nächste lokale Sitzung.

> Ein iPad/iPhone kann die lokale Pad-Seite nicht selbsttätig aus dem Hintergrund öffnen. Die Seite muss sichtbar bleiben; es wird kein Cloud-Dienst und keine externe Push-Benachrichtigung verwendet.

## Lokalen Autostart einrichten oder beenden

Nach der Installation findest du auf dem Schreibtisch zwei bewusste Aktionen: **„SignLocal Companion Autostart aktivieren“** startet den lokalen Dienst beim Anmelden an deinem Mac und nach einem Fehler erneut. **„SignLocal Companion Autostart beenden“** entfernt diesen Autostart wieder; der manuelle Desktop-Start bleibt erhalten.

Der Dienst arbeitet nur im Benutzerkonto und nur dann, wenn eine private IPv4-Adresse vorhanden ist. Bei Gäste-, öffentlichen oder nicht verbundenen Netzwerken startet keine Signaturkopplung. Bei unveränderter privater Adresse bleiben die lokalen Zertifikate erhalten; nach einem Netzwerkwechsel werden sie für die neue private Adresse erneuert.

## Zertifikat auf iPad oder iPhone einrichten

Der Desktop-Start zeigt eine lokale Einrichtungsmöglichkeit für die **öffentliche** Datei `Signlocal-Local-CA.pem`. Vergleiche den dort angezeigten Fingerabdruck auf Mac und iPad/iPhone, bevor du vertraust. Teile niemals `signlocal-lan-key.pem` oder einen anderen privaten Schlüssel.

## Wichtige Grenzen

- Nur eigenes privates WLAN oder eigener Reiserouter; niemals Gäste- oder öffentliche WLANs.
- Nach einem Netzwerkwechsel den Desktop-Start erneut öffnen, damit ein Zertifikat für die aktuelle private Adresse erstellt wird.
- Klicke Browser-Zertifikatswarnungen nicht weg und verwende niemals eine unverschlüsselte `http://`-Verbindung für die Signaturkopplung.
- Der Companion ist ein lokaler technischer Signaturablauf und keine qualifizierte elektronische Signatur.
