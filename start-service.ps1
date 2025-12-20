# SignLocal Service Start Script
# Dieses Script startet SignLocal als Hintergrund-Service für alle Nutzer

$ErrorActionPreference = "Stop"

# Prüfe ob Node.js installiert ist
$nodePath = $null
$possiblePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nodePath = Split-Path $path
        break
    }
}

# Prüfe PATH
if (-not $nodePath) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $nodePath = Split-Path $nodeCmd.Source
    }
}

if (-not $nodePath) {
    Write-Host "FEHLER: Node.js wurde nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Füge Node.js zum PATH hinzu
$env:Path = "$nodePath;$env:Path"

# Wechsle zum Installationsverzeichnis
Set-Location "C:\SignLocal"

# Setze Umgebungsvariablen
$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:HOSTNAME = "0.0.0.0"  # Hört auf allen Netzwerk-Interfaces

# Prüfe ob bereits läuft
$existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
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

if ($existingProcess) {
    Write-Host "SignLocal läuft bereits (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    exit 0
}

# Starte die Anwendung im Hintergrund
Write-Host "Starte SignLocal als Service..." -ForegroundColor Green

# Erstelle ein Log-Verzeichnis
$logDir = "C:\SignLocal\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = Join-Path $logDir "signlocal-service.log"
$errorLogFile = Join-Path $logDir "signlocal-service-error.log"

# Starte im Hintergrund mit Logging
# Next.js verwendet HOSTNAME und PORT Umgebungsvariablen
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "$nodePath\npm.cmd"
$startInfo.Arguments = "run start"
$startInfo.WorkingDirectory = "C:\SignLocal"
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.CreateNoWindow = $true
$startInfo.EnvironmentVariables["NODE_ENV"] = "production"
$startInfo.EnvironmentVariables["PORT"] = "3000"
$startInfo.EnvironmentVariables["HOSTNAME"] = "0.0.0.0"

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo

# Redirect Output
$process.add_OutputDataReceived({
    param($sender, $e)
    if ($e.Data) {
        Add-Content -Path $logFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($e.Data)"
    }
})

$process.add_ErrorDataReceived({
    param($sender, $e)
    if ($e.Data) {
        Add-Content -Path $errorLogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $($e.Data)"
    }
})

$process.Start() | Out-Null
$process.BeginOutputReadLine()
$process.BeginErrorReadLine()

# Speichere PID
$pidFile = "C:\SignLocal\signlocal.pid"
Set-Content -Path $pidFile -Value $process.Id

Write-Host "SignLocal Service gestartet (PID: $($process.Id))" -ForegroundColor Green
Write-Host "Logs: $logFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Die Anwendung ist verfügbar unter:" -ForegroundColor Yellow
Write-Host "  - http://localhost:3000" -ForegroundColor Cyan
Write-Host "  - http://$(hostname):3000" -ForegroundColor Cyan
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -ExpandProperty IPAddress
foreach ($ip in $ipAddresses) {
    Write-Host "  - http://$ip`:3000" -ForegroundColor Cyan
}

