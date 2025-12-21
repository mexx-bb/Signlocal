# Signotec Pad - Fehlerbehebung

## Fehler: "Die Signatur konnte nicht erfasst werden"

Dieser Fehler tritt auf, wenn keine Signotec-API verfügbar ist. Folgen Sie diesen Schritten:

### 1. Prüfen Sie die Browser-Konsole

Öffnen Sie die Entwicklertools (F12) und gehen Sie zum "Console"-Tab. Sie sollten folgende Meldungen sehen:

- `Prüfe Signotec Pad Verfügbarkeit...`
- `Verfügbare globale Objekte: {...}`
- `captureSignotecSignature: Starte Erfassung...`

Diese Meldungen helfen, das Problem zu identifizieren.

### 2. Signotec Software starten

**Wichtig:** Die Signotec Software muss laufen, bevor Sie die Anwendung verwenden!

1. Suchen Sie nach "Signotec" oder "STPadServer" im Startmenü
2. Starten Sie die Signotec Software
3. Warten Sie, bis das Pad erkannt wird (Status-LED sollte orange leuchten)
4. Prüfen Sie, ob das Pad in der Signotec Software angezeigt wird

### 3. STPadServerLib.js laden (falls erforderlich)

Falls Ihre Signotec-Installation eine JavaScript-Bibliothek (`STPadServerLib.js`) erfordert:

1. Suchen Sie die Datei `STPadServerLib.js` in Ihrem Signotec-Installationsverzeichnis
   - Typischer Pfad: `C:\Program Files\Signotec\...` oder `C:\Program Files (x86)\Signotec\...`
2. Kopieren Sie die Datei nach `C:\SignLocal\public\STPadServerLib.js`
3. Die Datei wird automatisch geladen, wenn sie im `public`-Ordner liegt

**Hinweis:** Die aktuelle Version lädt die Bibliothek automatisch, wenn sie im `public`-Ordner liegt.

### 4. Pad anschließen und prüfen

1. Schließen Sie das Signotec Pad per USB an
2. Prüfen Sie, ob Windows das Gerät erkennt (Geräte-Manager)
3. Prüfen Sie die Status-LED am Pad (sollte orange leuchten)

### 5. Browser-Kompatibilität

Die Signotec-Integration unterstützt verschiedene APIs:

- **STPadServerLib** (empfohlen) - Moderne WebSocket-basierte API
- **Signotec Browser Plugin** (Legacy) - Nur in älteren Browsern
- **Signotec Web API** - Lokaler HTTP-Service auf verschiedenen Ports

**Empfohlene Browser:**
- Chrome/Edge (neueste Version)
- Firefox (neueste Version)

### 6. Ports prüfen

Die Integration prüft automatisch folgende Ports:
- 49494 (STPadServer WebSocket)
- 8080, 8081, 8082 (Web API)
- 5000, 9000 (Alternative Ports)

Falls ein Firewall-Programm läuft, stellen Sie sicher, dass diese Ports nicht blockiert sind.

### 7. Debug-Informationen sammeln

Öffnen Sie die Browser-Konsole (F12) und führen Sie folgende Befehle aus:

```javascript
// Prüfe verfügbare Signotec-Objekte
console.log('STPadServerLib:', window.STPadServerLib);
console.log('STPadServerLibDefault:', window.STPadServerLibDefault);
console.log('Signotec:', window.Signotec);
```

### 8. Häufige Probleme

**Problem:** "Kein Signotec Pad gefunden"
- **Lösung:** Pad anschließen, Signotec Software starten, Browser neu laden

**Problem:** "WebSocket Fehler"
- **Lösung:** Prüfen Sie, ob STPadServer läuft. Starten Sie die Signotec Software neu.

**Problem:** "Verbindung zum Signotec-Dienst fehlgeschlagen"
- **Lösung:** Signotec Software starten, Pad anschließen, Browser neu laden

### 9. Alternative: Manuelle Signatur

Falls die Signotec-Integration nicht funktioniert, können Sie die Signatur auch manuell zeichnen oder hochladen:
- Tab "Zeichnen": Signatur mit Maus/Touchscreen zeichnen
- Tab "Hochladen": Bilddatei der Signatur hochladen
- Tab "Platzhalter": Platzhalter-Signatur verwenden

### Support

Falls das Problem weiterhin besteht:
1. Prüfen Sie die Browser-Konsole auf Fehlermeldungen
2. Prüfen Sie, ob die Signotec Software läuft
3. Prüfen Sie, ob das Pad in der Signotec Software erkannt wird
4. Versuchen Sie, die Signotec Software neu zu starten
5. Versuchen Sie, den Browser neu zu laden (Hard Refresh: Strg+F5)

