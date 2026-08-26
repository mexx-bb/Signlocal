# SignLocal-Unterschriftenpad für Windows

Dieses Paket richtet den **lokalen** SignLocal-Companion auf einem Windows-PC ein. Damit kann ein iPad, iPhone oder Android-Gerät im selben **privaten WLAN** nur als Unterschriftenpad genutzt werden. PDFs werden dabei nicht an das Mobilgerät und nicht an einen Cloud-Dienst übertragen.

## Einmal einrichten

1. Lade dieses ZIP-Paket herunter und entpacke es, zum Beispiel auf dem Desktop.
2. Verbinde den Windows-PC und das iPad/iPhone mit demselben **privaten WLAN**. Gäste- und öffentliche WLANs werden nicht unterstützt.
3. Doppelklicke `SignLocal-Companion-Installation-starten.cmd` und bestätige die Windows-Sicherheitsabfrage.
4. Das Skript installiert bei Bedarf Node.js und mkcert, erstellt ein Zertifikat ausschließlich auf deinem PC und legt einen Desktop-Start **„SignLocal Companion starten“** an.
5. Notiere die angezeigte lokale Adresse und richte auf dem iPad/iPhone die angebotene öffentliche CA-Datei ein. Vergleiche den Fingerabdruck auf beiden Geräten, bevor du vertraust.

> **Wichtig:** Übertrage nur `Signlocal-Local-CA.pem` auf dein eigenes Mobilgerät. Der private Schlüssel `signlocal-lan-key.pem` und alle Dateien mit `key` im Namen dürfen nie kopiert, geteilt oder versendet werden.

## Danach unterschreiben

1. Doppelklicke auf dem Windows-Desktop **„SignLocal Companion starten“**.
2. Öffne die angezeigte lokale `https://…:8787`-Adresse zuerst auf dem iPad/iPhone. Sie muss ohne Zertifikatswarnung laden.
3. Öffne SignLocal auf dem Computer, wähle **„Mobilgerät sicher koppeln“**, trage die lokale Adresse ein und scanne den QR-Code.
4. Vergleiche und bestätige den sechsstelligen Code auf beiden Geräten. Erst dann kann die Unterschrift übertragen werden.

## Wenn etwas nicht funktioniert

- Stelle das aktuelle WLAN in Windows auf **Privat** und nicht auf Öffentlich.
- Beide Geräte müssen im gleichen privaten WLAN sein; Client-Isolation im Router darf nicht aktiv sein.
- Nach einem WLAN- oder Routerwechsel das Installationspaket erneut starten. Dadurch wird ein Zertifikat für die neue lokale IP erstellt.
- Nicht mit `http://` arbeiten und Browser-Zertifikatswarnungen niemals umgehen.

Der Companion ist ein lokaler technischer Signaturablauf und keine qualifizierte elektronische Signatur.
