# SignLocal Autostart Setup
# Dieses Script richtet den automatischen Start für alle Nutzer ein

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

$TaskName = "SignLocal-Autostart"
$ScriptPath = "C:\SignLocal\start-service.ps1"

Write-Host "=== SignLocal Autostart Setup ===" -ForegroundColor Cyan
Write-Host ""

# Entferne vorhandene Aufgabe
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Entferne vorhandene geplante Aufgabe..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Erstelle neue geplante Aufgabe
Write-Host "Erstelle geplante Aufgabe für Autostart..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

# Starte beim Systemstart (vor Anmeldung) UND bei jeder Anmeldung
$trigger1 = New-ScheduledTaskTrigger -AtStartup
$trigger2 = New-ScheduledTaskTrigger -AtLogOn
$triggers = @($trigger1, $trigger2)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -DontStopOnIdleEnd `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# Führe als SYSTEM aus (für alle Nutzer)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $TaskName `
        -Action $action `
        -Trigger $triggers `
        -Settings $settings `
        -Principal $principal `
        -Description "Startet SignLocal automatisch beim Systemstart und bei jeder Anmeldung für alle Nutzer" `
        -Force | Out-Null
    
    Write-Host ""
    Write-Host "Autostart erfolgreich eingerichtet!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Die Anwendung wird jetzt:" -ForegroundColor Yellow
    Write-Host "  - Automatisch beim Systemstart gestartet (vor Anmeldung)" -ForegroundColor Cyan
    Write-Host "  - Automatisch bei jeder Anmeldung gestartet (falls nicht bereits läuft)" -ForegroundColor Cyan
    Write-Host "  - Für alle Nutzer verfügbar sein (auch ohne Anmeldung)" -ForegroundColor Cyan
    Write-Host "  - Über das Netzwerk erreichbar sein (0.0.0.0:3000)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Geplante Aufgabe: $TaskName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Möchten Sie die Anwendung jetzt starten? (J/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "J" -or $response -eq "j" -or $response -eq "Y" -or $response -eq "y") {
        Write-Host ""
        Write-Host "Starte SignLocal..." -ForegroundColor Green
        & $ScriptPath
    }
}
catch {
    Write-Host ""
    Write-Host "FEHLER beim Erstellen der geplanten Aufgabe: $_" -ForegroundColor Red
    Write-Host "Bitte führen Sie dieses Script als Administrator aus!" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Read-Host "Drücken Sie Enter zum Beenden"

