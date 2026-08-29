# Repository-Struktur

Der aktive Signlocal-Quellstand für die Webanwendung und den lokalen Companion liegt im Repository-Stamm. Die nachstehende Struktur ist für Wartung, externe Bereitstellung und lokale Installation maßgeblich.

| Pfad | Zweck |
|---|---|
| `client/` | React-/Vite-Webanwendung für lokale Dokumentverarbeitung und die PC-Seite des Signaturablaufs. |
| `companion/` | Lokaler HTTPS-/WSS-Companion, Mobilpad-Seite, Zertifikatsskript, Windows- und macOS-Installer sowie Protokolltests. |
| `brand-assets/` | Versionsfähige Originalquellen der verwendeten Marken-, Icon- und Illustrationsdateien für unabhängiges Hosting. |
| `scripts/prepare-external-assets.mjs` | Übernimmt Markenquellen in einen extern hostbaren Produktions-Build und ersetzt die bisherigen bereitstellerspezifischen Bildpfade. |
| `docs/` | Einsatz-, Sicherheits- und Betriebsanleitungen für Mitarbeitende und Administrierende. |
| `skills/local-pdf-signature-companion/` | Wiederverwendbarer Skill für die Entwicklung und Prüfung vollständig lokaler Signaturpads. |
| `.github/workflows/deploy-pages.yml` | GitHub-Pages-Bereitstellung für den aktuellen Branch. |

> Das Verzeichnis `mobile/` ist eine parallele, ältere Projektstruktur. Es wird nicht für den aktuellen Stamm-Build, die aktuellen Companion-Installer oder die Außendienst-Anleitung gepflegt. Es bleibt unverändert, bis eine getrennte, bewusste Bereinigungsentscheidung getroffen wird.

## Veröffentlichen auf einem eigenen Hoster

Verwende im Repository-Stamm `pnpm install --frozen-lockfile` und anschließend `pnpm run build:external`. Veröffentliche bei statischem Hosting den Inhalt von `dist/public/`; bei Node-kompatiblem Hosting starte nach `pnpm run build:external` die Anwendung mit `pnpm start`. Die Browser-App muss über HTTPS ausgeliefert werden.

Der lokale Companion wird getrennt auf dem jeweiligen Mac oder Windows-PC installiert. Bei eigener Website-Adresse muss seine exakte `https://`-Herkunft in der Installer-Konfiguration eingetragen werden. Die Details stehen in der Stamm-README.
