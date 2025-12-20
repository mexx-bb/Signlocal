# SignLocal Autostart - Funktionsweise

## ✅ Ja, es startet automatisch in ALLEN Fällen:

### 1. **Beim Neustart des PCs**
   - Die Anwendung startet **beim Systemstart** (vor der Anmeldung)
   - Läuft als **SYSTEM-Account** (unabhängig vom Benutzer)
   - **Funktioniert auch wenn sich niemand anmeldet**

### 2. **Bei jeder Anmeldung**
   - Die Anwendung startet **bei jeder Anmeldung** (jeder Benutzer)
   - Prüft automatisch, ob bereits eine Instanz läuft (verhindert Doppelstarts)
   - **Funktioniert für Admin UND normale Benutzer**

### 3. **Unabhängig vom Benutzer**
   - Läuft als **SYSTEM-Service**
   - **Nicht abhängig** davon, welcher Benutzer angemeldet ist
   - **Nicht abhängig** davon, ob jemand angemeldet ist

## Konfiguration

Die geplante Aufgabe verwendet:
- **Trigger 1:** `AtStartup` - Startet beim Systemstart
- **Trigger 2:** `AtLogOn` - Startet bei jeder Anmeldung
- **Principal:** `SYSTEM` - Läuft als System-Account
- **LogonType:** `ServiceAccount` - Unabhängig von Benutzeranmeldungen

## Verhalten

1. **PC wird gestartet** → SignLocal startet automatisch (vor Anmeldung)
2. **Benutzer meldet sich an** → SignLocal prüft, ob bereits läuft → Startet nur wenn nicht
3. **Benutzer meldet sich ab** → SignLocal läuft weiter (als SYSTEM)
4. **Anderer Benutzer meldet sich an** → SignLocal läuft bereits, keine neue Instanz

## Testen

Um zu testen, ob es funktioniert:

1. **Neustart-Test:**
   - PC neu starten
   - Warten Sie 30 Sekunden nach dem Start
   - Öffnen Sie `http://localhost:3000` im Browser
   - → Sollte funktionieren, auch ohne Anmeldung

2. **Anmeldungs-Test:**
   - Melden Sie sich als normaler Benutzer (nicht Admin) an
   - Öffnen Sie `http://localhost:3000` im Browser
   - → Sollte funktionieren

3. **Status prüfen:**
   ```powershell
   # Prüfe ob SignLocal läuft:
   Get-Process -Name "node" | Where-Object { 
       (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*next start*" 
   }
   
   # Prüfe geplante Aufgabe:
   Get-ScheduledTask -TaskName "SignLocal-Autostart" | Format-List
   ```

## Wichtig

- Die Anwendung läuft **immer im Hintergrund**
- Sie ist **für alle Nutzer verfügbar**
- Sie ist **über das Netzwerk erreichbar** (0.0.0.0:3000)
- **Keine Anmeldung erforderlich** für den Service


