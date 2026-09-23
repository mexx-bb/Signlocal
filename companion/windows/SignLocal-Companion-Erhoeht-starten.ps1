# Startet die Installation erhoeht, schreibt sie aber ins Profil des angemeldeten Mitarbeiters.
# Profil und Desktop werden VOR der UAC-Erhoehung erfasst, damit Dateien nicht im Admin-Profil landen.
$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$installer = Join-Path $here "Install-SignLocal-Companion.ps1"
$employeeProfile = $env:USERPROFILE
$employeeDesktop = [Environment]::GetFolderPath("Desktop")

Write-Host "Mitarbeiterprofil: $employeeProfile"
Write-Host "Mitarbeiter-Desktop: $employeeDesktop"
Write-Host "Bitte die Windows-Abfrage als Administrator mit Ja bestaetigen."

if (-not (Test-Path -LiteralPath $installer)) {
    Write-Host "Installer fehlt: $installer" -ForegroundColor Red
    exit 1
}

$argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $installer,
    "-AllowCompanyNetwork",
    "-NoStart",
    "-TargetUserProfile", $employeeProfile,
    "-TargetDesktop", $employeeDesktop
)

function New-EmployeeShortcut {
    param(
        [string]$Path,
        [string]$TargetPath,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$Description
    )
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $TargetPath
    $shortcut.Arguments = $Arguments
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.Description = $Description
    $shortcut.Save()
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Verknuepfung wurde nicht gespeichert: $Path"
    }
}

try {
    $elevated = Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $argList -Wait -PassThru
    if ($null -eq $elevated) { exit 1 }
    if ($elevated.ExitCode -ne 0) { exit $elevated.ExitCode }

    $installRoot = Join-Path $env:LOCALAPPDATA "SignLocal\Companion"
    $runPs1 = Join-Path $installRoot "Start-SignLocal-Companion.ps1"
    $autostartScript = Join-Path $installRoot "SignLocal-Companion-Autostart.ps1"
    if (-not (Test-Path -LiteralPath $runPs1)) {
        throw "Der Companion-Start fehlt: $runPs1"
    }

    Write-Host "Desktop-Verknuepfungen werden im Mitarbeiterkonto angelegt ..."
    New-EmployeeShortcut -Path (Join-Path $employeeDesktop "SignLocal Companion starten.lnk") -TargetPath "powershell.exe" -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$runPs1`"" -WorkingDirectory $installRoot -Description "Startet den lokalen SignLocal-Unterschriftenpad-Companion"
    New-EmployeeShortcut -Path (Join-Path $employeeDesktop "SignLocal Companion Autostart aktivieren.lnk") -TargetPath "powershell.exe" -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$autostartScript`" -Action Enable" -WorkingDirectory $installRoot -Description "Aktiviert den lokalen SignLocal Companion beim Windows-Anmelden"
    New-EmployeeShortcut -Path (Join-Path $employeeDesktop "SignLocal Companion Autostart beenden.lnk") -TargetPath "powershell.exe" -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$autostartScript`" -Action Disable" -WorkingDirectory $installRoot -Description "Beendet den lokalen SignLocal Companion Autostart"
    Write-Host "Verknuepfungen liegen auf dem Desktop." -ForegroundColor Green
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$runPs1`"" -WorkingDirectory $installRoot
    exit 0
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
