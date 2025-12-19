# SignLocal - Schnellstart-Anleitung

## Ein-Klick-Installation für Windows

Diese Anleitung beschreibt, wie Sie SignLocal mit nur einem Klick installieren und automatisch bei jedem Systemstart aktivieren können.

### Voraussetzungen

- **Windows 10 oder neuer**
- **Node.js 18.x oder neuer** muss installiert sein
  - Download: [https://nodejs.org/](https://nodejs.org/)
  - Empfohlen: LTS-Version (Long Term Support)

### Installationsschritte

1. **SignLocal herunterladen**
   - Laden Sie das Repository als ZIP-Datei herunter
   - Oder klonen Sie es mit Git: `git clone https://github.com/mexx-bb/Signlocal.git`

2. **Entpacken** (falls als ZIP heruntergeladen)
   - Entpacken Sie die Datei in einen Ordner Ihrer Wahl
   - Beispiel: `C:\Programme\SignLocal\`

3. **Installation starten**
   
   **Methode 1: Rechtsklick (empfohlen)**
   - Navigieren Sie zum SignLocal-Ordner
   - Rechtsklicken Sie auf die Datei `install.ps1`
   - Wählen Sie **"Mit PowerShell ausführen"**
   - Bestätigen Sie ggf. die Administrator-Berechtigung

   **Methode 2: PowerShell (Alternative)**
   - Öffnen Sie PowerShell als Administrator
   - Navigieren Sie zum SignLocal-Ordner:
     ```powershell
     cd C:\Programme\SignLocal
     ```
   - Führen Sie das Installationsskript aus:
     ```powershell
     .\install.ps1
     ```

4. **Warten Sie auf die Installation**
   - Das Skript prüft die Systemvoraussetzungen
   - Installiert alle notwendigen Abhängigkeiten
   - Erstellt die Anwendung
   - Richtet den automatischen Start ein
   - Startet die Anwendung

5. **Fertig!**
   - Die Anwendung öffnet sich automatisch im Browser
   - Zugriff über: [http://localhost:3000](http://localhost:3000)
   - Eine Desktop-Verknüpfung wurde erstellt

### Was macht das Installationsskript?

Das `install.ps1`-Skript führt folgende Aktionen automatisch aus:

✅ Überprüft, ob Node.js (Version 18+) installiert ist  
✅ Installiert alle npm-Abhängigkeiten  
✅ Erstellt die Produktionsversion der Anwendung  
✅ Erstellt eine Desktop-Verknüpfung für manuellen Start  
✅ Richtet einen Windows-Task ein, der SignLocal bei jedem Systemstart automatisch startet  
✅ Startet die Anwendung sofort  

### Nach der Installation

- **Automatischer Start**: SignLocal startet automatisch bei jedem Systemstart im Hintergrund
- **Zugriff**: Öffnen Sie [http://localhost:3000](http://localhost:3000) im Browser
- **Desktop-Verknüpfung**: Verwenden Sie die Verknüpfung, um die Anwendung manuell zu starten
- **Logdatei**: Installationsdetails finden Sie in `install.log`

### Optionale Parameter

Das Installationsskript unterstützt folgende Parameter:

```powershell
# Installation ohne automatischen Start
.\install.ps1 -SkipAutostart

# Installation mit anderem Port (Standard: 3000)
.\install.ps1 -Port 8080
```

### Deinstallation

Um den automatischen Start zu entfernen und die Verknüpfungen zu löschen:

1. Navigieren Sie zum SignLocal-Ordner
2. Führen Sie aus:
   ```powershell
   .\uninstall.ps1
   ```

**Hinweis**: Das Deinstallationsskript entfernt:
- Die geplante Aufgabe für den automatischen Start
- Die Desktop-Verknüpfung
- Das Startup-Skript

Die Anwendungsdateien selbst bleiben erhalten. Um SignLocal vollständig zu entfernen, löschen Sie den gesamten Ordner manuell.

### Problembehandlung

**Problem: "Die Ausführung von Skripts ist auf diesem System deaktiviert"**

Lösung: Führen Sie PowerShell als Administrator aus und setzen Sie die Execution Policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Problem: Node.js nicht gefunden**

Lösung: Installieren Sie Node.js von [nodejs.org](https://nodejs.org/), starten Sie den Computer neu und versuchen Sie es erneut.

**Problem: Installation schlägt fehl**

Lösung: 
1. Überprüfen Sie die `install.log` Datei auf Fehlerdetails
2. Stellen Sie sicher, dass Sie Administratorrechte haben
3. Prüfen Sie, ob genügend Speicherplatz vorhanden ist
4. Versuchen Sie eine manuelle Installation (siehe README.md)

### Manuelle Steuerung

**Anwendung manuell starten:**
```powershell
cd C:\Programme\SignLocal
npm run start
```

**Anwendung stoppen:**
- Schließen Sie das PowerShell-Fenster, in dem die Anwendung läuft
- Oder über den Task-Manager: Prozess "node.exe" beenden

**Geplante Aufgabe anzeigen:**
```powershell
Get-ScheduledTask -TaskName "SignLocal-Autostart"
```

**Geplante Aufgabe deaktivieren (ohne Deinstallation):**
```powershell
Disable-ScheduledTask -TaskName "SignLocal-Autostart"
```

**Geplante Aufgabe aktivieren:**
```powershell
Enable-ScheduledTask -TaskName "SignLocal-Autostart"
```

### Sicherheitshinweise

- Das Installationsskript benötigt Administrator-Rechte, um die geplante Aufgabe zu erstellen
- Alle Daten bleiben lokal auf Ihrem Computer
- Es werden keine Daten an externe Server gesendet
- Die Anwendung läuft komplett offline

### Support

Bei Problemen oder Fragen:
- Öffnen Sie ein Issue auf GitHub: [https://github.com/mexx-bb/Signlocal/issues](https://github.com/mexx-bb/Signlocal/issues)
- Überprüfen Sie die `install.log` für Details
