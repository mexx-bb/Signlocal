#!/usr/bin/env bash
# Prüft das verteilbare macOS-Paket als entpackten, lokal gestarteten Companion.
set -Eeuo pipefail
IFS=$'\n\t'

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temporary_root="$(mktemp -d "${TMPDIR:-/tmp}/signlocal-macos-runtime-test.XXXXXX")"
package_path="$temporary_root/SignLocal-macOS-Companion-Installation.zip"
server_log="$temporary_root/companion.log"
server_pid=""
port=18787

cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  rm -rf "$temporary_root"
}
trap cleanup EXIT

if fuser "${port}/tcp" >/dev/null 2>&1; then
  echo "Testport ${port} ist bereits belegt." >&2
  exit 1
fi

bash "$root/macos/build-package.sh" "$package_path" >/dev/null
unzip -q "$package_path" -d "$temporary_root/extracted"
companion_root="$temporary_root/extracted/SignLocal-macOS-Companion-Installation/companion"

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=127.0.0.1" -keyout "$temporary_root/local-key.pem" -out "$temporary_root/local-cert.pem" >/dev/null 2>&1
(
  cd "$companion_root"
  npm install --omit=dev --ignore-scripts --no-audit --no-fund >>"$server_log" 2>&1
  SIGNLOCAL_TLS_KEY="$temporary_root/local-key.pem" \
  SIGNLOCAL_TLS_CERT="$temporary_root/local-cert.pem" \
  SIGNLOCAL_HOST="127.0.0.1" \
  SIGNLOCAL_PORT="$port" \
  exec node server.mjs >"$server_log" 2>&1
) &
server_pid=$!

ready="false"
for _ in $(seq 1 100); do
  if curl --insecure --silent --fail --connect-timeout 1 --max-time 2 "https://127.0.0.1:${port}/mobile.html" -o "$temporary_root/mobile.html"; then ready="true"; break; fi
  if ! kill -0 "$server_pid" 2>/dev/null; then break; fi
  sleep 0.2
done
if [[ "$ready" != "true" ]]; then
  cat "$server_log" >&2 || true
  exit 1
fi

grep -Fq '<title>Signlocal Signaturpad</title>' "$temporary_root/mobile.html"
for route in / /mobile.html /desktop.js /mobile.js /app.css; do
  curl --insecure --silent --show-error --fail --connect-timeout 1 --max-time 2 "https://127.0.0.1:${port}${route}" -o /dev/null
done

printf 'test-macos-package-runtime.sh: Test erfolgreich\n'
