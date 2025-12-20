# SignLocal - Schnellstart

## ✅ Aktueller Status

Die Anwendung läuft jetzt! Sie können sie unter folgenden Adressen erreichen:

- **http://localhost:3000** ← Verwenden Sie diese Adresse!
- http://DESKTOP-LSO81TG:3000 (Hostname)
- http://192.168.178.37:3000 (IP-Adresse)
- http://192.168.68.58:3000 (IP-Adresse)

## ⚠️ WICHTIG: Adressen

**Verwenden Sie:** `http://localhost:3000` (oder die IP-Adresse)

**NICHT verwenden:** `http://0.0.0.0:3000`

`0.0.0.0` ist nur die **Bind-Adresse** (der Server hört auf allen Interfaces), aber Sie greifen mit `localhost` oder der IP-Adresse darauf zu.

## 🔧 Autostart einrichten

Damit die Anwendung automatisch startet (bei Neustart und Anmeldung), führen Sie aus:

```powershell
Start-Process powershell.exe -ArgumentList '-ExecutionPolicy Bypass -File C:\SignLocal\setup-autostart.ps1' -Verb RunAs
```

**Oder:** Rechtsklick auf `setup-autostart.ps1` → "Als Administrator ausführen"

## 📋 Verfügbare Befehle

### Service starten:
```powershell
cd C:\SignLocal
.\start-service.ps1
```

### Service stoppen:
```powershell
cd C:\SignLocal
.\stop-service.ps1
```

### Status prüfen:
```powershell
# Prüfe ob läuft:
Get-Process -Name "node" | Where-Object { 
    (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*next start*" 
}

# Prüfe geplante Aufgabe:
Get-ScheduledTask -TaskName "SignLocal-Autostart"
```

## 🔍 Problembehandlung

### Anwendung startet nicht automatisch?
1. Prüfen Sie, ob die geplante Aufgabe existiert:
   ```powershell
   Get-ScheduledTask -TaskName "SignLocal-Autostart"
   ```
2. Falls nicht: Führen Sie `setup-autostart.ps1` als Administrator aus
3. Prüfen Sie die Logs: `C:\SignLocal\logs\signlocal-service.log`

### Kann nicht auf localhost:3000 zugreifen?
1. Prüfen Sie, ob die Anwendung läuft (siehe Status prüfen oben)
2. Prüfen Sie die Windows-Firewall (Port 3000 muss erlaubt sein)
3. Versuchen Sie die IP-Adresse statt localhost

### Port 3000 bereits belegt?
```powershell
# Prüfe was auf Port 3000 läuft:
Get-NetTCPConnection -LocalPort 3000

# Stoppe SignLocal:
cd C:\SignLocal
.\stop-service.ps1
```

