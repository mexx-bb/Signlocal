# Signotec Software starten

## Übersicht

Die Signotec Software muss gestartet werden, damit das Signotec Pad von SignLocal erkannt werden kann.

## Automatischer Start

Die Signotec Software sollte normalerweise automatisch beim Windows-Start gestartet werden. Falls nicht:

### 1. Autostart aktivieren

1. Öffnen Sie den Windows Task Manager (Strg+Shift+Esc)
2. Gehen Sie zum Tab "Autostart"
3. Suchen Sie nach "Signotec" oder "signoPAD"
4. Aktivieren Sie den Autostart (Rechtsklick → Aktivieren)

### 2. Manuell starten

#### Option A: Über Startmenü
1. Öffnen Sie das Windows Startmenü
2. Suchen Sie nach "Signotec" oder "signoPAD"
3. Klicken Sie auf die Signotec Anwendung

#### Option B: Über Installationspfad
Typische Installationspfade:
- `C:\Program Files\Signotec\signoPAD Tools\signoPAD.exe`
- `C:\Program Files (x86)\Signotec\signoPAD Tools\signoPAD.exe`

#### Option C: Über PowerShell
```powershell
# Suche nach Signotec EXE
Get-ChildItem -Path "C:\Program Files" -Filter "*signotec*.exe" -Recurse | Select-Object -First 1

# Starte Signotec (Beispiel)
Start-Process "C:\Program Files\Signotec\signoPAD Tools\signoPAD.exe"
```

## Prüfen ob Signotec läuft

### PowerShell-Befehl:
```powershell
# Prüfe laufende Prozesse
Get-Process | Where-Object { $_.ProcessName -like "*signotec*" -or $_.ProcessName -like "*signo*" }

# Prüfe Services
Get-Service | Where-Object { $_.DisplayName -like "*signotec*" }

# Prüfe Port 8080 (Web API)
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

### Manuell prüfen:
1. Öffnen Sie den Task Manager (Strg+Shift+Esc)
2. Suchen Sie nach "signotec" oder "signo" in der Prozessliste
3. Falls nicht gefunden: Signotec läuft nicht

## Signotec Web API starten

Falls Sie die Signotec Web API verwenden möchten:

1. Öffnen Sie die Signotec Software
2. Gehen Sie zu den Einstellungen
3. Aktivieren Sie "Web API" oder "HTTP Service"
4. Der Service läuft normalerweise auf Port 8080

## Troubleshooting

### Signotec startet nicht
1. Prüfen Sie, ob die Signotec Software installiert ist
2. Versuchen Sie, die Signotec Software als Administrator zu starten
3. Prüfen Sie die Windows-Ereignisanzeige auf Fehler

### Pad wird nicht erkannt
1. Stellen Sie sicher, dass Signotec läuft
2. Prüfen Sie die USB-Verbindung
3. Starten Sie die Signotec Software neu
4. Schließen Sie das Pad ab und wieder an

### Web API funktioniert nicht
1. Prüfen Sie, ob Port 8080 belegt ist
2. Aktivieren Sie die Web API in den Signotec Einstellungen
3. Prüfen Sie die Windows-Firewall (Port 8080 muss erlaubt sein)

## Automatischer Start einrichten

### Über geplante Aufgaben:
```powershell
# Erstelle geplante Aufgabe für Signotec Autostart
$action = New-ScheduledTaskAction -Execute "C:\Program Files\Signotec\signoPAD Tools\signoPAD.exe"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Signotec-Autostart" -Action $action -Trigger $trigger
```

### Über Autostart-Ordner:
1. Drücken Sie Windows+R
2. Geben Sie ein: `shell:startup`
3. Erstellen Sie eine Verknüpfung zur Signotec EXE-Datei

## Support

Bei Problemen:
- Signotec Dokumentation: https://docs.signotec.com
- Signotec Support kontaktieren
- Windows-Ereignisanzeige prüfen (Event Viewer)

