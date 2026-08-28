#!/usr/bin/env bash
# SignLocal LAN Companion – macOS-Ein-Klick-Installation
# Richtet ausschließlich einen lokalen TLS-Companion für ein eigenes privates Netz ein.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077

APP_NAME="SignLocal LAN Companion"
INSTALL_ROOT="${HOME}/Library/Application Support/SignLocal/Companion"
CERTIFICATE_ROOT="${HOME}/Library/Application Support/SignLocal/certs"
DESKTOP_START="${HOME}/Desktop/SignLocal Companion starten.command"
DESKTOP_AUTOSTART_ENABLE="${HOME}/Desktop/SignLocal Companion Autostart aktivieren.command"
DESKTOP_AUTOSTART_DISABLE="${HOME}/Desktop/SignLocal Companion Autostart beenden.command"
LAUNCH_LABEL="de.signlocal.companion"
LAUNCH_AGENT_PATH="${HOME}/Library/LaunchAgents/${LAUNCH_LABEL}.plist"
LOG_ROOT="${HOME}/Library/Logs/SignLocal"
DEFAULT_ALLOWED_ORIGIN="https://signlocal-etd6sbfb.manus.space"
ALLOWED_ORIGIN="${SIGNLOCAL_ALLOWED_ORIGIN:-$DEFAULT_ALLOWED_ORIGIN}"
SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BUNDLED_COMPANION="${SCRIPT_DIRECTORY}/companion"
NO_START="false"

stage() { printf '\n[%s] %s\n' "$APP_NAME" "$*"; }
fail() { printf '\nInstallation abgebrochen: %s\n' "$*" >&2; printf 'Es wurden keine PDFs oder Unterschriften hochgeladen.\n' >&2; exit 1; }
pause_terminal() { printf '\nZum Schließen Enter drücken …'; read -r _ || true; }

is_private_ipv4() {
  local ip="$1" a b c d extra
  IFS='.' read -r a b c d extra <<< "$ip"
  [[ -n "$a" && -n "$b" && -n "$c" && -n "$d" && -z "${extra:-}" ]] || return 1
  [[ "$a" =~ ^[0-9]+$ && "$b" =~ ^[0-9]+$ && "$c" =~ ^[0-9]+$ && "$d" =~ ^[0-9]+$ ]] || return 1
  (( a <= 255 && b <= 255 && c <= 255 && d <= 255 )) || return 1
  (( a == 10 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) ))
}

detect_private_address() {
  local interface candidate
  for interface in bridge100 en0 en1; do
    candidate="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
    if is_private_ipv4 "$candidate"; then printf '%s\n' "$candidate"; return 0; fi
  done
  if command -v networksetup >/dev/null 2>&1; then
    while IFS= read -r interface; do
      candidate="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
      if is_private_ipv4 "$candidate"; then printf '%s\n' "$candidate"; return 0; fi
    done < <(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/ {getline; print $2}')
  fi
  return 1
}

show_offline_hotspot_guide() {
  cat <<'EOF'

==============================================================
 AUSSENDIENST OHNE INTERNET
==============================================================
Nach der einmaligen Installation arbeitet SignLocal lokal zwischen
diesem Mac und dem Mobilgerät. PDFs und Unterschriften werden nicht
hochgeladen.

1. Öffne Systemeinstellungen → Allgemein → Freigaben → Internetfreigabe.
2. Teile die Verbindung nur über ein eigenes WLAN des Macs und wähle
   ein sicheres Passwort. Alternativ kannst du einen eigenen Reiserouter
   ohne Internet verwenden.
3. Verbinde iPad, iPhone oder Android mit diesem eigenen Netzwerk.
4. Starte danach auf dem Schreibtisch „SignLocal Companion starten“.
5. Öffne die angezeigte lokale HTTPS-Adresse auf dem Mobilgerät und
   führe die Zertifikatseinrichtung sowie das QR-Pairing durch.

Wichtig: Die Erstinstallation benötigt einmalig Internet für Homebrew,
Node.js, mkcert und die Companion-Dateien. Für Einsätze ohne Empfang
bitte vorher im Büro oder zuhause installieren.
EOF
}

ensure_homebrew() {
  if command -v brew >/dev/null 2>&1; then return; fi
  fail "Homebrew ist noch nicht installiert. Öffne https://brew.sh, führe die dort erklärte Installation bewusst aus und starte dieses Paket danach erneut. Aus Sicherheitsgründen lädt dieses Skript keinen Paketmanager automatisch per Fernbefehl."
}

ensure_dependency() {
  local command_name="$1" formula="$2" label="$3"
  if command -v "$command_name" >/dev/null 2>&1; then return; fi
  stage "$label wird installiert …"
  brew install "$formula" || fail "$label konnte nicht installiert werden."
}

write_local_start() {
  local node_binary
  node_binary="$(command -v node)"
  [[ -x "$node_binary" ]] || fail "Node.js wurde nicht gefunden. Starte die Installation nach der Node.js-Einrichtung erneut."
  cat > "${INSTALL_ROOT}/Start-SignLocal-Companion.command" <<EOF
#!/usr/bin/env bash
# Lokaler Start für Fenster und LaunchAgent: Kein Start ohne private IPv4-Adresse.
set -Eeuo pipefail
IFS=\$'\n\t'
umask 077
INSTALL_ROOT="${INSTALL_ROOT}"
CERTIFICATE_ROOT="${CERTIFICATE_ROOT}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN}"
NODE_BINARY="${node_binary}"
DAEMON_MODE="\${1:-}"

is_private_ipv4() {
  local ip="\$1" a b c d extra
  IFS='.' read -r a b c d extra <<< "\$ip"
  [[ -n "\$a" && -n "\$b" && -n "\$c" && -n "\$d" && -z "\${extra:-}" ]] || return 1
  [[ "\$a" =~ ^[0-9]+\$ && "\$b" =~ ^[0-9]+\$ && "\$c" =~ ^[0-9]+\$ && "\$d" =~ ^[0-9]+\$ ]] || return 1
  (( a <= 255 && b <= 255 && c <= 255 && d <= 255 )) || return 1
  (( a == 10 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) ))
}
detect_private_address() {
  local interface candidate
  for interface in bridge100 en0 en1; do
    candidate="\$(ipconfig getifaddr "\$interface" 2>/dev/null || true)"
    if is_private_ipv4 "\$candidate"; then printf '%s\\n' "\$candidate"; return 0; fi
  done
  return 1
}
LOCAL_IP="\$(detect_private_address || true)"
if [[ -z "\$LOCAL_IP" ]]; then
  echo "Keine private lokale Adresse gefunden. Aktiviere zuerst dein eigenes Mac-WLAN oder einen privaten Reiserouter."
  [[ "\$DAEMON_MODE" == "--daemon" ]] || read -r -p "Enter zum Schließen …"
  exit 0
fi
echo "SignLocal startet lokal über \$LOCAL_IP. Verwende nur dein eigenes privates Netzwerk."
HOST_RECORD="\$CERTIFICATE_ROOT/signlocal-lan-host.txt"
if [[ ! -f "\$CERTIFICATE_ROOT/signlocal-lan-cert.pem" || ! -f "\$CERTIFICATE_ROOT/signlocal-lan-key.pem" || ! -f "\$CERTIFICATE_ROOT/Signlocal-Local-CA.pem" || ! -f "\$HOST_RECORD" || "\$(cat "\$HOST_RECORD")" != "\$LOCAL_IP" ]]; then
  "\$INSTALL_ROOT/scripts/prepare-local-cert.sh" --host "\$LOCAL_IP" --output-dir "\$CERTIFICATE_ROOT" --origin "\$ALLOWED_ORIGIN" --force || {
    echo "Lokales Zertifikat konnte nicht vorbereitet werden. Der Dienst versucht es später erneut."
    [[ "\$DAEMON_MODE" == "--daemon" ]] || read -r -p "Enter zum Schließen …"
    exit 1
  }
  printf '%s\n' "\$LOCAL_IP" > "\$HOST_RECORD"
  chmod 600 "\$HOST_RECORD"
fi
SIGNLOCAL_TLS_KEY="\$CERTIFICATE_ROOT/signlocal-lan-key.pem" \\
SIGNLOCAL_TLS_CERT="\$CERTIFICATE_ROOT/signlocal-lan-cert.pem" \\
SIGNLOCAL_HOST="\$LOCAL_IP" \\
SIGNLOCAL_ALLOWED_ORIGIN="\$ALLOWED_ORIGIN" \\
SIGNLOCAL_CA_DOWNLOAD=1 \\
SIGNLOCAL_CA_FILE="\$CERTIFICATE_ROOT/Signlocal-Local-CA.pem" \\
"\$NODE_BINARY" "\$INSTALL_ROOT/server.mjs"
EOF
  chmod 700 "${INSTALL_ROOT}/Start-SignLocal-Companion.command"

  mkdir -p "${HOME}/Library/LaunchAgents" "$LOG_ROOT"
  chmod 700 "$LOG_ROOT"
  cat > "${INSTALL_ROOT}/SignLocal-Companion-Autostart.command" <<EOF
#!/usr/bin/env bash
# Bewusstes Ein- und Ausschalten eines lokalen Benutzer-LaunchAgents.
set -Eeuo pipefail
LABEL="${LAUNCH_LABEL}"
PLIST="${LAUNCH_AGENT_PATH}"
UID="\$(id -u)"
ACTION="\${1:-status}"
case "\$ACTION" in
  enable)
    mkdir -p "${HOME}/Library/LaunchAgents" "${LOG_ROOT}"
    cat > "\$PLIST" <<SIGNLOCAL_PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>\$LABEL</string>
  <key>ProgramArguments</key><array><string>${INSTALL_ROOT}/Start-SignLocal-Companion.command</string><string>--daemon</string></array>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>${LOG_ROOT}/companion.out.log</string>
  <key>StandardErrorPath</key><string>${LOG_ROOT}/companion.err.log</string>
  <key>ProcessType</key><string>Background</string>
</dict></plist>
SIGNLOCAL_PLIST
    chmod 600 "\$PLIST"
    launchctl bootout "gui/\$UID" "\$PLIST" 2>/dev/null || true
    launchctl bootstrap "gui/\$UID" "\$PLIST"
    launchctl kickstart -k "gui/\$UID/\$LABEL"
    echo "Autostart aktiviert. Der Companion läuft nur, wenn eine private lokale Adresse verfügbar ist."
    ;;
  disable)
    launchctl bootout "gui/\$UID" "\$PLIST" 2>/dev/null || true
    rm -f "\$PLIST"
    echo "Autostart beendet. Der manuelle Desktop-Start bleibt verfügbar."
    ;;
  status)
    launchctl print "gui/\$UID/\$LABEL" 2>/dev/null && echo "Autostart ist aktiv." || echo "Autostart ist nicht aktiv."
    ;;
  *) echo "Verwendung: \$0 {enable|disable|status}"; exit 2 ;;
esac
EOF
  chmod 700 "${INSTALL_ROOT}/SignLocal-Companion-Autostart.command"

  cat > "$DESKTOP_START" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_ROOT}/Start-SignLocal-Companion.command"
EOF
  chmod 700 "$DESKTOP_START"
  cat > "$DESKTOP_AUTOSTART_ENABLE" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_ROOT}/SignLocal-Companion-Autostart.command" enable
EOF
  cat > "$DESKTOP_AUTOSTART_DISABLE" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_ROOT}/SignLocal-Companion-Autostart.command" disable
EOF
  chmod 700 "$DESKTOP_AUTOSTART_ENABLE" "$DESKTOP_AUTOSTART_DISABLE"
}

for argument in "$@"; do
  case "$argument" in
    --no-start) NO_START="true" ;;
    --help|-h) printf 'Verwendung: Doppelklick auf Install-SignLocal-Companion.command oder Aufruf mit --no-start.\n'; exit 0 ;;
    *) fail "Unbekannte Option: $argument" ;;
  esac
done

[[ "$ALLOWED_ORIGIN" =~ ^https://[^/]+$ ]] || fail "SIGNLOCAL_ALLOWED_ORIGIN muss eine exakte HTTPS-Adresse ohne Pfad sein, zum Beispiel https://sign.example.de."

show_offline_hotspot_guide
printf 'Erlaubte Website-Adresse für diesen lokalen Companion: %s\n' "$ALLOWED_ORIGIN"
printf '\nBestätige mit JA, dass du nur dein eigenes privates Mac-WLAN oder einen privaten Reiserouter verwendest: '
read -r confirmation
[[ "$confirmation" == "JA" ]] || fail "Keine Bestätigung für ein privates Netzwerk."

ensure_homebrew
ensure_dependency node node "Node.js"
ensure_dependency mkcert mkcert "mkcert"

stage "Mitgelieferte lokale Companion-Dateien werden vorbereitet …"
[[ -f "$BUNDLED_COMPANION/server.mjs" ]] || fail "Die mitgelieferten Companion-Dateien sind unvollständig. Lade das SignLocal-macOS-Paket erneut über die SignLocal-Seite herunter."
[[ -f "$BUNDLED_COMPANION/package.json" ]] || fail "Die mitgelieferten Companion-Abhängigkeiten sind unvollständig. Lade das SignLocal-macOS-Paket erneut über die SignLocal-Seite herunter."
[[ -x "$BUNDLED_COMPANION/scripts/prepare-local-cert.sh" ]] || fail "Das lokale Zertifikatsskript fehlt. Lade das SignLocal-macOS-Paket erneut über die SignLocal-Seite herunter."
for web_file in index.html mobile.html desktop.js mobile.js app.css; do
  [[ -f "$BUNDLED_COMPANION/public/$web_file" ]] || fail "Die mobile Companion-Seite ($web_file) fehlt im Paket. Lade das SignLocal-macOS-Paket erneut über die SignLocal-Seite herunter."
done

rm -rf "$INSTALL_ROOT"
mkdir -p "$INSTALL_ROOT" "$CERTIFICATE_ROOT"
cp -R "$BUNDLED_COMPANION"/. "$INSTALL_ROOT"
chmod -R go-rwx "$CERTIFICATE_ROOT"

stage "Lokale Companion-Abhängigkeiten werden eingerichtet …"
( cd "$INSTALL_ROOT" && npm install --omit=dev --ignore-scripts --no-audit --no-fund ) || fail "Die lokalen Companion-Abhängigkeiten konnten nicht installiert werden."

write_local_start
stage "Installation abgeschlossen"
printf 'Desktop-Start: %s\n' "$DESKTOP_START"
printf 'Autostart bewusst aktivieren: %s\n' "$DESKTOP_AUTOSTART_ENABLE"
printf 'Autostart beenden: %s\n' "$DESKTOP_AUTOSTART_DISABLE"
printf 'Lokale Zertifikate werden ausschließlich hier gespeichert: %s\n' "$CERTIFICATE_ROOT"
printf 'Teile niemals die private Datei signlocal-lan-key.pem.\n'
printf 'Nach einem Wechsel des eigenen WLANs den Desktop-Start erneut öffnen; das Zertifikat wird für die aktuelle private Adresse erneuert.\n'
printf 'Der Autostart prüft die private Adresse beim Anmelden und erneuert das Zertifikat nur nach einem tatsächlichen Netzwerkwechsel.\n'

if [[ "$NO_START" != "true" ]]; then
  printf '\nDer lokale Companion wird jetzt gestartet. Zum Beenden das Terminalfenster schließen.\n'
  exec "$DESKTOP_START"
fi
pause_terminal
