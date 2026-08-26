@echo off
setlocal
title SignLocal Companion installieren
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-SignLocal-Companion.ps1"
if errorlevel 1 (
  echo.
  echo Die Installation wurde nicht abgeschlossen. Die angezeigte Meldung beschreibt den sicheren naechsten Schritt.
  pause
)
endlocal
