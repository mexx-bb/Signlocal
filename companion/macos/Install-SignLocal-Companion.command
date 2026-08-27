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
ALLOWED_ORIGIN="https://signlocal-etd6sbfb.manus.space"
SOURCE_ZIP="https://github.com/mexx-bb/Signlocal/archive/refs/heads/mobile-signlocal.zip"
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
  cat > "${INSTALL_ROOT}/Start-SignLocal-Companion.command" <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=\$'\\n\\t'
umask 077
INSTALL_ROOT="${INSTALL_ROOT}"
CERTIFICATE_ROOT="${CERTIFICATE_ROOT}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN}"

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
[[ -n "\$LOCAL_IP" ]] || { echo "Keine private lokale Adresse gefunden. Aktiviere zuerst dein eigenes Mac-WLAN oder einen privaten Reiserouter."; read -r -p "Enter zum Schließen …"; exit 1; }
echo "SignLocal startet lokal über \$LOCAL_IP. Verwende nur dein eigenes privates Netzwerk."
"\$INSTALL_ROOT/scripts/prepare-local-cert.sh" --host "\$LOCAL_IP" --output-dir "\$CERTIFICATE_ROOT" --origin "\$ALLOWED_ORIGIN" --force
SIGNLOCAL_TLS_KEY="\$CERTIFICATE_ROOT/signlocal-lan-key.pem" \\
SIGNLOCAL_TLS_CERT="\$CERTIFICATE_ROOT/signlocal-lan-cert.pem" \\
SIGNLOCAL_HOST="\$LOCAL_IP" \\
SIGNLOCAL_ALLOWED_ORIGIN="\$ALLOWED_ORIGIN" \\
SIGNLOCAL_CA_DOWNLOAD=1 \\
SIGNLOCAL_CA_FILE="\$CERTIFICATE_ROOT/Signlocal-Local-CA.pem" \\
node "\$INSTALL_ROOT/server.mjs"
EOF
  chmod 700 "${INSTALL_ROOT}/Start-SignLocal-Companion.command"

  cat > "$DESKTOP_START" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_ROOT}/Start-SignLocal-Companion.command"
EOF
  chmod 700 "$DESKTOP_START"
}

cleanup() { [[ -n "${TEMPORARY_ROOT:-}" ]] && rm -rf "$TEMPORARY_ROOT"; }
trap cleanup EXIT

for argument in "$@"; do
  case "$argument" in
    --no-start) NO_START="true" ;;
    --help|-h) printf 'Verwendung: Doppelklick auf Install-SignLocal-Companion.command oder Aufruf mit --no-start.\n'; exit 0 ;;
    *) fail "Unbekannte Option: $argument" ;;
  esac
done

show_offline_hotspot_guide
printf '\nBestätige mit JA, dass du nur dein eigenes privates Mac-WLAN oder einen privaten Reiserouter verwendest: '
read -r confirmation
[[ "$confirmation" == "JA" ]] || fail "Keine Bestätigung für ein privates Netzwerk."

ensure_homebrew
ensure_dependency node node "Node.js"
ensure_dependency mkcert mkcert "mkcert"

stage "Lokale Companion-Dateien werden aus deinem GitHub-Branch geladen …"
TEMPORARY_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/signlocal-install.XXXXXX")"
archive_path="${TEMPORARY_ROOT}/signlocal.zip"
curl --fail --location --silent --show-error "$SOURCE_ZIP" --output "$archive_path" || fail "Die Companion-Dateien konnten nicht geladen werden."
unzip -q "$archive_path" -d "$TEMPORARY_ROOT" || fail "Der GitHub-Download konnte nicht entpackt werden."
server_file="$(find "$TEMPORARY_ROOT" -type f -path '*/companion/server.mjs' -print -quit)"
[[ -n "$server_file" ]] || fail "Der Companion-Ordner wurde im Download nicht gefunden."
source_companion="$(dirname "$server_file")"
[[ -f "$source_companion/server.mjs" ]] || fail "Der Companion-Ordner wurde im Download nicht gefunden."

rm -rf "$INSTALL_ROOT"
mkdir -p "$INSTALL_ROOT" "$CERTIFICATE_ROOT"
cp -R "$source_companion"/. "$INSTALL_ROOT"
chmod -R go-rwx "$CERTIFICATE_ROOT"

stage "Lokale Companion-Abhängigkeiten werden eingerichtet …"
( cd "$INSTALL_ROOT" && npm install --omit=dev --ignore-scripts --no-audit --no-fund ) || fail "Die lokalen Companion-Abhängigkeiten konnten nicht installiert werden."

write_local_start
stage "Installation abgeschlossen"
printf 'Desktop-Start: %s\n' "$DESKTOP_START"
printf 'Lokale Zertifikate werden ausschließlich hier gespeichert: %s\n' "$CERTIFICATE_ROOT"
printf 'Teile niemals die private Datei signlocal-lan-key.pem.\n'
printf 'Nach einem Wechsel des eigenen WLANs den Desktop-Start erneut öffnen; das Zertifikat wird für die aktuelle private Adresse erneuert.\n'

if [[ "$NO_START" != "true" ]]; then
  printf '\nDer lokale Companion wird jetzt gestartet. Zum Beenden das Terminalfenster schließen.\n'
  exec "$DESKTOP_START"
fi
pause_terminal
