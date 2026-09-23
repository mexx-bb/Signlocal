<#
  SignLocal LAN Companion – Windows-Ein-Klick-Installation
  Erstellt ausschließlich lokale TLS-Zertifikate und startet keinen Cloud-Dienst.
  Mit -AllowCompanyNetwork und -TargetUserProfile kann ein Administrator die
  Installation fuer einen Mitarbeiter ohne Admin-Rechte durchfuehren.
  Erlaubt: Firmennetz, Domain, privates WLAN und eigener Laptop-Hotspot.
#>
[CmdletBinding()]
param(
  [string]$AllowedOrigin = "https://mexx-bb.github.io",
  [switch]$NoStart,
  [switch]$AllowCompanyNetwork,
  [string]$TargetUserProfile = "",
  [string]$TargetDesktop = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppName = "SignLocal LAN Companion"
$LocalRoot = if ($TargetUserProfile) { Join-Path $TargetUserProfile "AppData\Local" } else { $env:LOCALAPPDATA }
$InstallRoot = Join-Path $LocalRoot "SignLocal\Companion"
$CertificateRoot = Join-Path $LocalRoot "SignLocal\certs"
$FirewallRuleName = "SignLocal LAN Companion (private WLAN)"
$TaskName = "SignLocal LAN Companion Local Autostart"
$LogRoot = Join-Path $LocalRoot "SignLocal\logs"
$DesktopPath = if ($TargetDesktop) { $TargetDesktop } else { [Environment]::GetFolderPath("Desktop") }
$BundledCompanion = Join-Path $PSScriptRoot "companion"
$script:InstallLogPath = $null
$script:InstallTranscriptStarted = $false

function Get-InstallLogPath {
  $preferred = Join-Path $LogRoot "install.log"
  $fallback = if ($TargetUserProfile) { Join-Path $TargetUserProfile "Signlocal-install.log" } else { Join-Path $env:USERPROFILE "Signlocal-install.log" }
  try {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $preferred) | Out-Null
    return $preferred
  } catch {
    return $fallback
  }
}

function Start-InstallLogging {
  $script:InstallLogPath = Get-InstallLogPath
  try {
    Start-Transcript -Path $script:InstallLogPath -Force | Out-Null
    $script:InstallTranscriptStarted = $true
  } catch {
    "$(Get-Date -Format s) Installationsprotokoll: $($script:InstallLogPath)" | Set-Content -Path $script:InstallLogPath -Encoding utf8
  }
  Write-Host "Installationsprotokoll: $($script:InstallLogPath)" -ForegroundColor DarkGray
}

function Stop-InstallLogging {
  if ($script:InstallTranscriptStarted) {
    try { Stop-Transcript | Out-Null } catch { }
    $script:InstallTranscriptStarted = $false
  }
}

function Write-Stage([string]$Message) {
  Write-Host "`n[$AppName] $Message" -ForegroundColor Cyan
}

function Wait-BeforeClose([string]$Message) {
  Write-Host ""
  Write-Host $Message -ForegroundColor Yellow
  try {
    Read-Host "Enter druecken, um dieses Fenster zu schliessen" | Out-Null
  } catch {
    Start-Sleep -Seconds 60
  }
}

function Save-InstallError([string]$Message) {
  $log = if ($TargetUserProfile) {
    Join-Path $TargetUserProfile "Signlocal-install.log"
  } else {
    Join-Path $env:USERPROFILE "Signlocal-install.log"
  }
  try {
    "$(Get-Date -Format s) $Message" | Add-Content -Path $log -Encoding utf8
  } catch { }
}

function Grant-EmployeeAccess([string]$Path) {
  if (-not $TargetUserProfile -or -not (Test-Path $Path)) { return }
  $employeeAccount = Split-Path -Leaf $TargetUserProfile
  if (Test-Path $Path -PathType Container) {
    & icacls.exe $Path /grant "${employeeAccount}:(OI)(CI)M" /T /C | Out-Null
  } else {
    & icacls.exe $Path /grant "${employeeAccount}:M" /C | Out-Null
  }
}

function Show-OfflineHotspotGuide {
  Write-Host "`nAUSSENDIENST OHNE INTERNET" -ForegroundColor Yellow
  Write-Host "Nach der einmaligen Installation arbeitet die Signaturkopplung ohne Internet nur zwischen diesem Laptop und dem Mobilgeraet."
  Write-Host "1. Oeffne Windows-Einstellungen -> Netzwerk & Internet -> Mobiler Hotspot."
  Write-Host "2. Schalte den mobilen Hotspot ein und merke dir Netzwerkname und Passwort."
  Write-Host "3. Verbinde iPad, iPhone oder Android mit diesem Hotspot."
  Write-Host "4. Oeffne danach den Desktop-Start 'SignLocal Companion starten' und kopple per QR-Code."
  Write-Host "Verwende niemals ein Gaeste- oder oeffentliches WLAN. Die Erstinstallation laedt Node.js, mkcert und Companion-Dateien einmalig aus dem Internet."
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

  Write-Host "Fuer das lokale Zertifikat und die Firewallfreigabe erscheint jetzt die Windows-Bestaetigung (UAC)." -ForegroundColor Yellow
  Write-Host "Bitte mit Ja bestaetigen. Dieses Fenster wartet auf den erhoehten Installer." -ForegroundColor Yellow
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -AllowedOrigin `"$AllowedOrigin`""
  if ($NoStart) { $arguments += " -NoStart" }
  if ($AllowCompanyNetwork) { $arguments += " -AllowCompanyNetwork" }
  if ($TargetUserProfile) { $arguments += " -TargetUserProfile `"$TargetUserProfile`"" }
  if ($TargetDesktop) { $arguments += " -TargetDesktop `"$TargetDesktop`"" }
  try {
    $elevated = Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $arguments -Wait -PassThru
  } catch {
    $message = "UAC-Abfrage abgelehnt oder Start fehlgeschlagen: $($_.Exception.Message)"
    Write-Host $message -ForegroundColor Red
    Save-InstallError $message
    Wait-BeforeClose "Die Windows-Abfrage muss mit Ja bestaetigt werden."
    exit 1
  }
  if ($null -eq $elevated) {
    $message = "Erhoehter Installer konnte nicht gestartet werden (UAC abgelehnt?)."
    Write-Host $message -ForegroundColor Red
    Save-InstallError $message
    Wait-BeforeClose "Die Windows-Abfrage muss mit Ja bestaetigt werden."
    exit 1
  }
  exit $elevated.ExitCode
}

function Ensure-WingetPackage([string]$Id, [string]$FriendlyName) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Windows App Installer (winget) fehlt. Installiere ihn einmal ueber den Microsoft Store und starte dieses Skript erneut."
  }
  Write-Stage "$FriendlyName wird bei Bedarf installiert ..."
  & winget install --id $Id --exact --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity
  if ($LASTEXITCODE -ne 0) { throw "$FriendlyName konnte nicht ueber winget installiert werden." }
  Refresh-ProcessPath
}

function Install-MkcertBinary {
  $toolsDir = Join-Path $LocalRoot "SignLocal\tools"
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  $target = Join-Path $toolsDir "mkcert.exe"
  if (Test-Path -LiteralPath $target) {
    $env:Path = "$toolsDir;" + $env:Path
    return $target
  }

  $arch = "amd64"
  if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { $arch = "arm64" }
  $version = "v1.4.4"
  $url = "https://github.com/FiloSottile/mkcert/releases/download/$version/mkcert-$version-windows-$arch.exe"
  Write-Stage "mkcert wird direkt heruntergeladen ..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing
  if (-not (Test-Path -LiteralPath $target)) {
    throw "mkcert konnte nicht heruntergeladen werden."
  }
  $env:Path = "$toolsDir;" + $env:Path
  return $target
}

function Get-PrivateWirelessAddress {
  $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop |
    Sort-Object -Property RouteMetric, InterfaceMetric |
    Select-Object -First 1
  if (-not $route) { throw "Keine aktive Netzwerkroute gefunden. Verbinde den Computer mit dem Firmennetz, einem privaten WLAN oder dem eigenen Hotspot und starte erneut." }

  $profile = Get-NetConnectionProfile -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop
  $allowedCategories = @("Private", "DomainAuthenticated")
  if ($AllowCompanyNetwork) { $allowedCategories += "Public" }
  if ($allowedCategories -notcontains [string]$profile.NetworkCategory) {
    throw "Das aktuelle Netzwerk ist weder ein Firmennetz noch ein privates WLAN oder ein eigener Hotspot. Gaeste-WLANs bleiben ausgeschlossen."
  }

  $ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 |
    Where-Object { Test-PrivateIPv4 $_.IPAddress } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { throw "Keine passende private IPv4-Adresse gefunden (Firmennetz, Hotspot oder privates WLAN)." }
  return $ip
}

try {
  Ensure-Administrator
  Start-InstallLogging
  Show-OfflineHotspotGuide
  if ($AllowedOrigin -notmatch '^https://[^/]+$') {
    throw "Die erlaubte SignLocal-Adresse muss eine exakte HTTPS-Herkunft ohne Pfad sein."
  }

  Write-Stage "Netzwerk wird geprueft (Firmennetz, Hotspot oder privates WLAN) ..."
  if ($TargetUserProfile) {
    Write-Host "Installation fuer Mitarbeiterprofil: $TargetUserProfile" -ForegroundColor Green
  }
  $localIp = Get-PrivateWirelessAddress
  Write-Host "Lokale Companion-Adresse: $localIp" -ForegroundColor Green

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Ensure-WingetPackage -Id "OpenJS.NodeJS.LTS" -FriendlyName "Node.js LTS"
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js wurde installiert, ist aber in dieser PowerShell noch nicht verfuegbar. Schliesse das Fenster und starte das Skript erneut."
  }
  $mkcertExe = Install-MkcertBinary
  if (-not (Test-Path -LiteralPath $mkcertExe)) {
    throw "mkcert liegt nicht unter $mkcertExe."
  }

  Write-Stage "Mitgelieferte lokale Companion-Dateien werden vorbereitet ..."
  foreach ($requiredFile in @("server.mjs", "package.json", "scripts\prepare-local-cert.sh", "public\index.html", "public\mobile.html", "public\desktop.js", "public\mobile.js", "public\app.css")) {
    if (-not (Test-Path (Join-Path $BundledCompanion $requiredFile))) { throw "Die mitgelieferten Companion-Dateien sind unvollstaendig ($requiredFile). Lade das aktuelle SignLocal-Windows-Paket erneut herunter." }
  }

  if (Test-Path $InstallRoot) { Remove-Item -Recurse -Force $InstallRoot }
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  Copy-Item -Path (Join-Path $BundledCompanion "*") -Destination $InstallRoot -Recurse -Force

  Write-Stage "Lokale Companion-Abhaengigkeiten werden eingerichtet ..."
  Push-Location $InstallRoot
  try {
    & npm install --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Die lokalen Companion-Abhaengigkeiten konnten nicht installiert werden." }
  } finally { Pop-Location }

  Write-Stage "Lokale TLS-Zertifikate werden eingerichtet ..."
  New-Item -ItemType Directory -Force -Path $CertificateRoot | Out-Null
  $certificatePath = Join-Path $CertificateRoot "signlocal-lan-cert.pem"
  $keyPath = Join-Path $CertificateRoot "signlocal-lan-key.pem"
  $publicCaPath = Join-Path $CertificateRoot "Signlocal-Local-CA.pem"
  $caRootDir = Join-Path $CertificateRoot "ca"
  New-Item -ItemType Directory -Force -Path $caRootDir | Out-Null
  $env:CAROOT = $caRootDir
  & $mkcertExe -install
  if ($LASTEXITCODE -ne 0) { throw "Die lokale Zertifizierungsstelle konnte nicht eingerichtet werden." }
  & $mkcertExe -cert-file $certificatePath -key-file $keyPath $localIp
  if ($LASTEXITCODE -ne 0) { throw "Das lokale Serverzertifikat konnte nicht erstellt werden." }
  $publicCaSource = Join-Path $caRootDir "rootCA.pem"
  if (-not (Test-Path -LiteralPath $publicCaSource)) {
    throw "Die oeffentliche CA-Datei wurde nicht erstellt: $publicCaSource"
  }
  Copy-Item -LiteralPath $publicCaSource -Destination $publicCaPath -Force
  Set-Content -Path (Join-Path $CertificateRoot "signlocal-lan-host.txt") -Value $localIp -Encoding ascii

  Get-NetFirewallRule -DisplayName $FirewallRuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
  if ($AllowCompanyNetwork) {
    New-NetFirewallRule -DisplayName $FirewallRuleName -Direction Inbound -Profile Domain,Private,Public -Action Allow -Protocol TCP -LocalPort 8787,8788 | Out-Null
  } else {
    New-NetFirewallRule -DisplayName $FirewallRuleName -Direction Inbound -Profile Domain,Private -Action Allow -Protocol TCP -LocalPort 8787,8788 | Out-Null
  }

  $allowedCategoriesForRuntime = @("Private", "DomainAuthenticated")
  if ($AllowCompanyNetwork) { $allowedCategoriesForRuntime += "Public" }
  $allowedLiteral = ($allowedCategoriesForRuntime | ForEach-Object { "'$_'" }) -join ", "

  # PowerShell-Start: setzt TLS-Pfade korrekt auch bei Umlauten im Benutzernamen.
  $runPs1 = Join-Path $InstallRoot "Start-SignLocal-Companion.ps1"
  @"
# Startet den lokalen SignLocal Companion mit korrekten Unicode-Pfaden.
`$ErrorActionPreference = "Stop"
`$InstallRoot = "$InstallRoot"
`$CertificateRoot = "$CertificateRoot"
`$CaRootDir = "$caRootDir"
`$AllowedOrigin = "$AllowedOrigin"
`$hostRecord = Join-Path `$CertificateRoot "signlocal-lan-host.txt"
`$keyPath = Join-Path `$CertificateRoot "signlocal-lan-key.pem"
`$certificatePath = Join-Path `$CertificateRoot "signlocal-lan-cert.pem"
`$publicCaPath = Join-Path `$CertificateRoot "Signlocal-Local-CA.pem"
if (-not (Test-Path -LiteralPath `$keyPath) -or -not (Test-Path -LiteralPath `$certificatePath)) {
  Write-Host "TLS-Zertifikat fehlt unter `$CertificateRoot" -ForegroundColor Red
  Read-Host "Enter zum Beenden" | Out-Null
  exit 1
}
`$localIp = if (Test-Path -LiteralPath `$hostRecord) { (Get-Content -LiteralPath `$hostRecord -Raw).Trim() } else { "127.0.0.1" }
`$env:CAROOT = `$CaRootDir
`$env:SIGNLOCAL_TLS_KEY = `$keyPath
`$env:SIGNLOCAL_TLS_CERT = `$certificatePath
`$env:SIGNLOCAL_HOST = `$localIp
`$env:SIGNLOCAL_ALLOWED_ORIGIN = `$AllowedOrigin
`$env:SIGNLOCAL_CA_DOWNLOAD = "1"
`$env:SIGNLOCAL_CA_FILE = `$publicCaPath
`$env:SIGNLOCAL_PORT = "8787"
Set-Location -LiteralPath `$InstallRoot
Write-Host ""
Write-Host "SignLocal Companion: Firmennetz, eigener Hotspot oder privates WLAN."
Write-Host ("Lokale Adresse: https://{0}:8787" -f `$localIp)
Write-Host "Auf dem iPad/iPhone zuerst die lokale CA einrichten und den Fingerabdruck vergleichen."
Write-Host "Zum Beenden dieses Fenster schliessen."
Write-Host ""
& node (Join-Path `$InstallRoot "server.mjs")
Write-Host ""
Read-Host "Enter zum Beenden" | Out-Null
"@ | Set-Content -Path $runPs1 -Encoding utf8

  $runScript = Join-Path $InstallRoot "Start-SignLocal-Companion.cmd"
  @"
@echo off
title SignLocal LAN Companion
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-SignLocal-Companion.ps1"
if errorlevel 1 pause
"@ | Set-Content -Path $runScript -Encoding Ascii

  $backgroundScript = Join-Path $InstallRoot "Start-SignLocal-Companion-Background.ps1"
  @"
# Lokaler Benutzerhintergrunddienst fuer Firmennetz, Hotspot oder privates WLAN.
`$ErrorActionPreference = "Continue"
`$InstallRoot = "$InstallRoot"
`$CertificateRoot = "$CertificateRoot"
`$LogRoot = "$LogRoot"
`$CaRootDir = "$caRootDir"
`$AllowedOrigin = "$AllowedOrigin"
`$MkcertExe = "$mkcertExe"
`$env:CAROOT = `$CaRootDir
New-Item -ItemType Directory -Force -Path `$LogRoot | Out-Null

function Test-PrivateIPv4([string]`$Address) { return `$Address -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }
function Get-PrivateWirelessAddress {
  `$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop | Sort-Object -Property RouteMetric, InterfaceMetric | Select-Object -First 1
  `$profile = Get-NetConnectionProfile -InterfaceIndex `$route.InterfaceIndex -ErrorAction Stop
  `$allowed = @($allowedLiteral)
  if (`$allowed -notcontains [string]`$profile.NetworkCategory) { throw "Firmennetz, Domaenennetz, privates WLAN oder eigener Hotspot noetig." }
  `$ip = Get-NetIPAddress -InterfaceIndex `$route.InterfaceIndex -AddressFamily IPv4 | Where-Object { Test-PrivateIPv4 `$_.IPAddress } | Select-Object -First 1 -ExpandProperty IPAddress
  if (-not `$ip) { throw "Keine private IPv4-Adresse aktiv." }
  return `$ip
}

while (`$true) {
  try {
    `$localIp = Get-PrivateWirelessAddress
    `$node = (Get-Command node -ErrorAction Stop).Source
    `$certificatePath = Join-Path `$CertificateRoot "signlocal-lan-cert.pem"
    `$keyPath = Join-Path `$CertificateRoot "signlocal-lan-key.pem"
    `$publicCaPath = Join-Path `$CertificateRoot "Signlocal-Local-CA.pem"
    `$hostRecord = Join-Path `$CertificateRoot "signlocal-lan-host.txt"
    `$storedHost = if (Test-Path `$hostRecord) { (Get-Content -Raw `$hostRecord).Trim() } else { "" }
    if (-not (Test-Path `$certificatePath) -or -not (Test-Path `$keyPath) -or -not (Test-Path `$publicCaPath) -or `$storedHost -ne `$localIp) {
      & `$MkcertExe -cert-file `$certificatePath -key-file `$keyPath `$localIp 2>&1 | Out-File -Append -Encoding utf8 (Join-Path `$LogRoot "companion.log")
      if (`$LASTEXITCODE -ne 0) { throw "Lokales Zertifikat konnte nicht erneuert werden." }
      Copy-Item -LiteralPath (Join-Path `$CaRootDir "rootCA.pem") -Destination `$publicCaPath -Force
      Set-Content -Path `$hostRecord -Value `$localIp -Encoding ascii
    }
    `$env:SIGNLOCAL_TLS_KEY = `$keyPath; `$env:SIGNLOCAL_TLS_CERT = `$certificatePath; `$env:SIGNLOCAL_HOST = `$localIp
    `$env:SIGNLOCAL_ALLOWED_ORIGIN = `$AllowedOrigin; `$env:SIGNLOCAL_CA_DOWNLOAD = "1"; `$env:SIGNLOCAL_CA_FILE = `$publicCaPath; `$env:SIGNLOCAL_PORT = "8787"
    & `$node (Join-Path `$InstallRoot "server.mjs") 2>&1 | Out-File -Append -Encoding utf8 (Join-Path `$LogRoot "companion.log")
  } catch {
    "`$(Get-Date -Format s) Lokaler Companion wartet: `$(`$_.Exception.Message)" | Out-File -Append -Encoding utf8 (Join-Path `$LogRoot "companion.log")
  }
  Start-Sleep -Seconds 30
}
"@ | Set-Content -Path $backgroundScript -Encoding utf8

  $autostartScript = Join-Path $InstallRoot "SignLocal-Companion-Autostart.ps1"
  @"
# Bewusstes Ein- und Ausschalten des lokalen Benutzer-Autostarts.
[CmdletBinding()]
param([ValidateSet("Enable", "Disable", "Status")][string]`$Action = "Status")
`$ErrorActionPreference = "Stop"
`$TaskName = "$TaskName"
`$BackgroundScript = "$backgroundScript"
function Stop-LocalCompanion {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object { `$_.CommandLine -like "*SignLocal*Companion*server.mjs*" } | ForEach-Object { Stop-Process -Id `$_.ProcessId -Force -ErrorAction SilentlyContinue }
}
switch (`$Action) {
  "Enable" {
    if (-not (Test-Path `$BackgroundScript)) { throw "Der lokale Companion-Hintergrundstarter fehlt. Fuehre die aktuelle SignLocal-Installation erneut aus." }
    `$command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + `$BackgroundScript + '"'
    & schtasks.exe /Create /TN `$TaskName /TR `$command /SC ONLOGON /RL LIMITED /F | Out-Null
    if (`$LASTEXITCODE -ne 0) { throw "Der lokale Autostart konnte nicht eingerichtet werden." }
    & schtasks.exe /Run /TN `$TaskName | Out-Null
    Write-Host "Autostart aktiviert. Der Companion laeuft im Firmennetz, am eigenen Hotspot oder im privaten WLAN." -ForegroundColor Green
  }
  "Disable" {
    & schtasks.exe /End /TN `$TaskName 2>`$null | Out-Null
    & schtasks.exe /Delete /TN `$TaskName /F 2>`$null | Out-Null
    Stop-LocalCompanion
    Write-Host "Autostart beendet. Der manuelle Desktop-Start bleibt verfuegbar." -ForegroundColor Yellow
  }
  "Status" { & schtasks.exe /Query /TN `$TaskName 2>`$null; if (`$LASTEXITCODE -ne 0) { Write-Host "Autostart ist nicht aktiv." } }
}
"@ | Set-Content -Path $autostartScript -Encoding utf8

  $signLocalRoot = Join-Path $LocalRoot "SignLocal"
  Grant-EmployeeAccess $signLocalRoot

  $shortcutPath = Join-Path $DesktopPath "SignLocal Companion starten.lnk"
  $autostartEnable = Join-Path $DesktopPath "SignLocal Companion Autostart aktivieren.lnk"
  $autostartDisable = Join-Path $DesktopPath "SignLocal Companion Autostart beenden.lnk"
  try {
    if (-not (Test-Path -LiteralPath $DesktopPath)) {
      throw "Mitarbeiter-Desktop nicht gefunden: $DesktopPath"
    }
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$runPs1`""
    $shortcut.WorkingDirectory = $InstallRoot
    $shortcut.Description = "Startet den lokalen SignLocal-Unterschriftenpad-Companion"
    $shortcut.Save()
    if (-not (Test-Path -LiteralPath $shortcutPath)) { throw "Start-Verknuepfung wurde nicht gespeichert." }

    $enableShortcut = $shell.CreateShortcut($autostartEnable)
    $enableShortcut.TargetPath = "powershell.exe"
    $enableShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$autostartScript`" -Action Enable"
    $enableShortcut.WorkingDirectory = $InstallRoot
    $enableShortcut.Description = "Aktiviert den lokalen SignLocal Companion beim Windows-Anmelden"
    $enableShortcut.Save()

    $disableShortcut = $shell.CreateShortcut($autostartDisable)
    $disableShortcut.TargetPath = "powershell.exe"
    $disableShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$autostartScript`" -Action Disable"
    $disableShortcut.WorkingDirectory = $InstallRoot
    $disableShortcut.Description = "Beendet den lokalen SignLocal Companion Autostart"
    $disableShortcut.Save()
  } catch {
    Write-Host "Desktop-Verknuepfung konnte vom Administrator nicht auf den umgeleiteten Desktop geschrieben werden." -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host "Die Verknuepfungen werden anschliessend im angemeldeten Mitarbeiterkonto angelegt." -ForegroundColor Yellow
  }

  Write-Host "`nInstallation abgeschlossen." -ForegroundColor Green
  Write-Host "Desktop-Start: $shortcutPath"
  Write-Host "Autostart bewusst aktivieren: $autostartEnable"
  Write-Host "Autostart beenden: $autostartDisable"
  Write-Host "Oeffentliche CA-Datei fuer iPad/iPhone: $publicCaPath"
  Write-Host "Wichtig: Die CA-Datei enthaelt keinen privaten Schluessel. Uebertrage niemals die Datei signlocal-lan-key.pem."
  Write-Host "Nutzung: Firmennetz jetzt, spaeter eigener Laptop-Hotspot. Keine Gaeste-/Cafe-WLANs."
  Write-Host "Nach einem Netzwerkwechsel den Desktop-Start erneut oeffnen; das Zertifikat wird bei IP-Wechsel erneuert."
  Write-Host "Mitarbeiter ohne Admin-Rechte starten den Companion ueber die Desktop-Verknuepfung."
  if ($script:InstallLogPath) { Write-Host "Protokoll: $($script:InstallLogPath)" -ForegroundColor DarkGray }
  if (-not $NoStart) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$runPs1`"" -WorkingDirectory $InstallRoot
  }
  Stop-InstallLogging
} catch {
  $message = $_.Exception.Message
  Write-Host "`nInstallation abgebrochen: $message" -ForegroundColor Red
  Write-Host "Es wurden keine PDFs oder Unterschriften hochgeladen."
  if ($script:InstallLogPath) { Write-Host "Protokoll: $($script:InstallLogPath)" -ForegroundColor DarkGray }
  Save-InstallError $message
  Stop-InstallLogging
  Wait-BeforeClose "Bitte die rote Meldung oben ablesen. Das Fenster bleibt offen, bis Enter gedrueckt wird."
  exit 1
}
