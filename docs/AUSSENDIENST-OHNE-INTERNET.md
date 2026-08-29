# Signlocal unterwegs ohne Internet

Diese Anleitung gilt für Mitarbeitende, die ein iPad, Android-Tablet oder Smartphone nur als Unterschriftenpad verwenden. **PDF und fertige Unterschrift bleiben auf dem Laptop.** Verwende ausschließlich einen eigenen Laptop-Hotspot oder einen privaten Reiserouter. Gäste- und öffentliche WLANs sind nicht zulässig.

> **Wichtig zum aktuellen Stand:** Der lokale Signlocal-Companion und das Unterschriftenpad funktionieren nach der Einrichtung ohne Internet. Die Signlocal-Website wird derzeit jedoch extern bereitgestellt. Für eine vollständig garantierte Offline-Nutzung der gesamten Dokumentoberfläche ist zusätzlich ein lokales Website-Installationspaket auf jedem Laptop erforderlich; dieses Paket ist noch nicht Bestandteil der aktuellen Windows-/macOS-Companion-Downloads. Eine vorher im Browser geöffnete Website kann im Cache verfügbar sein, darf aber nicht als garantiert offline verfügbar eingeplant werden.

## Einmal vor der Reise oder im Büro vorbereiten

| Schritt | Was Mitarbeitende tun | Woran man Erfolg erkennt |
|---|---|---|
| 1 | Signlocal auf dem Laptop im Browser öffnen und eine PDF testweise lokal auswählen. | Die App zeigt die Dokumentansicht. |
| 2 | Das passende **Windows- oder macOS-Companion-Paket** herunterladen und installieren. Die Erstinstallation benötigt Internet für Node.js, mkcert und die lokalen Abhängigkeiten. | Eine Desktop-Aktion „SignLocal Companion starten“ ist vorhanden. |
| 3 | Am Laptop ein eigenes WLAN oder einen eigenen Hotspot aktivieren. | Der Laptop hat eine private Adresse wie `192.168.x.x`, `10.x.x.x` oder `172.16–31.x.x`. |
| 4 | iPad, Android-Tablet oder Smartphone mit diesem eigenen Netzwerk verbinden. | Beide Geräte sind im selben privaten Netzwerk. |
| 5 | Companion auf dem Laptop starten. | Das Fenster zeigt eine lokale HTTPS-Adresse und den CA-Fingerabdruck. |
| 6 | Auf dem Mobilgerät zuerst die lokale CA-Einrichtungsseite auf Port `8788` öffnen, Fingerabdruck vergleichen und das Zertifikat vertrauenswürdig installieren. | `https://<Laptop-IP>:8787` öffnet anschließend ohne Zertifikatswarnung. |
| 7 | In Signlocal die Companion-Adresse eintragen, den Einrichtungs-QR-Code scannen und den sechsstelligen Code auf beiden Geräten vergleichen. | Das Mobilgerät meldet „Büro-Pad bereit“. |

Bei einer Zertifikatswarnung nicht fortfahren. Prüfe stattdessen private IP-Adresse, Fingerabdruck, installierte Signlocal-CA und den laufenden Companion.

## Am Einsatztag arbeiten

1. Aktiviere am Laptop den eigenen Hotspot beziehungsweise verbinde Laptop und Mobilgerät mit dem privaten Reiserouter.
2. Verbinde das iPad, Android-Tablet oder Smartphone damit.
3. Starte auf dem Laptop **„SignLocal Companion starten“**.
4. Öffne Signlocal auf dem Laptop. Wenn die extern gehostete Website ohne Internet nicht lädt, verwende den Vorgang erst nach einer Verbindung oder warte auf das geplante lokale Website-Installationspaket.
5. Lasse die Pad-Seite am Mobilgerät geöffnet und das Gerät entsperrt. iOS und Android können eine lokale Browserseite nicht verlässlich aus dem gesperrten Hintergrund öffnen.
6. Öffne die PDF auf dem Laptop und wähle **„Unterschrift am Büro-Pad anfordern“**. Die Aufforderung erscheint direkt auf dem vorbereiteten Pad.
7. Die Person zeichnet, verwirft, bricht ab oder bestätigt. Die Signatur erscheint zurück auf dem Laptop und wird dort positioniert und gespeichert.

## Dauerhaftes Mitarbeiter-Pad

Nach der ersten sicheren Kopplung kann dasselbe iPad, Android-Tablet oder Smartphone als bevorzugtes Pad bereit bleiben. Es verbindet sich nach einem kurzen Browser- oder Companion-Neustart wieder lokal, solange die Pad-Seite geöffnet bleibt. Die Bindung enthält lediglich eine zufällige Pad-Kennung und ein Ablaufdatum, niemals ein PDF, Signaturpunkte oder private Schlüssel.

Die Bindung läuft nach 30 Tagen ab und kann jederzeit am Mobilgerät mit **„Dieses Signaturpad trennen“** bewusst entfernt werden. Nach Ablauf, Trennung, neuem Gerät oder Netzwerkwechsel wird sicher neu gekoppelt.

## Kurze Fehlerhilfe

| Meldung oder Situation | Sichere Lösung |
|---|---|
| Website lädt nicht ohne Internet | Der externe Website-Host ist ohne Internet nicht erreichbar. Nicht mit öffentlichen Netzen improvisieren; lokale Website-Installation einplanen. |
| Mobilgerät findet die lokale Seite nicht | Prüfe, ob beide Geräte im selben privaten Netzwerk sind und ob der Companion auf dem Laptop läuft. Verwende die aktuelle angezeigte IP-Adresse. |
| Zertifikatswarnung | Nicht wegklicken. CA-Einrichtung, Fingerabdruck und lokale Adresse prüfen. |
| Pad erhält keine Aufforderung | Pad-Seite sichtbar und Gerät entsperrt lassen. Companion neu starten; bei Netzwerkwechsel erneut koppeln. |
| Anderes Mobilgerät soll unterschreiben | Auf dem bisherigen Gerät „Dieses Signaturpad trennen“ wählen und das neue Gerät regulär koppeln. |

## Was nie getan werden darf

Teile keine privaten Schlüssel, Zertifikatsdateien mit Schlüsselanteil, Tresorpasswörter, PDFs oder Signaturdaten über E-Mail, Messenger oder öffentliche Dateiablagen. Deaktiviere keine Sicherheitsfunktionen und umgehe keine Zertifikatswarnungen. Die sichtbare handschriftliche Signatur ist keine qualifizierte elektronische Signatur.
