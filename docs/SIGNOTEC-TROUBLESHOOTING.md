# Signotec Pad - Fehlerbehebung

## Problem: Pad wird nicht erkannt

### Status-Check

**Gerät erkannt:**
- ✅ "signotec LCD Signature Pad Gamma" - Status: OK (im Geräte-Manager)

**Software läuft:**
- ✅ STPadServer.exe läuft (PID: 23548)
- ✅ Port 49494 ist aktiv (Listen)

**Problem:**
- ❌ Port 49494 antwortet nicht auf HTTP-Requests
- ❌ Web API nicht erreichbar

## Mögliche Lösungen

### 1. Signotec Software-Konfiguration prüfen

1. Öffnen Sie die Signotec Software (signoPAD Tools)
2. Gehen Sie zu den Einstellungen
3. Prüfen Sie, ob "Web API" oder "HTTP Service" aktiviert ist
4. Prüfen Sie den konfigurierten Port

### 2. Signotec JavaScript SDK verwenden

Falls verfügbar, laden Sie die Signotec JavaScript-Bibliothek:

```html
<!-- In public/index.html oder ähnlich -->
<script src="path/to/signotec-sdk.js"></script>
```

Dann in der Integration:
```javascript
if (window.Signotec) {
  // Signotec SDK verfügbar
}
```

### 3. Alternative: Browser-Plugin installieren

Manche Signotec-Modelle benötigen ein Browser-Plugin:

1. Laden Sie das Signotec Browser-Plugin von der Signotec-Website
2. Installieren Sie das Plugin
3. Aktivieren Sie es im Browser

### 4. Backend-Integration (empfohlen)

Da STPadServer auf Port 49494 läuft, aber nicht über HTTP erreichbar ist, könnte eine Backend-Integration nötig sein:

1. Erstellen Sie eine Next.js API-Route (`/api/signotec/capture`)
2. Diese Route kommuniziert direkt mit STPadServer über:
   - COM/ActiveX (Windows)
   - Signotec SDK (C#/.NET)
   - Signotec Native API

### 5. Signotec-Dokumentation prüfen

1. Besuchen Sie: https://docs.signotec.com
2. Suchen Sie nach "STPadServer API" oder "Web Integration"
3. Prüfen Sie die API-Dokumentation für Ihr spezifisches Modell

## Aktuelle Konfiguration

- **Gerät:** signotec LCD Signature Pad Gamma
- **STPadServer:** Läuft auf Port 49494
- **Problem:** Port antwortet nicht auf HTTP

## Nächste Schritte

1. **Prüfen Sie die Signotec-Dokumentation** für Ihr spezifisches Modell
2. **Kontaktieren Sie den Signotec Support** für API-Details
3. **Prüfen Sie die Signotec Software-Einstellungen** für Web-API-Optionen
4. **Erwägen Sie eine Backend-Integration** falls Web-API nicht verfügbar ist

## Temporäre Lösung

Bis die Signotec-Integration vollständig funktioniert, können Sie weiterhin:
- **Zeichnen** - Signatur mit Maus/Touchscreen zeichnen
- **Hochladen** - Signatur-Bild hochladen
- **Platzhalter** - Platzhalter-Signatur verwenden

Die Signotec-Integration wird automatisch aktiviert, sobald das Pad korrekt erkannt wird.

