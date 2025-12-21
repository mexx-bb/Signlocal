<#
.SYNOPSIS
    Uninstalls the SignLocal service.

.DESCRIPTION
    This script stops and removes the Windows service associated with the
    SignLocal application using NSSM.
#>

# Stop on errors
$ErrorActionPreference = "Stop"

# Set script directory as current location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$serviceName = "SignLocal"
$nssmPath = Join-Path $scriptDir "nssm.exe"

Write-Host "Attempting to uninstall the '$serviceName' service..."

# Check if the service is installed
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "Service '$serviceName' is not installed. Nothing to do."
    exit 0
}

# Stop the service if it's running
if ($service.Status -eq "Running") {
    Write-Host "Stopping service '$serviceName'..."
    & $nssmPath stop $serviceName
    Write-Host "Service stopped."
}

# Remove the service
Write-Host "Removing service '$serviceName'..."
& $nssmPath remove $serviceName confirm
Write-Host "Service '$serviceName' has been successfully removed."

Write-Host "Uninstallation complete."
Read-Host "Press Enter to exit"
