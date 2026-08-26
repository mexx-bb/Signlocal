#!/usr/bin/env bash
# Isolierter Rauchtest für die optionale, lokale CA-Einrichtungsseite.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANION_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_ROOT="$(mktemp -d)"
LOG_FILE="$TEST_ROOT/companion.log"
COMPANION_PID=""

cleanup() {
  local result=$?
  if [[ -n "$COMPANION_PID" ]]; then
    kill "$COMPANION_PID" 2>/dev/null || true
    wait "$COMPANION_PID" 2>/dev/null || true
  fi
  if [[ "$result" -ne 0 && -f "$LOG_FILE" ]]; then
    printf '%s\n' '--- Companion-Testprotokoll ---' >&2
    cat "$LOG_FILE" >&2
  fi
  rm -rf "$TEST_ROOT"
  exit "$result"
}
trap cleanup EXIT

command -v openssl >/dev/null 2>&1 || { printf '%s\n' 'Fehler: openssl ist für den isolierten Test erforderlich.' >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { printf '%s\n' 'Fehler: curl ist für den isolierten Test erforderlich.' >&2; exit 1; }

printf '%s\n' 'test-public-ca-certificate' > "$TEST_ROOT/Signlocal-Local-CA.pem"
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$TEST_ROOT/tls-key.pem" \
  -out "$TEST_ROOT/tls-cert.pem" \
  -days 1 \
  -subj '/CN=127.0.0.1' \
  -addext 'subjectAltName=IP:127.0.0.1' >/dev/null 2>&1

SIGNLOCAL_TLS_KEY="$TEST_ROOT/tls-key.pem" \
SIGNLOCAL_TLS_CERT="$TEST_ROOT/tls-cert.pem" \
SIGNLOCAL_HOST=127.0.0.1 \
SIGNLOCAL_PORT=18787 \
SIGNLOCAL_CA_DOWNLOAD=1 \
SIGNLOCAL_CA_DOWNLOAD_PORT=18788 \
SIGNLOCAL_CA_FILE="$TEST_ROOT/Signlocal-Local-CA.pem" \
node "$COMPANION_DIR/server.mjs" > "$LOG_FILE" 2>&1 &
COMPANION_PID=$!

for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:18788/ca-setup.html -o "$TEST_ROOT/setup.html" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

test -s "$TEST_ROOT/setup.html"
grep -q 'Signlocal-Local-CA.pem' "$TEST_ROOT/setup.html"
grep -q 'SHA-256:' "$TEST_ROOT/setup.html"
grep -q 'class="qr"' "$TEST_ROOT/setup.html"
grep -q 'data:image/png;base64,' "$TEST_ROOT/setup.html"
curl -fsS http://127.0.0.1:18788/Signlocal-Local-CA.pem -o "$TEST_ROOT/download.pem"
cmp "$TEST_ROOT/Signlocal-Local-CA.pem" "$TEST_ROOT/download.pem"
curl -fsS -D "$TEST_ROOT/headers.txt" -o /dev/null http://127.0.0.1:18788/Signlocal-Local-CA.pem
grep -qi 'Content-Disposition: attachment; filename="Signlocal-Local-CA.pem"' "$TEST_ROOT/headers.txt"

printf '%s\n' 'test-ca-download.sh: Test erfolgreich'
