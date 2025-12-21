# Definiert den Pfad zum Projektverzeichnis
$scriptDir = $PSScriptRoot
$logDir = Join-Path -Path $scriptDir -ChildPath "logs"
$pidFile = Join-Path -Path $logDir -ChildPath "signlocal.pid"

# Stellt sicher, dass das Log-Verzeichnis existiert
if (-not (Test-Path -Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Prüfen, ob der Prozess bereits läuft, indem wir die PID-Datei lesen
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile
    $process = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "SignLocal-Dienst läuft bereits unter PID $oldPid. Kein Neustart erforderlich."
        Exit 0
    } else {
        Write-Host "PID-Datei gefunden, aber Prozess existiert nicht. Bereinige..."
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
}

# Umgebungsvariablen setzen, damit der Server auf allen Interfaces hört
$env:PORT = "3000"
$env:HOSTNAME = "0.0.0.0"

# Pfad zu Node.js und dem Start-Skript von Next.js
$nodePath = Get-Command node | Select-Object -ExpandProperty Source
$nextScriptPath = Join-Path -Path $scriptDir -ChildPath "node_modules\next\dist\bin\next"

# Startbefehl für die Next.js-Anwendung im Produktionsmodus
$arguments = @(
    "`"$nextScriptPath`"",
    "start",
    "-p", $env:PORT,
    "-H", $env:HOSTNAME
)

# Definiere Log-Dateien
$stdOutLog = Join-Path -Path $logDir -ChildPath "signlocal-service.log"
$stdErrLog = Join-Path -Path $logDir -ChildPath "signlocal-service-error.log"

# Starte den Node.js-Prozess im Hintergrund
Write-Host "Starte SignLocal-Dienst im Hintergrund..."
$processInfo = Start-Process -FilePath $nodePath -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdOutLog -RedirectStandardError $stdErrLog

# Speichere die Prozess-ID (PID) in einer Datei, um den Prozess später stoppen zu können
$processInfo.Id | Out-File -FilePath $pidFile

Write-Host "SignLocal-Dienst gestartet mit PID $($processInfo.Id)."
Write-Host "Logs werden in `"$logDir`" gespeichert."
