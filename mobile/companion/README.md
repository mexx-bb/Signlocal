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
3. Ein lokales TLS-Zertifikat bereitstellen. Das Zertifikat muss den verwendeten lokalen Namen oder die lokale IP-Adresse als Subject Alternative Name enthalten.
4. Die ausstellende lokale Zertifikatsstelle einmalig auf dem iPad, iPhone oder Android-Gerät als vertrauenswürdig einrichten. Ohne diese Vertrauensfreigabe ist eine strenge Browser-TLS-Verbindung im lokalen Netz nicht zuverlässig nutzbar.
5. Den Dienst nur im **privaten Netzwerkprofil** der Betriebssystem-Firewall freigeben.

## Start

```bash
SIGNLOCAL_TLS_KEY=/absoluter/pfad/signlocal-lan-key.pem \
SIGNLOCAL_TLS_CERT=/absoluter/pfad/signlocal-lan-cert.pem \
SIGNLOCAL_ALLOWED_ORIGIN=https://ihre-signlocal-adresse.example \
pnpm start
```

Unter Windows werden die Umgebungsvariablen in PowerShell gesetzt. `SIGNLOCAL_ALLOWED_ORIGIN` muss exakt die HTTPS-Adresse der Signlocal-PDF-App auf dem Computer enthalten. Der Dienst nennt anschließend seine lokale HTTPS-Adresse. Diese Adresse wird im geöffneten PDF über **„Mobilgerät sicher koppeln“** eingegeben; dort erzeugt die App den QR-Code.

## Ausdrücklich noch zu testen

- Zertifikatsvertrauen und lokale TLS-Verbindung auf iPad, iPhone und Android.
- Windows- und macOS-Firewallfreigabe im privaten Netzwerkprofil.
- QR-Scan, Vergleichscode, Sitzungsablauf und Wiederverbindung.
- Übernahme der empfangenen Signatur in die bestehende PDF-Ansicht mit einem realen PDF.
- Verbindungsabbruch, Gerätewechsel, abgelaufene oder doppelt verwendete QR-Codes.

Der Prototyp ersetzt kein Sicherheits-Audit und keine qualifizierte elektronische Signatur.
