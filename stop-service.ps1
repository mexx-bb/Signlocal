# SignLocal Service Stop Script
# Dieses Script stoppt den SignLocal Service

$ErrorActionPreference = "Stop"

Write-Host "Stoppe SignLocal Service..." -ForegroundColor Yellow

# Prüfe PID-Datei
$pidFile = "C:\SignLocal\signlocal.pid"
if (Test-Path $pidFile) {
    $pid = Get-Content $pidFile
    try {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $pid -Force
            Write-Host "SignLocal Service gestoppt (PID: $pid)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Prozess mit PID $pid nicht gefunden" -ForegroundColor Yellow
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Stoppe alle Node-Prozesse, die SignLocal/next start ausführen
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    try {
        $wmiProc = Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue
        if ($wmiProc -and $wmiProc.CommandLine) {
            return ($wmiProc.CommandLine -like "*next start*" -or $wmiProc.CommandLine -like "*SignLocal*")
        }
    }
    catch {
        return $false
    }
    return $false
}

if ($processes) {
    $processes | ForEach-Object {
        Write-Host "Stoppe Prozess (PID: $($_.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force
    }
    Write-Host "Alle SignLocal Prozesse gestoppt" -ForegroundColor Green
}
else {
    Write-Host "Keine laufenden SignLocal Prozesse gefunden" -ForegroundColor Yellow
}


