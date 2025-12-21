# Definiert den Pfad zum Projektverzeichnis
$scriptDir = $PSScriptRoot
$pidFile = Join-Path -Path $scriptDir -ChildPath "logs\signlocal.pid"

Write-Host "Versuche, den SignLocal-Dienst zu stoppen..."

if (-not (Test-Path -Path $pidFile)) {
    Write-Host "PID-Datei nicht gefunden. Ist der Dienst überhaupt gestartet?"
    
    # Als Fallback versuchen, den Prozess über die Kommandozeile zu finden
    Write-Host "Suche nach laufendem Node-Prozess für 'next start'..."
    $processes = Get-WmiObject Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like '*next start*' }

    if ($processes) {
        foreach ($process in $processes) {
            Write-Host "Stoppe Prozess mit PID $($process.ProcessId)..."
            Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Alle gefundenen SignLocal-Prozesse wurden beendet."
    } else {
        Write-Host "Kein laufender SignLocal-Prozess gefunden."
    }

    Exit 0
}

# PID aus der Datei lesen
$pid = Get-Content $pidFile -ErrorAction SilentlyContinue

if ($pid) {
    # Prozess abrufen
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue

    if ($process) {
        # Prozess stoppen
        Write-Host "Stoppe SignLocal-Dienst mit PID $pid..."
        Stop-Process -Id $pid -Force
        Write-Host "Dienst gestoppt."
    } else {
        Write-Host "Prozess mit PID $pid nicht gefunden. Möglicherweise wurde er bereits beendet."
    }

    # PID-Datei entfernen
    Remove-Item $pidFile -ErrorAction SilentlyContinue
} else {
    Write-Host "PID-Datei ist leer."
}

Write-Host "Vorgang abgeschlossen."
