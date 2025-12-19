# SignLocal - Uninstall Script
# This script removes SignLocal autostart and cleans up shortcuts

#Requires -RunAsAdministrator

# Configuration
$AppName = "SignLocal"
$TaskName = "SignLocal-Autostart"
$ScriptPath = $PSScriptRoot
$LogFile = Join-Path $ScriptPath "uninstall.log"

# Function to write log messages
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

Write-Log "=== Starting $AppName Uninstallation ==="

# Stop running instances
Write-Log "Stopping any running instances of $AppName..."
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*next start*" -or $_.CommandLine -like "*SignLocal*"
}

if ($processes) {
    Write-Log "Found $($processes.Count) running instance(s). Stopping..."
    $processes | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Log "Processes stopped."
}
else {
    Write-Log "No running instances found."
}

# Remove scheduled task
Write-Log "Removing scheduled task..."
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Log "Scheduled task removed successfully."
    }
    catch {
        Write-Log "ERROR: Failed to remove scheduled task: $_"
    }
}
else {
    Write-Log "Scheduled task not found (may have been removed already)."
}

# Remove desktop shortcut
Write-Log "Removing desktop shortcut..."
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "$AppName.lnk"
if (Test-Path $ShortcutPath) {
    try {
        Remove-Item $ShortcutPath -Force
        Write-Log "Desktop shortcut removed."
    }
    catch {
        Write-Log "ERROR: Failed to remove desktop shortcut: $_"
    }
}
else {
    Write-Log "Desktop shortcut not found."
}

# Remove startup script
$startupScriptPath = Join-Path $ScriptPath "start-signlocal.ps1"
if (Test-Path $startupScriptPath) {
    try {
        Remove-Item $startupScriptPath -Force
        Write-Log "Startup script removed."
    }
    catch {
        Write-Log "ERROR: Failed to remove startup script: $_"
    }
}

Write-Log "=== Uninstallation Complete ==="
Write-Log ""
Write-Log "The following have been removed:"
Write-Log "  - Autostart scheduled task"
Write-Log "  - Desktop shortcut"
Write-Log "  - Startup script"
Write-Log ""
Write-Log "Note: Application files, dependencies, and build artifacts remain in:"
Write-Log "  $ScriptPath"
Write-Log ""
Write-Log "To completely remove the application, manually delete this folder."
Write-Log "You may also want to uninstall Node.js if you no longer need it."
Write-Log ""

Read-Host "Press Enter to exit"
