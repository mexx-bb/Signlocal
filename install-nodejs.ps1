# Node.js Installations-Script
# Dieses Script lädt Node.js herunter und installiert es

$ErrorActionPreference = "Stop"

Write-Host "=== Node.js Installation ===" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob bereits installiert
$nodePaths = @("C:\Program Files\nodejs\node.exe", "C:\Program Files (x86)\nodejs\node.exe")
foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        Write-Host "Node.js ist bereits installiert: $path" -ForegroundColor Green
        & $path --version
        exit 0
    }
}

# Lade Node.js LTS Version herunter
$nodeVersion = "20.18.0"
$arch = "x64"
$url = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-x64.msi"
$installer = "$env:TEMP\nodejs-installer.msi"

Write-Host "Lade Node.js v$nodeVersion herunter..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
    Write-Host "Download abgeschlossen!" -ForegroundColor Green
}
catch {
    Write-Host "FEHLER beim Download: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starte Installation..." -ForegroundColor Yellow
Write-Host "Bitte warten Sie, bis die Installation abgeschlossen ist." -ForegroundColor Yellow
Write-Host ""

# Starte Installation (nicht im Silent-Modus, damit der Benutzer den Fortschritt sieht)
Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /passive" -Wait

# Warte kurz
Start-Sleep -Seconds 3

# Prüfe Installation
$nodePath = "C:\Program Files\nodejs\node.exe"
if (Test-Path $nodePath) {
    Write-Host ""
    Write-Host "Node.js erfolgreich installiert!" -ForegroundColor Green
    $env:Path = "C:\Program Files\nodejs;$env:Path"
    & $nodePath --version
    & "C:\Program Files\nodejs\npm.cmd" --version
    Write-Host ""
    Write-Host "WICHTIG: Bitte starten Sie eine neue PowerShell-Session," -ForegroundColor Yellow
    Write-Host "damit Node.js im PATH verfügbar ist." -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "Installation abgeschlossen, aber Node.js nicht im erwarteten Pfad gefunden." -ForegroundColor Yellow
    Write-Host "Bitte starten Sie eine neue PowerShell-Session und prüfen Sie mit: node --version" -ForegroundColor Yellow
}

# Lösche Installer
Remove-Item $installer -Force -ErrorAction SilentlyContinue

Write-Host ""
Read-Host "Drücken Sie Enter zum Beenden"

