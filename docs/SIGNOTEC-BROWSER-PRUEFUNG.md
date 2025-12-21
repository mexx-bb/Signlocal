# Signotec Pad - Browser-Prüfung

## Wichtig: JavaScript-Befehle funktionieren nur im Browser!

`window.STPadServerLib` ist ein **JavaScript-Befehl**, der nur in der **Browser-Konsole** funktioniert, nicht in der Windows-Eingabeaufforderung!

## So prüfen Sie, ob die Bibliothek geladen wurde:

### Schritt 1: Öffnen Sie die Anwendung im Browser
1. Öffnen Sie `http://localhost:3000` im Browser (Chrome, Edge, Firefox)
2. **WICHTIG:** Laden Sie die Seite neu mit **Hard Refresh**:
   - **Windows:** `Strg + F5` oder `Strg + Umschalt + R`
   - **Mac:** `Cmd + Umschalt + R`

### Schritt 2: Öffnen Sie die Browser-Konsole
1. Drücken Sie **F12** (oder Rechtsklick → "Untersuchen" / "Inspect")
2. Gehen Sie zum Tab **"Console"** (Konsole)

### Schritt 3: Prüfen Sie, ob die Bibliothek geladen wurde
Geben Sie in der **Browser-Konsole** (nicht in Windows-Eingabeaufforderung!) ein:

```javascript
window.STPadServerLib
```

**Erwartetes Ergebnis:**
- ✅ **Wenn geladen:** Es wird ein Objekt angezeigt (z.B. `{...}` oder `Object`)
- ❌ **Wenn nicht geladen:** Es wird `undefined` angezeigt

### Schritt 4: Prüfen Sie alle verfügbaren Signotec-Objekte
Geben Sie in der Browser-Konsole ein:

```javascript
console.log('STPadServerLib:', window.STPadServerLib);
console.log('STPadServerLibDefault:', window.STPadServerLibDefault);
console.log('STPadServerLibApi:', window.STPadServerLibApi);
```

### Schritt 5: Versuchen Sie, eine Signatur zu erfassen
1. Öffnen Sie ein Dokument in SignLocal
2. Klicken Sie auf "Signieren" bei einem Signaturfeld
3. Wählen Sie den Tab "Signotec Pad"
4. Klicken Sie auf "Signatur erfassen"
5. Schauen Sie in die Browser-Konsole auf Debug-Meldungen

## Häufige Probleme:

### Problem: `window.STPadServerLib` ist `undefined`
**Lösung:**
1. Laden Sie die Seite neu (Hard Refresh: `Strg + F5`)
2. Prüfen Sie im Network-Tab (F12 → Network), ob `STPadServerLib.js` geladen wurde
3. Prüfen Sie, ob die Datei `C:\SignLocal\public\STPadServerLib.js` existiert

### Problem: Die Bibliothek wird nicht geladen
**Lösung:**
1. Prüfen Sie die Browser-Konsole auf Fehler (roter Text)
2. Prüfen Sie im Network-Tab, ob `STPadServerLib.js` einen 404-Fehler hat
3. Stellen Sie sicher, dass die Datei im `public`-Ordner liegt

### Problem: CORS-Fehler
**Lösung:**
- Die Datei sollte aus dem `public`-Ordner geladen werden (nicht von einem anderen Server)
- Prüfen Sie, ob Next.js die Datei korrekt serviert

## Debug-Informationen sammeln:

Öffnen Sie die Browser-Konsole (F12) und führen Sie aus:

```javascript
// Prüfe alle verfügbaren Signotec-Objekte
console.log('=== Signotec Debug ===');
console.log('STPadServerLib:', typeof window.STPadServerLib);
console.log('STPadServerLibDefault:', typeof window.STPadServerLibDefault);
console.log('STPadServerLibApi:', typeof window.STPadServerLibApi);
console.log('Signotec:', typeof window.Signotec);
console.log('SignotecPlugin:', typeof window.SignotecPlugin);
```

## Wichtig:

- **NICHT** in der Windows-Eingabeaufforderung eingeben!
- **NUR** in der Browser-Konsole (F12 → Console) eingeben!
- Die Seite muss neu geladen werden, damit das Script geladen wird!

