# SignLocal - Manuelle Installation
# Dieses Script installiert die Dependencies und baut die Anwendung

$ErrorActionPreference = "Stop"

Write-Host "=== SignLocal Installation ===" -ForegroundColor Cyan
Write-Host ""

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
    Write-Host "Bitte installieren Sie Node.js 18.x oder neuer von: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Drücken Sie Enter zum Beenden"
    exit 1
}

# Füge Node.js zum PATH hinzu
$env:Path = "$nodePath;$env:Path"

# Prüfe Node.js Version
$nodeVersion = node --version
Write-Host "Node.js Version: $nodeVersion" -ForegroundColor Green

# Wechsle zum Installationsverzeichnis
Set-Location "C:\SignLocal"

# Installiere Dependencies
Write-Host ""
Write-Host "Installiere Dependencies (dies kann einige Minuten dauern)..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Installation der Dependencies fehlgeschlagen!" -ForegroundColor Red
    Read-Host "Drücken Sie Enter zum Beenden"
    exit 1
}

Write-Host "Dependencies erfolgreich installiert!" -ForegroundColor Green

# Baue die Anwendung
Write-Host ""
Write-Host "Baue die Anwendung..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
# Führe next build direkt mit npx aus, um Windows-Kompatibilitätsprobleme zu vermeiden
& npx next build
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Build fehlgeschlagen!" -ForegroundColor Red
    Read-Host "Drücken Sie Enter zum Beenden"
    exit 1
}

Write-Host "Anwendung erfolgreich gebaut!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Installation abgeschlossen ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sie können die Anwendung jetzt mit start.ps1 starten." -ForegroundColor Green
Write-Host "Oder führen Sie aus: cd C:\SignLocal; .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Read-Host "Drücken Sie Enter zum Beenden"

