#!/usr/bin/env bash
# Signlocal LAN Companion: Erstellt nur lokale TLS-Materialien für ein privates WLAN.
# Designprinzip: Die CA- und Server-Schlüssel liegen außerhalb des Projekts und werden nie geteilt.

set -euo pipefail
IFS=$'\n\t'
umask 077

DEFAULT_OUTPUT_DIR="${HOME}/signlocal-lan/certs"
DEFAULT_ORIGIN="https://mexx-bb.github.io"
OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"
HOST=""
ALLOWED_ORIGIN="$DEFAULT_ORIGIN"
FORCE="false"

usage() {
  cat <<'EOF'
Signlocal LAN Companion – lokale Zertifikate vorbereiten

Verwendung:
  ./scripts/prepare-local-cert.sh [Optionen]

Optionen:
  --host <private-IP-oder-lokaler-name>  Adresse für das Zertifikat, z. B. 192.168.178.25.
                                       Ohne Option wird eine private WLAN-Adresse gesucht.
  --output-dir <pfad>                  Geschützter Ablageort außerhalb des Projekts.
                                       Standard: ~/signlocal-lan/certs
  --origin <https-origin>              Exakte HTTPS-Adresse der geöffneten Signlocal-PDF-App.
                                       Standard: https://mexx-bb.github.io
  --force                              Vorhandene Companion-Zertifikate bewusst ersetzen.
  --help                               Diese Hilfe ausgeben.

Das Skript erfordert mkcert. Es erstellt oder installiert eine lokale CA, stellt ein
Serverzertifikat für die gewählte lokale Adresse aus und kopiert NUR die öffentliche
CA-Datei für die manuelle Installation auf einem eigenen iPad/iPhone.

Es wird kein Schlüssel in das Signlocal-Projekt geschrieben und kein Zertifikat ins
Internet hochgeladen.
EOF
}

fail() {
  printf 'Fehler: %s\n' "$*" >&2
  exit 1
}

is_private_ipv4() {
  local ip="$1"
  local a b c d extra
  IFS='.' read -r a b c d extra <<< "$ip"
  [[ -n "$a" && -n "$b" && -n "$c" && -n "$d" && -z "${extra:-}" ]] || return 1
  [[ "$a" =~ ^[0-9]+$ && "$b" =~ ^[0-9]+$ && "$c" =~ ^[0-9]+$ && "$d" =~ ^[0-9]+$ ]] || return 1
  (( a <= 255 && b <= 255 && c <= 255 && d <= 255 )) || return 1
  (( a == 10 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) ))
}

detect_private_host() {
  local candidate interface

  if [[ "$(uname -s)" == "Darwin" ]]; then
    if command -v networksetup >/dev/null 2>&1; then
      while IFS= read -r interface; do
        candidate="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
        if is_private_ipv4 "$candidate"; then
          printf '%s\n' "$candidate"
          return 0
        fi
      done < <(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/ {getline; print $2}')
    fi

    for interface in en0 en1; do
      candidate="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
      if is_private_ipv4 "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done
  elif command -v ip >/dev/null 2>&1; then
    while IFS= read -r candidate; do
      if is_private_ipv4 "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done < <(ip -o -4 addr show scope global | awk '{split($4, address, "/"); print address[1]}')
  fi

  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      [[ $# -ge 2 ]] || fail "Für --host fehlt eine Adresse."
      HOST="$2"
      shift 2
      ;;
    --output-dir)
      [[ $# -ge 2 ]] || fail "Für --output-dir fehlt ein Pfad."
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --origin)
      [[ $# -ge 2 ]] || fail "Für --origin fehlt eine HTTPS-Adresse."
      ALLOWED_ORIGIN="$2"
      shift 2
      ;;
    --force)
      FORCE="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unbekannte Option: $1. Mit --help die Verwendung anzeigen."
      ;;
  esac
done

command -v mkcert >/dev/null 2>&1 || fail "mkcert fehlt. Unter macOS: brew install mkcert. Unter Linux siehe companion/README.md."

if [[ -z "$HOST" ]]; then
  HOST="$(detect_private_host || true)"
fi

[[ -n "$HOST" ]] || fail "Keine private WLAN-Adresse gefunden. Verbinde den Computer mit privatem WLAN oder übergib --host <private-IP>."

if is_private_ipv4 "$HOST"; then
  :
elif [[ "$HOST" == *.local && "$HOST" != "localhost" ]]; then
  printf 'Hinweis: Lokaler Name „%s“ wird als SAN verwendet. Stelle sicher, dass das iPad ihn im privaten WLAN auflösen kann.\n' "$HOST"
else
  fail "--host muss eine private IPv4-Adresse oder ein lokaler .local-Name sein; „${HOST}“ ist nicht zulässig."
fi

[[ "$ALLOWED_ORIGIN" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] || fail "--origin muss ausschließlich eine HTTPS-Herkunft ohne Pfad enthalten, z. B. https://mexx-bb.github.io."

mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"

CERT_FILE="$OUTPUT_DIR/signlocal-lan-cert.pem"
KEY_FILE="$OUTPUT_DIR/signlocal-lan-key.pem"
CA_EXPORT="$OUTPUT_DIR/Signlocal-Local-CA.pem"

if [[ "$FORCE" != "true" && ( -e "$CERT_FILE" || -e "$KEY_FILE" ) ]]; then
  fail "Vorhandene Zertifikatsdateien in „$OUTPUT_DIR“. Mit --force bewusst ersetzen oder --output-dir wählen."
fi

printf 'Initialisiere die lokale mkcert-CA im System-Zertifikatsspeicher …\n'
mkcert -install

printf 'Erstelle ein Serverzertifikat für %s …\n' "$HOST"
mkcert \
  -cert-file "$CERT_FILE" \
  -key-file "$KEY_FILE" \
  "$HOST"

chmod 600 "$KEY_FILE"
CA_ROOT="$(mkcert -CAROOT)"
[[ -f "$CA_ROOT/rootCA.pem" ]] || fail "Die öffentliche mkcert-CA-Datei wurde nicht gefunden."
cp "$CA_ROOT/rootCA.pem" "$CA_EXPORT"
chmod 600 "$CA_EXPORT"

cat <<EOF

Fertig. Es wurde ein lokales Serverzertifikat für ${HOST} vorbereitet.

Serverzertifikat:  ${CERT_FILE}
Server-Schlüssel:  ${KEY_FILE}
Öffentliche iPad-CA: ${CA_EXPORT}

Übertrage ausschließlich „${CA_EXPORT}“ auf dein eigenes iPad/iPhone und richte dort
das Profil sowie die vollständige Zertifikatsvertrauensfreigabe ein. Teile niemals
„rootCA-key.pem“ oder „${KEY_FILE}“.

Danach den Companion so starten:

cd "$(cd "$(dirname "$0")/.." && pwd)"
SIGNLOCAL_TLS_KEY="${KEY_FILE}" \\
SIGNLOCAL_TLS_CERT="${CERT_FILE}" \\
SIGNLOCAL_HOST="${HOST}" \\
SIGNLOCAL_ALLOWED_ORIGIN="${ALLOWED_ORIGIN}" \\
SIGNLOCAL_CA_DOWNLOAD=1 \\
SIGNLOCAL_CA_FILE="${CA_EXPORT}" \\
pnpm start

Öffne zur einmaligen CA-Einrichtung auf dem iPad: http://${HOST}:8788/ca-setup.html
Vergleiche dort den SHA-256-Fingerabdruck mit dem Wert auf dem Computer. Danach
Öffne vor dem QR-Pairing auf dem iPad: https://${HOST}:8787
Die Seite muss in Safari ohne Zertifikatswarnung erscheinen.
EOF
