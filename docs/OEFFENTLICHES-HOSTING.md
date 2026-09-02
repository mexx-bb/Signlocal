# Öffentlicher Betrieb von Signlocal

## Verbindlicher öffentlicher Zugang

Die öffentlich verwendete Signlocal-Version wird ausschließlich über **GitHub Pages** ausgeliefert:

> **https://mexx-bb.github.io/Signlocal/**

Die produktive Quelle ist das Repository [`mexx-bb/Signlocal`](https://github.com/mexx-bb/Signlocal) auf dem Branch `main`. Jeder Push auf `main` startet den Workflow `.github/workflows/deploy-pages.yml`. Dieser baut die Anwendung und veröffentlicht den Inhalt von `dist/public/` unter dem GitHub-Pages-Unterpfad `/Signlocal/`.

## Einordnung der Repositories

| Repository | Rolle | Für öffentlichen Betrieb verwenden? |
|---|---|---:|
| `mexx-bb/Signlocal` | Verbindliche Quelle für die externe Signlocal-Website, Companion-Pakete, Markenbilder und Betriebsdokumentation | Ja |
| `mexx-bb/signlocal-mobile` | Technischer Manus-Projektstand und ältere Bereitstellungsreferenz | Nein |

Es darf nur aus `mexx-bb/Signlocal`, Branch `main`, veröffentlicht werden. Änderungen an `mexx-bb/signlocal-mobile` sind kein Signal für GitHub Pages und dürfen nicht als Quelle für externe Hosting-Dienste verwendet werden.

## Abgelöste Hosting-Wege

| Dienst | Status | Vorgabe |
|---|---|---|
| GitHub Pages | Aktiv | Ausschließlich diese Adresse für Mitarbeitende und öffentliche Tests verwenden. |
| Netlify | Abgelöst | Keine neue Site einrichten, keine Deploys auslösen und keine Netlify-Adresse verteilen. |
| Vercel | Abgelöst | Keine Vercel-Adresse verteilen oder als Produktionsstand behandeln. |

Netlify und Vercel wurden in der Vergangenheit mit abweichenden Repository- oder Buildquellen betrieben. Das kann zu alten Versionen oder 404-Seiten führen. Diese Dienste sind deshalb bewusst nicht Teil des aktuellen Betriebswegs.

## Veröffentlichungsprüfung

Nach jedem Produktionspush muss der GitHub-Actions-Lauf **Deploy to GitHub Pages** erfolgreich enden. Anschließend soll die öffentliche Adresse mindestens den Button **„PDF, Word oder Bild wählen“**, die Word-/Bildhinweise und beide Companion-Downloads zeigen. Die Website verarbeitet PDF-, DOCX- und Bilddateien im Browser; sie überträgt Dokumente und Signaturen nicht automatisch an GitHub Pages.

Für die lokale Companion-Verbindung ist die erlaubte Browser-Herkunft bei GitHub Pages exakt `https://mexx-bb.github.io`, **ohne** `/Signlocal/`. Neue Windows- und macOS-Companion-Pakete verwenden diese Herkunft standardmäßig. Für eine eigene HTTPS-Domain muss sie bei der Installation bewusst auf deren Schema und Host ohne Pfad geändert werden.
