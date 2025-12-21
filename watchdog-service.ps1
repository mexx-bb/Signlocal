# SignLocal Watchdog Service
# Überwacht den SignLocal-Dienst und startet ihn neu, falls er nicht läuft
#Requires -RunAsAdministrator

$scriptDir = $PSScriptRoot
$logDir = Join-Path -Path $scriptDir -ChildPath "logs"
$pidFile = Join-Path -Path $logDir -ChildPath "signlocal.pid"
$watchdogLog = Join-Path -Path $logDir -ChildPath "watchdog.log"
$startScriptPath = Join-Path -Path $scriptDir -ChildPath "start-service.ps1"

# Stellt sicher, dass das Log-Verzeichnis existiert
if (-not (Test-Path -Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Write-WatchdogLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Add-Content -Path $watchdogLog -Value $logMessage
    Write-Host $logMessage
}

function Test-ServiceRunning {
    # Prüfe ob Port 3000 belegt ist
    $portCheck = netstat -ano | Select-String ":3000.*ABHÖREN"
    if ($portCheck) {
        return $true
    }
    
    # Prüfe ob PID-Datei existiert und Prozess läuft
    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($pid) {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -eq "node") {
                return $true
            }
        }
    }
    
    return $false
}

function Start-SignLocalService {
    Write-WatchdogLog "Starte SignLocal-Dienst neu..."
    try {
        & $startScriptPath
        Start-Sleep -Seconds 5
        
        if (Test-ServiceRunning) {
            Write-WatchdogLog "SignLocal-Dienst erfolgreich gestartet"
            return $true
        } else {
            Write-WatchdogLog "WARNUNG: Dienst wurde gestartet, aber läuft möglicherweise nicht korrekt"
            return $false
        }
    } catch {
        Write-WatchdogLog "FEHLER beim Starten des Dienstes: $_"
        return $false
    }
}

# Hauptschleife
Write-WatchdogLog "=== SignLocal Watchdog gestartet ==="

# Initiale Wartezeit, damit der Service Zeit hat zu starten
Start-Sleep -Seconds 30

$checkCount = 0
while ($true) {
    $checkCount++
    
    if (-not (Test-ServiceRunning)) {
        Write-WatchdogLog "SignLocal-Dienst läuft nicht! Starte neu..."
        $restartSuccess = Start-SignLocalService
        if (-not $restartSuccess) {
            Write-WatchdogLog "WARNUNG: Neustart war möglicherweise nicht erfolgreich. Prüfe erneut in 2 Minuten..."
            Start-Sleep -Seconds 120
            continue
        }
    } else {
        # Nur alle 10 Prüfungen (10 Minuten) loggen, um Log-Datei nicht zu groß werden zu lassen
        if ($checkCount % 10 -eq 0) {
            Write-WatchdogLog "SignLocal-Dienst läuft korrekt (Prüfung #$checkCount)"
        }
    }
    
    # Warte 60 Sekunden bis zur nächsten Prüfung
    Start-Sleep -Seconds 60
}

