@echo off
setlocal EnableExtensions
title SignLocal Companion installieren
cd /d "%~dp0"

echo.
echo SignLocal Companion-Installation
echo ================================
echo.
echo Ein Administrator muss die Windows-Sicherheitsabfrage (UAC) mit Ja bestaetigen.
echo Die Installation landet im Profil des angemeldeten Mitarbeiters.
echo Firmennetz und spaeter eigener Hotspot sind erlaubt.
echo.
echo Dieses Fenster bleibt offen und wartet auf das Ende der Installation.
echo.

set "PREFERREDLOG=%LOCALAPPDATA%\SignLocal\logs\install.log"
set "FALLBACKLOG=%USERPROFILE%\Signlocal-install.log"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SignLocal-Companion-Erhoeht-starten.ps1"

set "EXITCODE=%ERRORLEVEL%"

echo.
if exist "%PREFERREDLOG%" (
  echo ---- Installationsprotokoll: %PREFERREDLOG% ----
  type "%PREFERREDLOG%"
  echo ---- Ende Protokoll ----
) else if exist "%FALLBACKLOG%" (
  echo ---- Installationsprotokoll: %FALLBACKLOG% ----
  type "%FALLBACKLOG%"
  echo ---- Ende Protokoll ----
) else (
  echo Kein Installationsprotokoll gefunden.
  echo Erwartet unter: %PREFERREDLOG%
  echo oder: %FALLBACKLOG%
)

echo.
if %EXITCODE% NEQ 0 (
  echo Die Installation wurde nicht abgeschlossen. Exit-Code: %EXITCODE%
  echo Der Administrator muss die UAC-Abfrage mit Ja bestaetigen.
) else (
  if exist "%LOCALAPPDATA%\SignLocal\Companion" (
    echo Installation scheint erfolgreich. Companion liegt unter:
    echo %LOCALAPPDATA%\SignLocal\Companion
    echo Auf dem Desktop sollte "SignLocal Companion starten" erscheinen.
  ) else (
    echo Der erhoehte Installer ist beendet, aber der Companion-Ordner fehlt noch.
    echo Bitte das Protokoll oben pruefen.
  )
)

echo.
echo Fenster mit einer Taste schliessen.
pause >nul
endlocal
exit /b %EXITCODE%
