# SignLocal Service - Anleitung

## Übersicht

SignLocal wurde als Hintergrund-Service konfiguriert, der:
- ✅ Automatisch beim Systemstart startet
- ✅ Für alle Nutzer verfügbar ist (auch ohne Anmeldung)
- ✅ Über das Netzwerk erreichbar ist (nicht nur localhost)
- ✅ Im Hintergrund läuft

## Verfügbare Scripts

### 1. `setup-autostart.ps1`
Richtet den automatischen Start ein. **Muss als Administrator ausgeführt werden.**

```powershell
Start-Process powershell.exe -ArgumentList '-ExecutionPolicy Bypass -File C:\SignLocal\setup-autostart.ps1' -Verb RunAs
```

### 2. `start-service.ps1`
Startet SignLocal als Hintergrund-Service. Die Anwendung hört auf:
- `http://localhost:3000` (lokal)
- `http://<hostname>:3000` (Netzwerk)
- `http://<IP-Adresse>:3000` (Netzwerk)

```powershell
cd C:\SignLocal
.\start-service.ps1
```

### 3. `stop-service.ps1`
Stoppt den SignLocal Service.

```powershell
cd C:\SignLocal
.\stop-service.ps1
```

## Netzwerk-Zugriff

Die Anwendung ist standardmäßig auf **allen Netzwerk-Interfaces** verfügbar (0.0.0.0:3000).

**WICHTIG:** Stellen Sie sicher, dass die Windows-Firewall Port 3000 erlaubt:

```powershell
# Als Administrator ausführen:
New-NetFirewallRule -DisplayName "SignLocal" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## Logs

Logs werden gespeichert unter:
- `C:\SignLocal\logs\signlocal-service.log` (Standard-Output)
- `C:\SignLocal\logs\signlocal-service-error.log` (Fehler)

## Status prüfen

```powershell
# Prüfe ob SignLocal läuft:
Get-Process -Name "node" | Where-Object { (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*next start*" }

# Prüfe geplante Aufgabe:
Get-ScheduledTask -TaskName "SignLocal-Autostart"
```

## Deinstallation

1. Stoppen Sie den Service:
   ```powershell
   cd C:\SignLocal
   .\stop-service.ps1
   ```

2. Entfernen Sie die geplante Aufgabe:
   ```powershell
   # Als Administrator:
   Unregister-ScheduledTask -TaskName "SignLocal-Autostart" -Confirm:$false
   ```

## Troubleshooting

### Service startet nicht
- Prüfen Sie die Logs in `C:\SignLocal\logs\`
- Stellen Sie sicher, dass Node.js installiert ist
- Prüfen Sie, ob Port 3000 bereits belegt ist

### Nicht über Netzwerk erreichbar
- Prüfen Sie die Windows-Firewall-Regeln
- Stellen Sie sicher, dass `HOSTNAME=0.0.0.0` gesetzt ist
- Prüfen Sie die Netzwerk-IP-Adresse des Servers

### Service stoppt nach Neustart
- Prüfen Sie die geplante Aufgabe: `Get-ScheduledTask -TaskName "SignLocal-Autostart"`
- Stellen Sie sicher, dass die Aufgabe als SYSTEM ausgeführt wird


