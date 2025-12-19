# SignLocal - One-Click Installation Script
# This script installs SignLocal and sets it up to start automatically at system startup

#Requires -RunAsAdministrator

param(
    [switch]$SkipAutostart,
    [int]$Port = 3000
)

# Configuration
$AppName = "SignLocal"
$TaskName = "SignLocal-Autostart"
$ScriptPath = $PSScriptRoot
$LogFile = Join-Path $ScriptPath "install.log"

# Function to write log messages
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Function to check if Node.js is installed
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Log "Node.js is installed: $nodeVersion"
            
            # Extract version number and check if it's >= 18
            $versionNumber = [version]($nodeVersion -replace 'v','').Split('.')[0..2] -join '.'
            $minVersion = [version]"18.0.0"
            
            if ([version]$versionNumber -ge $minVersion) {
                return $true
            } else {
                Write-Log "Node.js version $nodeVersion is too old. Please install Node.js 18.x or newer."
                return $false
            }
        }
        return $false
    }
    catch {
        return $false
    }
}

# Function to check if npm is installed
function Test-NPM {
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Write-Log "npm is installed: v$npmVersion"
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Function to stop any running instances
function Stop-SignLocal {
    Write-Log "Checking for running instances of SignLocal..."
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*next start*" -or $_.CommandLine -like "*SignLocal*"
    }
    
    if ($processes) {
        Write-Log "Stopping running instances..."
        $processes | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
}

# Main installation process
Write-Log "=== Starting $AppName Installation ==="
Write-Log "Installation directory: $ScriptPath"

# Check prerequisites
Write-Log "Checking prerequisites..."

if (-not (Test-NodeJS)) {
    Write-Log "ERROR: Node.js 18.x or newer is required but not found."
    Write-Log "Please download and install Node.js from: https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-NPM)) {
    Write-Log "ERROR: npm is required but not found."
    Write-Log "npm should be installed with Node.js. Please reinstall Node.js."
    Read-Host "Press Enter to exit"
    exit 1
}

# Stop any running instances
Stop-SignLocal

# Install dependencies
Write-Log "Installing dependencies (this may take a few minutes)..."
try {
    $env:NODE_ENV = "production"
    & npm install --production 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
    Write-Log "Dependencies installed successfully."
}
catch {
    Write-Log "ERROR: Failed to install dependencies: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Build the application
Write-Log "Building the application..."
try {
    $env:NODE_ENV = "production"
    & npm run build 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE"
    }
    Write-Log "Application built successfully."
}
catch {
    Write-Log "ERROR: Failed to build application: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Create a startup script
$startupScriptPath = Join-Path $ScriptPath "start-signlocal.ps1"
$startupScriptContent = @"
# SignLocal Startup Script
Set-Location -Path "$ScriptPath"
`$env:PORT = $Port
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "start"
"@

Set-Content -Path $startupScriptPath -Value $startupScriptContent
Write-Log "Created startup script at: $startupScriptPath"

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "$AppName.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupScriptPath`""
$Shortcut.WorkingDirectory = $ScriptPath
$Shortcut.Description = "Start SignLocal Application"
$Shortcut.Save()
Write-Log "Created desktop shortcut: $ShortcutPath"

# Set up autostart if not skipped
if (-not $SkipAutostart) {
    Write-Log "Setting up automatic startup..."
    
    # Remove existing task if it exists
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Log "Removing existing scheduled task..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Create a new scheduled task
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupScriptPath`""
    
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable:$false `
        -DontStopOnIdleEnd
    
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
    
    try {
        Register-ScheduledTask -TaskName $TaskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Principal $principal `
            -Description "Automatically start SignLocal at system startup" `
            -Force | Out-Null
        
        Write-Log "Scheduled task created successfully."
        Write-Log "$AppName will now start automatically at system startup."
    }
    catch {
        Write-Log "WARNING: Failed to create scheduled task: $_"
        Write-Log "You can start the application manually using the desktop shortcut."
    }
}
else {
    Write-Log "Skipping automatic startup configuration (SkipAutostart flag set)."
}

# Start the application
Write-Log "Starting $AppName..."
try {
    Start-Process -NoNewWindow -FilePath "powershell.exe" `
        -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupScriptPath`""
    
    Write-Log "Application started successfully."
    Write-Log "Please wait a few seconds for the application to initialize..."
    Start-Sleep -Seconds 5
    
    # Open browser
    $url = "http://localhost:$Port"
    Write-Log "Opening browser at: $url"
    Start-Process $url
}
catch {
    Write-Log "WARNING: Failed to start application automatically: $_"
    Write-Log "You can start it manually using the desktop shortcut."
}

Write-Log "=== Installation Complete ==="
Write-Log ""
Write-Log "Summary:"
Write-Log "  - Application installed in: $ScriptPath"
Write-Log "  - Desktop shortcut created: $ShortcutPath"
if (-not $SkipAutostart) {
    Write-Log "  - Autostart enabled: Yes"
}
else {
    Write-Log "  - Autostart enabled: No"
}
Write-Log "  - Application URL: http://localhost:$Port"
Write-Log ""
Write-Log "The application is now running and should open in your browser."
Write-Log "You can close this window."
Write-Log ""

# Keep window open for a few seconds
Start-Sleep -Seconds 3
