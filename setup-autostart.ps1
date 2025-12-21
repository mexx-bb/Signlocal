# SignLocal Autostart Setup
# Dieses Script richtet den automatischen Start für alle Nutzer ein
# UND erstellt die notwendige Firewall-Regel

#Requires -RunAsAdministrator

# --- KONFIGURATION ---
$taskName = "SignLocal-Autostart"
$watchdogTaskName = "SignLocal-Watchdog"
$taskDescription = "Startet den SignLocal-Dienst beim Systemstart und bei Benutzeranmeldung."
$watchdogDescription = "Überwacht den SignLocal-Dienst und startet ihn automatisch neu, falls er abstürzt."
$scriptDir = $PSScriptRoot
$startScriptPath = Join-Path -Path $scriptDir -ChildPath "start-service.ps1"
$watchdogScriptPath = Join-Path -Path $scriptDir -ChildPath "watchdog-service.ps1"
$author = "SYSTEM"
# --- ENDE KONFIGURATION ---

Write-Host "=== SignLocal Autostart Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Erstelle Firewall-Regel für Port 3000
Write-Host "1. Erstelle Firewall-Regel für Port 3000..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "SignLocal" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "   Firewall-Regel existiert bereits" -ForegroundColor Green
} else {
    try {
        New-NetFirewallRule -DisplayName "SignLocal" `
            -Direction Inbound `
            -LocalPort 3000 `
            -Protocol TCP `
            -Action Allow `
            -Description "Erlaubt Zugriff auf SignLocal auf Port 3000" | Out-Null
        Write-Host "   Firewall-Regel erfolgreich erstellt" -ForegroundColor Green
    } catch {
        Write-Host "   WARNUNG: Firewall-Regel konnte nicht erstellt werden: $_" -ForegroundColor Yellow
        Write-Host "   Bitte erstellen Sie die Regel manuell:" -ForegroundColor Yellow
        Write-Host "   New-NetFirewallRule -DisplayName 'SignLocal' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow" -ForegroundColor Gray
    }
}
Write-Host ""

# 2. Prüfe vorhandene geplante Aufgabe
Write-Host "2. Prüfe vorhandene geplante Aufgabe..." -ForegroundColor Yellow
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "   Entferne vorhandene geplante Aufgabe..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "   Vorhandene Aufgabe entfernt" -ForegroundColor Green
} else {
    Write-Host "   Keine vorhandene Aufgabe gefunden" -ForegroundColor Gray
}
Write-Host ""

# 3. Erstelle neue geplante Aufgabe
Write-Host "3. Erstelle geplante Aufgabe für Autostart..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScriptPath`""

# Trigger definieren
$triggerAtStartup = New-ScheduledTaskTrigger -AtStartup
$triggerAtLogon = New-ScheduledTaskTrigger -AtLogOn

# Prinzipal definieren
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Einstellungen für die Aufgabe definieren (mit automatischem Neustart bei Fehlern)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$settings.MultipleInstances = 'IgnoreNew'

try {
    Register-ScheduledTask -TaskName $taskName `
        -Action $action `
        -Trigger $triggerAtStartup, $triggerAtLogon `
        -Principal $principal `
        -Settings $settings `
        -Description $taskDescription `
        -Force | Out-Null
    
    Write-Host "   Geplante Aufgabe erfolgreich erstellt" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Autostart erfolgreich eingerichtet! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Die Anwendung wird jetzt:" -ForegroundColor Yellow
    Write-Host '  ✓ Automatisch beim Systemstart gestartet (vor Anmeldung)' -ForegroundColor Cyan
    Write-Host '  ✓ Automatisch bei jeder Anmeldung gestartet (falls nicht bereits läuft)' -ForegroundColor Cyan
    Write-Host '  ✓ Automatisch neu gestartet bei Abstürzen (Watchdog)' -ForegroundColor Cyan
    Write-Host '  ✓ Für alle Nutzer verfügbar sein (auch ohne Anmeldung)' -ForegroundColor Cyan
    Write-Host '  ✓ Über das Netzwerk erreichbar sein (0.0.0.0:3000)' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Geplante Aufgabe: $taskName" -ForegroundColor Green
    Write-Host ""
    
    # 4. Erstelle Watchdog-Aufgabe
    Write-Host "4. Erstelle Watchdog-Aufgabe für automatischen Neustart..." -ForegroundColor Yellow
    
    $watchdogExistingTask = Get-ScheduledTask -TaskName $watchdogTaskName -ErrorAction SilentlyContinue
    if ($watchdogExistingTask) {
        Write-Host "   Entferne vorhandene Watchdog-Aufgabe..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $watchdogTaskName -Confirm:$false
        Write-Host "   Vorhandene Watchdog-Aufgabe entfernt" -ForegroundColor Green
    }
    
    $watchdogAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdogScriptPath`""
    
    # Watchdog startet nach 2 Minuten und läuft kontinuierlich
    $watchdogTrigger = New-ScheduledTaskTrigger -AtStartup
    $watchdogTrigger.Delay = "PT2M"  # 2 Minuten Verzögerung nach Systemstart
    
    $watchdogSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit 0 -RestartOnIdle:$false
    $watchdogSettings.MultipleInstances = 'Parallel'  # Erlaube mehrere Instanzen für Watchdog
    
    try {
        Register-ScheduledTask -TaskName $watchdogTaskName `
            -Action $watchdogAction `
            -Trigger $watchdogTrigger `
            -Principal $principal `
            -Settings $watchdogSettings `
            -Description $watchdogDescription `
            -Force | Out-Null
        
        Write-Host "   Watchdog-Aufgabe erfolgreich erstellt" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "   WARNUNG: Watchdog-Aufgabe konnte nicht erstellt werden: $_" -ForegroundColor Yellow
        Write-Host "   Der Service wird trotzdem beim Start gestartet, aber nicht automatisch neu gestartet bei Abstürzen." -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Zeige Netzwerk-Adressen
    Write-Host "Die Anwendung ist verfügbar unter:" -ForegroundColor Yellow
    Write-Host "  - http://localhost:3000" -ForegroundColor Cyan
    $hostname = hostname
    Write-Host "  - http://$hostname`:3000" -ForegroundColor Cyan
    $ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -ExpandProperty IPAddress
    foreach ($ip in $ipAddresses) {
        Write-Host "  - http://$ip`:3000" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "Möchten Sie die Anwendung jetzt starten? (J/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "J" -or $response -eq "j" -or $response -eq "Y" -or $response -eq "y") {
        Write-Host "Starte den Dienst jetzt..." -ForegroundColor Yellow
        Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$startScriptPath`""
    }
} catch {
    Write-Host "Fehler beim Erstellen der geplanten Aufgabe: $_" -ForegroundColor Red
    exit 1
}
