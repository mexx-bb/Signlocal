# Signotec Pad Integration

## Übersicht

SignLocal unterstützt jetzt Signotec Unterschriften-Pads für die professionelle Erfassung von digitalen Unterschriften.

## Voraussetzungen

1. **Signotec Pad Hardware**
   - Signotec Unterschriften-Pad muss per USB angeschlossen sein
   - Das Pad sollte betriebsbereit sein (Status-LED sollte orange leuchten)

2. **Signotec Software**
   - Installieren Sie die Signotec Software von: https://www.signotec.com
   - Die Signotec Software muss laufen, damit das Pad erkannt wird

3. **Browser-Kompatibilität**
   - Die Integration unterstützt verschiedene Signotec APIs:
     - Signotec Browser Plugin (Legacy)
     - Signotec Web API (lokaler Service)
     - Signotec JavaScript SDK

## Verwendung

1. **Pad anschließen**
   - Schließen Sie das Signotec Pad per USB an
   - Starten Sie die Signotec Software
   - Warten Sie, bis das Pad erkannt wird

2. **In SignLocal verwenden**
   - Öffnen Sie ein Dokument in SignLocal
   - Klicken Sie auf "Signieren" bei einem Signaturfeld
   - Im Signatur-Dialog erscheint automatisch ein neuer Tab "Signotec Pad" (wenn das Pad erkannt wurde)
   - Klicken Sie auf "Signatur vom Pad erfassen"
   - Signieren Sie auf dem Signotec Pad
   - Die Signatur wird automatisch übernommen

## Technische Details

### Erkannte APIs

Die Integration prüft automatisch folgende Signotec APIs:

1. **Signotec Browser Plugin (ActiveX)**
   - Für Internet Explorer (Legacy)
   - `new ActiveXObject('Signotec.SignaturePad')`

2. **Signotec NPAPI Plugin**
   - Für ältere Browser (Legacy)
   - `navigator.plugins['Signotec Signature Pad']`

3. **Signotec Web API**
   - Lokaler HTTP-Service auf Port 8080
   - Endpoint: `http://localhost:8080/signotec/capture`

4. **Signotec Custom Events**
   - Event-basierte API
   - Event: `signotec-signature`

### Dateien

- `src/lib/signotec-integration.ts` - Signotec Integration Logik
- `src/components/sign-local/signature-pad.tsx` - Erweiterte Signatur-Komponente

## Fehlerbehebung

### Pad wird nicht erkannt

1. **Prüfen Sie die Hardware-Verbindung**
   - Ist das Pad per USB angeschlossen?
   - Leuchtet die Status-LED?

2. **Prüfen Sie die Software**
   - Ist die Signotec Software installiert?
   - Läuft die Signotec Software?
   - Ist das Pad in der Signotec Software erkannt?

3. **Browser-Kompatibilität**
   - Manche Signotec APIs funktionieren nur mit bestimmten Browsern
   - Versuchen Sie einen anderen Browser
   - Prüfen Sie, ob Browser-Plugins aktiviert sind

4. **Lokaler Service**
   - Prüfen Sie, ob der Signotec Web Service läuft:
     ```powershell
     # Prüfe ob Port 8080 aktiv ist
     Get-NetTCPConnection -LocalPort 8080
     ```

### Signatur wird nicht erfasst

1. **Prüfen Sie die Konsole**
   - Öffnen Sie die Browser-Entwicklertools (F12)
   - Prüfen Sie auf Fehlermeldungen

2. **Manuelle API-Prüfung**
   - Prüfen Sie, welche Signotec API verfügbar ist
   - Kontaktieren Sie den Signotec Support für spezifische API-Dokumentation

## Erweiterte Konfiguration

### Signotec Web API konfigurieren

Falls Sie einen lokalen Signotec Service verwenden, können Sie die URL anpassen:

```typescript
// In signotec-integration.ts
const SIGNOTEC_API_URL = 'http://localhost:8080/signotec/capture';
```

### Custom Event Integration

Falls Ihr Signotec Pad Custom Events sendet, können Sie diese abfangen:

```javascript
window.addEventListener('signotec-signature', (event) => {
  const signature = event.detail;
  // Verarbeiten Sie die Signatur
});
```

## Support

Bei Problemen mit der Signotec-Integration:

1. Prüfen Sie die Signotec-Dokumentation: https://docs.signotec.com
2. Kontaktieren Sie den Signotec Support
3. Prüfen Sie die Browser-Konsole auf Fehlermeldungen

## Bekannte Einschränkungen

- Die Integration funktioniert nur, wenn das Signotec Pad und die Software installiert sind
- Manche Signotec APIs funktionieren nur mit bestimmten Browsern
- Die Integration erfordert möglicherweise Browser-Plugins (je nach Signotec Modell)

