#Requires -RunAsAdministrator

# --- KONFIGURATION ---
$taskName = "SignLocal-Autostart"
$taskDescription = "Startet den SignLocal-Dienst beim Systemstart und bei Benutzeranmeldung."
$scriptDir = $PSScriptRoot
$startScriptPath = Join-Path -Path $scriptDir -ChildPath "start-service.ps1"
$author = "SYSTEM"
# --- ENDE KONFIGURATION ---

Write-Host "Richte automatischen Start für SignLocal ein..."

# 1. Prüfen, ob die Aufgabe bereits existiert und ggf. entfernen
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Bestehende Aufgabe '$taskName' gefunden. Sie wird entfernt und neu erstellt."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 2. Aktion definieren: Startet das start-service.ps1 Skript
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -File `"$startScriptPath`""

# 3. Trigger definieren
# Trigger 1: Beim Systemstart
$triggerAtStartup = New-ScheduledTaskTrigger -AtStartup
# Trigger 2: Bei jeder Benutzeranmeldung
$triggerAtLogon = New-ScheduledTaskTrigger -AtLogOn

# 4. Prinzipal definieren (als welcher Benutzer wird es ausgeführt)
# Führt die Aufgabe als 'SYSTEM' Account aus, unabhängig davon, ob ein Benutzer angemeldet ist.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

# 5. Einstellungen für die Aufgabe definieren
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit 0
$settings.MultipleInstances = 'IgnoreNew' # Verhindert, dass die Aufgabe mehrfach gestartet wird

# 6. Geplante Aufgabe registrieren (erstellen)
Write-Host "Erstelle geplante Aufgabe '$taskName'..."
Register-ScheduledTask -TaskName $taskName `
    -Action $action `
    -Trigger $triggerAtStartup, $triggerAtLogon `
    -Principal $principal `
    -Settings $settings `
    -Description $taskDescription

Write-Host "Geplante Aufgabe '$taskName' wurde erfolgreich erstellt."
Write-Host "SignLocal wird nun automatisch beim Systemstart und bei jeder Benutzeranmeldung gestartet."
Write-Host "Sie können den Status mit 'Get-ScheduledTask -TaskName $taskName' überprüfen."

# Starte den Dienst sofort, falls er noch nicht läuft
Write-Host "Starte den Dienst jetzt..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$startScriptPath`""

Write-Host "Einrichtung abgeschlossen."
# Optional: 5 Sekunden warten, damit der Benutzer die Ausgabe lesen kann
Start-Sleep -Seconds 5
