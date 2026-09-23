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
