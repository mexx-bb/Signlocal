# Signlocal

Signlocal ist eine mobile Webanwendung für sichtbare, handschriftliche PDF-Signaturen. PDFs, DOCX-zu-PDF-Kopien, Bildkonvertierung und der optionale Browser-Tresor werden lokal im Browser verarbeitet. Der optionale **Signlocal LAN Companion** überträgt ausschließlich Signaturpunkte zwischen einem Computer und einem iPad, Android-Tablet oder Smartphone im eigenen privaten Netzwerk. Er lädt weder PDFs noch Signaturen in eine Cloud hoch.

> Die sichtbare Unterschrift ist keine qualifizierte elektronische Signatur und ersetzt keinen gesetzlich erforderlichen Vertrauensdiensteprozess.

## Website unabhängig hosten

Die Website kann auf einer eigenen HTTPS-Domain oder bei einem beliebigen statischen beziehungsweise Node-kompatiblen Hoster betrieben werden. Der Browserteil benötigt weder eine Datenbank noch eine Cloud-API für PDF-, Dokument- oder Signaturdaten.

| Schritt | Befehl beziehungsweise Einstellung |
|---|---|
| Quellen laden | `git clone https://github.com/mexx-bb/Signlocal.git` |
| Abhängigkeiten installieren | `pnpm install --frozen-lockfile` |
| Produktion bauen | `pnpm run build:external` |
| Node-Hosting | `pnpm start` |
| Statisches Hosting | Inhalt von `dist/public/` veröffentlichen; bei Single-Page-Routing eine Fallback-Regel auf `index.html` setzen |

`pnpm run build:external` übernimmt die im Repository enthaltenen Marken- und Illustrationsquellen aus `brand-assets/` nach `dist/public/signlocal-assets/` und ersetzt dort die bisherigen Manus-Pfade. Die externe Website muss zwingend über **HTTPS** ausgeliefert werden, weil sie eine lokale HTTPS-/WSS-Verbindung zum Companion aufbaut. Für PDF-Dokumente und Unterschriften ist keine serverseitige Speicherung erforderlich. Wenn ein Hosting-Anbieter Analyse-, Log- oder CDN-Funktionen aktiviert, sollten diese für Dokumentseiten nicht den Dokumentinhalt, Dateinamen oder Anfragedaten erfassen.

## Lokalen Companion auf eine eigene Website-Adresse einstellen

Der Companion akzeptiert aus Sicherheitsgründen nur die exakt festgelegte Website-Adresse. Nach einem Umzug der Website muss daher einmalig die erlaubte Herkunft angepasst werden.

| System | Sichere Einstellung |
|---|---|
| Windows | `Install-SignLocal-Companion.ps1 -AllowedOrigin "https://sign.example.de"` |
| macOS | `SIGNLOCAL_ALLOWED_ORIGIN="https://sign.example.de" ./Install-SignLocal-Companion.command` |
| Manuell | Vor dem Companion-Start `SIGNLOCAL_ALLOWED_ORIGIN=https://sign.example.de` setzen. Nur Schema und Host ohne Pfad verwenden. |

Die Adresse muss genau der öffentlich aufgerufenen Website entsprechen, etwa `https://sign.example.de`. Zusätze wie `/app`, `?test=1`, `http://` oder eine andere Subdomain werden bewusst abgewiesen. So kann keine fremde Website Signaturanfragen an den lokalen Companion stellen.

## Dauerhaftes Mitarbeiter-Signaturpad

Ein iPad, Android-Tablet oder Smartphone kann nach der ersten bestätigten Kopplung als bevorzugtes lokales Signaturpad vorbereitet bleiben. Solange die Pad-Seite sichtbar bleibt, erscheinen neue Aufforderungen direkt auf dem Gerät. Nach einem Companion-Neustart verbindet das geöffnete Pad sich erneut. Die Pad-Kennung bleibt lokal auf dem Companion-Computer und diesem Mobilgerät gespeichert; sie enthält keine PDF-Dateien, Signaturpunkte oder privaten Schlüssel.

Die dauerhafte Bindung ist auf 30 Tage begrenzt und lässt sich am Mobilgerät über **„Dieses Signaturpad trennen“** jederzeit bewusst löschen. Nach Ablauf, Trennung, neuem Gerät oder einem Wechsel des privaten Netzwerks wird wieder sicher neu gekoppelt. iOS und Android können die Pad-Seite aus dem gesperrten Hintergrund nicht zuverlässig rein lokal öffnen; das Gerät muss für direkte Aufforderungen sichtbar und entsperrt bleiben.

Eine kurz gehaltene Schritt-für-Schritt-Anleitung für die Vorbereitung, den Einsatz ohne Internet und die Fehlerhilfe liegt unter [`docs/AUSSENDIENST-OHNE-INTERNET.md`](docs/AUSSENDIENST-OHNE-INTERNET.md).

## Öffentliche Website und lokale Pad-Seite

Die vollständige öffentliche Signlocal-Version ist unter `https://mexx-bb.github.io/Signlocal/` erreichbar. Wenn die **lokale Pad-Seite** nicht öffnet, ist das nicht dieselbe Website: Zuerst muss der Companion auf dem Mac oder Windows-PC gestartet sein. Anschließend wird auf dem Mobilgerät ausschließlich die vom Companion angezeigte private Adresse wie `https://192.168.1.20:8787` aufgerufen.

Nutze nur ein eigenes privates WLAN, einen eigenen Laptop-Hotspot oder einen privaten Reiserouter. Öffentliche und Gäste-Netze sind ausdrücklich ausgeschlossen. Bei einer Zertifikatswarnung nicht fortfahren: lokale IP, die installierte Signlocal-CA und ihren am Computer angezeigten SHA-256-Fingerabdruck prüfen.

## Sicherheit und Ausschlüsse

Private Schlüssel, lokale Zertifikate, lokale Pad-Bindungen, `node_modules`, Builds, Logs und Umgebungsdateien gehören nicht in GitHub oder die Installationspakete. Die veröffentlichten Companion-ZIPs enthalten deshalb nur Quellcode und Installationsdateien. Die reale Abnahme von iPad/iPhone/Android im privaten WLAN bleibt nach jeder größeren Änderung ein eigener Testschritt.
