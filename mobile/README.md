# Signlocal – Mobiler Ableger

Dieser Ordner enthält die iPhone-optimierte, statische Signlocal-Anwendung. Er wird getrennt von der bestehenden Hauptanwendung im Repository gepflegt.

## Lokal starten

```bash
pnpm install
pnpm dev
```

Die Anwendung verarbeitet PDFs im Browser. Signierte PDFs können zusätzlich im lokalen IndexedDB-Archiv dieses Browsers abgelegt werden; sie werden dabei nicht an einen Dokumentserver übertragen. Für eine dauerhafte Sicherheitskopie sollten wichtige Dateien zusätzlich in der Dateien-App unter **Auf meinem iPhone** exportiert werden.

## Wichtige Verzeichnisse

| Pfad | Zweck |
|---|---|
| `client/src/pages/Home.tsx` | Mobile Signatur- und Dokumentoberfläche |
| `client/src/lib/localArchive.ts` | Lokales IndexedDB-Archiv für signierte PDFs |
| `client/public/manifest.webmanifest` | PWA-Konfiguration für iPhone-Homescreen |
