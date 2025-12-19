# Installation Script Testing Guide

This document describes how to test the PowerShell installation scripts for SignLocal.

## Prerequisites for Testing

1. **Windows 10 or newer**
2. **Node.js 18.x or newer** installed
3. **Administrator privileges**
4. **PowerShell 5.1 or newer**

## Test Scenarios

### Test 1: Fresh Installation

**Objective**: Verify that the installation script works on a clean system.

**Steps**:
1. Ensure Node.js is installed: `node --version`
2. Navigate to the SignLocal directory
3. Run: `.\install.ps1`
4. Expected results:
   - ✅ Script checks Node.js version successfully
   - ✅ npm install completes without errors
   - ✅ npm run build completes successfully
   - ✅ Desktop shortcut is created
   - ✅ Scheduled task "SignLocal-Autostart" is created
   - ✅ Application starts and opens in browser at http://localhost:3000
   - ✅ Log file `install.log` is created with detailed information

**Verification**:
```powershell
# Check if scheduled task exists
Get-ScheduledTask -TaskName "SignLocal-Autostart"

# Check if desktop shortcut exists
Test-Path "$env:USERPROFILE\Desktop\SignLocal.lnk"

# Check if application is running
Get-Process -Name node | Where-Object { $_.Path -like "*node*" }

# Check if application responds
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

### Test 2: Installation with Custom Port

**Objective**: Verify that custom port parameter works.

**Steps**:
1. Stop any running instances
2. Run: `.\install.ps1 -Port 8080`
3. Expected results:
   - ✅ Application starts on port 8080
   - ✅ Browser opens at http://localhost:8080

**Verification**:
```powershell
# Check if port 8080 is listening
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

### Test 3: Installation without Autostart

**Objective**: Verify that -SkipAutostart parameter works.

**Steps**:
1. Run: `.\install.ps1 -SkipAutostart`
2. Expected results:
   - ✅ Installation completes
   - ✅ No scheduled task is created
   - ✅ Application still starts immediately

**Verification**:
```powershell
# Verify no scheduled task exists
Get-ScheduledTask -TaskName "SignLocal-Autostart" -ErrorAction SilentlyContinue
# Should return nothing or an error
```

### Test 4: Re-installation (Upgrade)

**Objective**: Verify that running install.ps1 again works correctly.

**Steps**:
1. Run install.ps1 once successfully
2. Run install.ps1 again
3. Expected results:
   - ✅ Existing running instances are stopped
   - ✅ Existing scheduled task is removed and recreated
   - ✅ Installation completes successfully

### Test 5: Uninstallation

**Objective**: Verify that uninstall.ps1 cleans up correctly.

**Steps**:
1. Install SignLocal using install.ps1
2. Verify everything is set up
3. Run: `.\uninstall.ps1`
4. Expected results:
   - ✅ Running instances are stopped
   - ✅ Scheduled task is removed
   - ✅ Desktop shortcut is removed
   - ✅ Startup script is removed
   - ✅ Application files remain intact

**Verification**:
```powershell
# Check scheduled task is gone
Get-ScheduledTask -TaskName "SignLocal-Autostart" -ErrorAction SilentlyContinue

# Check shortcut is gone
Test-Path "$env:USERPROFILE\Desktop\SignLocal.lnk"

# Check startup script is gone
Test-Path ".\start-signlocal.ps1"

# Verify application files remain
Test-Path ".\package.json"
Test-Path ".\.next"
```

### Test 6: Autostart Functionality

**Objective**: Verify that the application starts automatically at login.

**Steps**:
1. Install SignLocal with install.ps1
2. Log out of Windows
3. Log back in
4. Wait 30 seconds
5. Expected results:
   - ✅ Application automatically starts in background
   - ✅ Application is accessible at http://localhost:3000

**Verification**:
```powershell
# Check if node process is running
Get-Process -Name node

# Check if application responds
Start-Sleep -Seconds 10
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

### Test 7: Node.js Version Check

**Objective**: Verify that the script properly validates Node.js version.

**Steps**:
1. This test requires temporarily uninstalling or renaming Node.js (not recommended)
2. Alternatively, review the code logic for version checking
3. Expected behavior:
   - ✅ Script should fail gracefully if Node.js < 18.x
   - ✅ Script should accept Node.js 18.x, 19.x, 20.x, etc.
   - ✅ Script should handle pre-release versions (e.g., v20.0.0-rc.1)

### Test 8: Error Handling

**Objective**: Verify that the script handles errors gracefully.

**Test 8a: Network Issues**
- Disconnect from internet (if npm packages not cached)
- Run install.ps1
- Expected: Clear error message about network/npm install failure

**Test 8b: Insufficient Permissions**
- Run install.ps1 without administrator privileges
- Expected: Clear error message about needing administrator rights

**Test 8c: Disk Space**
- Not easily testable, but script should fail gracefully if out of disk space

## Manual Verification Checklist

After successful installation, verify the following manually:

- [ ] Desktop shortcut appears and has correct icon
- [ ] Double-clicking shortcut starts the application
- [ ] Browser opens automatically at http://localhost:3000
- [ ] Application UI loads correctly
- [ ] Log file contains detailed installation steps
- [ ] Scheduled task appears in Task Scheduler
- [ ] Scheduled task has correct trigger (At log on)
- [ ] Scheduled task has correct action (PowerShell script)
- [ ] Application starts within 30 seconds of login

## Cleanup After Testing

To completely clean up after testing:

1. Run `.\uninstall.ps1`
2. Manually delete the SignLocal directory (optional)
3. Remove test log files

## Known Limitations

- Scripts require PowerShell 5.1 or newer
- Administrator privileges are required for creating scheduled tasks
- Process detection relies on WMI, which may not work on all Windows configurations
- Scripts are designed for Windows only (not compatible with Linux/macOS)

## Troubleshooting Test Failures

If tests fail, check:

1. **install.log** - Contains detailed error messages
2. **Event Viewer** - Windows Logs > Application for errors
3. **Task Scheduler** - Check task history for execution errors
4. **PowerShell version** - Run `$PSVersionTable.PSVersion`
5. **Execution policy** - Run `Get-ExecutionPolicy`
   - If restricted, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Security Testing

Additional security considerations:

- [ ] Verify that scheduled task runs with Limited privileges (not Highest)
- [ ] Verify that no sensitive data is logged in install.log
- [ ] Verify that the script doesn't download any external dependencies beyond npm
- [ ] Verify that the script doesn't modify system files outside the installation directory
