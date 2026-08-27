<#
  SignLocal LAN Companion – Windows-Ein-Klick-Installation
  Erstellt ausschließlich lokale TLS-Zertifikate und startet keinen Cloud-Dienst.
  Voraussetzung: ein privates WLAN; nicht in Gäste- oder öffentlichen WLANs verwenden.
#>
[CmdletBinding()]
param(
  [string]$AllowedOrigin = "https://signlocal-etd6sbfb.manus.space",
  [switch]$NoStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppName = "SignLocal LAN Companion"
$InstallRoot = Join-Path $env:LOCALAPPDATA "SignLocal\Companion"
$CertificateRoot = Join-Path $env:LOCALAPPDATA "SignLocal\certs"
$FirewallRuleName = "SignLocal LAN Companion (private WLAN)"
$SourceZip = "https://github.com/mexx-bb/Signlocal/archive/refs/heads/mobile-signlocal.zip"

function Write-Stage([string]$Message) {
  Write-Host "`n[$AppName] $Message" -ForegroundColor Cyan
}

function Show-OfflineHotspotGuide {
  Write-Host "`nAUSSENDIENST OHNE INTERNET" -ForegroundColor Yellow
  Write-Host "Nach der einmaligen Installation arbeitet die Signaturkopplung ohne Internet nur zwischen diesem Laptop und dem Mobilgerät."
  Write-Host "1. Öffne Windows-Einstellungen → Netzwerk & Internet → Mobiler Hotspot."
  Write-Host "2. Schalte den mobilen Hotspot ein und merke dir Netzwerkname und Passwort."
  Write-Host "3. Verbinde iPad, iPhone oder Android mit diesem Hotspot."
  Write-Host "4. Öffne danach den Desktop-Start ‚SignLocal Companion starten‘ und kopple per QR-Code."
  Write-Host "Verwende niemals ein Gäste- oder öffentliches WLAN. Die Erstinstallation lädt Node.js, mkcert und Companion-Dateien einmalig aus dem Internet."
}

function Test-PrivateIPv4([string]$Address) {
  return $Address -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)'
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Ensure-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { return }

  Write-Host "Für das lokale Zertifikat und die Firewallfreigabe erscheint jetzt die Windows-Bestätigung." -ForegroundColor Yellow
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -AllowedOrigin `"$AllowedOrigin`""
  if ($NoStart) { $arguments += " -NoStart" }
  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $arguments
  exit 0
}

function Ensure-WingetPackage([string]$Id, [string]$FriendlyName) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Windows App Installer (winget) fehlt. Installiere ihn einmal über den Microsoft Store und starte dieses Skript erneut."
  }
  Write-Stage "$FriendlyName wird bei Bedarf installiert …"
  & winget install --id $Id --exact --accept-source-agreements --accept-package-agreements --silent
  if ($LASTEXITCODE -ne 0) { throw "$FriendlyName konnte nicht über winget installiert werden." }
  Refresh-ProcessPath
}

function Get-PrivateWirelessAddress {
  $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop |
    Sort-Object -Property RouteMetric, InterfaceMetric |
    Select-Object -First 1
  if (-not $route) { throw "Keine aktive Netzwerkroute gefunden. Verbinde den Computer mit deinem privaten WLAN und starte erneut." }

  $profile = Get-NetConnectionProfile -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop
  if ($profile.NetworkCategory -ne "Private") {
    throw "Das aktuelle Netzwerk ist nicht als Privat eingestuft. Stelle in Windows unter Einstellungen → Netzwerk & Internet → Eigenschaften das WLAN auf Privat und starte erneut. Öffentliche oder Gäste-Netzwerke werden bewusst abgelehnt."
  }

  $ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 |
    Where-Object { Test-PrivateIPv4 $_.IPAddress } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { throw "Im privaten WLAN wurde keine passende private IPv4-Adresse gefunden." }
  return $ip
}

try {
  Ensure-Administrator
  Show-OfflineHotspotGuide
  if ($AllowedOrigin -notmatch '^https://[^/]+$') {
    throw "Die erlaubte SignLocal-Adresse muss eine exakte HTTPS-Herkunft ohne Pfad sein."
  }

  Write-Stage "Privates WLAN wird geprüft …"
  $localIp = Get-PrivateWirelessAddress
  Write-Host "Lokale Companion-Adresse: $localIp" -ForegroundColor Green

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Ensure-WingetPackage -Id "OpenJS.NodeJS.LTS" -FriendlyName "Node.js LTS"
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js wurde installiert, ist aber in dieser PowerShell noch nicht verfügbar. Schließe das Fenster und starte das Skript erneut."
  }
  if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Ensure-WingetPackage -Id "FiloSottile.mkcert" -FriendlyName "mkcert"
  }
  if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    throw "mkcert wurde installiert, ist aber in dieser PowerShell noch nicht verfügbar. Schließe das Fenster und starte das Skript erneut."
  }

  Write-Stage "Lokale Companion-Dateien werden aus deinem GitHub-Branch geladen …"
  $temporaryRoot = Join-Path $env:TEMP ("signlocal-install-" + [Guid]::NewGuid().ToString("N"))
  $zipPath = Join-Path $temporaryRoot "signlocal.zip"
  New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null
  Invoke-WebRequest -Uri $SourceZip -OutFile $zipPath -UseBasicParsing
  Expand-Archive -Path $zipPath -DestinationPath $temporaryRoot -Force
  $sourceCompanion = Get-ChildItem -Path $temporaryRoot -Directory | ForEach-Object { Join-Path $_.FullName "companion" } | Where-Object { Test-Path (Join-Path $_ "server.mjs") } | Select-Object -First 1
  if (-not $sourceCompanion) { throw "Der Companion-Ordner konnte im GitHub-Download nicht gefunden werden." }

  if (Test-Path $InstallRoot) { Remove-Item -Recurse -Force $InstallRoot }
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  Copy-Item -Path (Join-Path $sourceCompanion "*") -Destination $InstallRoot -Recurse -Force

  Write-Stage "Lokale Companion-Abhängigkeiten werden eingerichtet …"
  Push-Location $InstallRoot
  try {
    & npm install --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Die lokalen Companion-Abhängigkeiten konnten nicht installiert werden." }
  } finally { Pop-Location }

  Write-Stage "Lokale TLS-Zertifikate werden eingerichtet …"
  New-Item -ItemType Directory -Force -Path $CertificateRoot | Out-Null
  $certificatePath = Join-Path $CertificateRoot "signlocal-lan-cert.pem"
  $keyPath = Join-Path $CertificateRoot "signlocal-lan-key.pem"
  $publicCaPath = Join-Path $CertificateRoot "Signlocal-Local-CA.pem"
  & mkcert -install
  if ($LASTEXITCODE -ne 0) { throw "Die lokale Zertifizierungsstelle konnte nicht eingerichtet werden." }
  & mkcert -cert-file $certificatePath -key-file $keyPath $localIp
  if ($LASTEXITCODE -ne 0) { throw "Das lokale Serverzertifikat konnte nicht erstellt werden." }
  $caRoot = (& mkcert -CAROOT).Trim()
  Copy-Item -Force -Path (Join-Path $caRoot "rootCA.pem") -Destination $publicCaPath

  Get-NetFirewallRule -DisplayName $FirewallRuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName $FirewallRuleName -Direction Inbound -Profile Private -Action Allow -Protocol TCP -LocalPort 8787,8788 | Out-Null

  $runScript = Join-Path $InstallRoot "Start-SignLocal-Companion.cmd"
  @"
@echo off
title SignLocal LAN Companion – nur privates WLAN
set "SIGNLOCAL_TLS_KEY=$keyPath"
set "SIGNLOCAL_TLS_CERT=$certificatePath"
set "SIGNLOCAL_HOST=$localIp"
set "SIGNLOCAL_ALLOWED_ORIGIN=$AllowedOrigin"
set "SIGNLOCAL_CA_DOWNLOAD=1"
set "SIGNLOCAL_CA_FILE=$publicCaPath"
set "SIGNLOCAL_PORT=8787"
cd /d "$InstallRoot"
echo.
echo SignLocal Companion startet nur im privaten WLAN.
echo Auf dem iPad/iPhone zuerst die lokale CA einrichten und den Fingerabdruck vergleichen.
echo Zum Beenden dieses Fenster schliessen.
node server.mjs
pause
"@ | Set-Content -Path $runScript -Encoding Ascii

  $shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "SignLocal Companion starten.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = "cmd.exe"
  $shortcut.Arguments = "/k `"$runScript`""
  $shortcut.WorkingDirectory = $InstallRoot
  $shortcut.Description = "Startet den lokalen SignLocal-Unterschriftenpad-Companion im privaten WLAN"
  $shortcut.Save()

  Remove-Item -Recurse -Force $temporaryRoot -ErrorAction SilentlyContinue
  Write-Host "`nInstallation abgeschlossen." -ForegroundColor Green
  Write-Host "Desktop-Start: $shortcutPath"
  Write-Host "Öffentliche CA-Datei für dein iPad/iPhone: $publicCaPath"
  Write-Host "Wichtig: Die CA-Datei enthält keinen privaten Schlüssel. Übertrage niemals die Datei signlocal-lan-key.pem."
  Write-Host "Nutze den Companion nur im selben privaten WLAN. Der Companion startet nicht in öffentlichen oder Gäste-Netzen."
  Write-Host "Nach einem WLAN-Wechsel dieses Installationspaket erneut starten, damit das Zertifikat zur neuen lokalen IP passt."
  Write-Host "Für Außendienst ohne Internet: Laptop-Hotspot einschalten, Mobilgerät damit verbinden und danach den Desktop-Start verwenden."
  if (-not $NoStart) { Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$runScript`"" }
} catch {
  Write-Host "`nInstallation abgebrochen: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Es wurden keine PDFs oder Unterschriften hochgeladen."
  exit 1
}
