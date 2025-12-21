<#
.SYNOPSIS
    Installs the SignLocal application, sets it up as a Windows service,
    and configures it for autostart.

.DESCRIPTION
    This script performs the following actions:
    1. Sets the execution policy to allow script execution.
    2. Checks if Node.js (version 18 or higher) is installed.
    3. Installs NPM dependencies.
    4. Builds the Next.js application for production.
    5. Installs 'nssm' (Non-Sucking Service Manager) as a Windows service.
    6. Configures the service to run 'npm start'.
    7. Starts the service.
#>

# Stop on errors
$ErrorActionPreference = "Stop"

# Set script directory as current location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Starting SignLocal installation..."

# --- 1. Check Node.js Version ---
Write-Host "Checking for Node.js..."
try {
    $nodeVersion = (node --version)
    if ($nodeVersion -match "v(\d+)") {
        $majorVersion = [int]$Matches[1]
        if ($majorVersion -lt 18) {
            Write-Error "Node.js version 18 or higher is required. Please upgrade Node.js and run the script again."
            exit 1
        }
        Write-Host "Node.js version $majorVersion found. (OK)"
    }
}
catch {
    Write-Error "Node.js is not installed or not found in PATH. Please install Node.js 18.x or newer and try again."
    exit 1
}

# --- 2. Install NPM dependencies ---
Write-Host "Installing project dependencies with npm..."
npm install
Write-Host "Dependencies installed successfully."

# --- 3. Build the application ---
Write-Host "Building the application for production..."
npm run build
Write-Host "Application built successfully."

# --- 4. Setup and Start Service with NSSM ---
$serviceName = "SignLocal"
$nssmPath = Join-Path $scriptDir "nssm.exe"
$nodePath = Get-Command node.exe | Select-Object -ExpandProperty Source
$startCommand = "start"

# Check if service is already installed
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Service '$serviceName' is already installed. Stopping and removing for re-installation."
    & $nssmPath remove $serviceName confirm
}

Write-Host "Installing service '$serviceName'..."
& $nssmPath install $serviceName $nodePath
& $nssmPath set $serviceName AppDirectory $scriptDir
& $nssmPath set $serviceName AppParameters "C:\Users\User\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js $startCommand"
& $nssmPath set $serviceName Description "SignLocal document signing application."
& $nssmPath set $serviceName DisplayName "SignLocal Service"
& $nssmPath set $serviceName Start "SERVICE_AUTO_START"

Write-Host "Starting service '$serviceName'..."
& $nssmPath start $serviceName

# Verify service status
$serviceStatus = (Get-Service -Name $serviceName).Status
if ($serviceStatus -eq "Running") {
    Write-Host "Service '$serviceName' started successfully and is now running."
    Write-Host "You can access the application at http://localhost:3000"
} else {
    Write-Warning "Service '$serviceName' was installed but failed to start. Status: $serviceStatus"
    Write-Warning "Check the logs for more details."
}

Write-Host "Installation complete."
Read-Host "Press Enter to exit"
