#!/usr/bin/env bash
# Isolierter Test der macOS-Benutzer-Autostart-Erzeugung ohne echten Systemdienst.
set -Eeuo pipefail
IFS=$'\n\t'

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temporary_root="$(mktemp -d "${TMPDIR:-/tmp}/signlocal-macos-autostart-test.XXXXXX")"
cleanup() { rm -rf "$temporary_root"; }
trap cleanup EXIT

package_path="$temporary_root/SignLocal-macOS-Companion-Installation.zip"
bash "$root/macos/build-package.sh" "$package_path" >/dev/null
unzip -q "$package_path" -d "$temporary_root/extracted"
bundle="$temporary_root/extracted/SignLocal-macOS-Companion-Installation"
home="$temporary_root/home"
bin="$temporary_root/bin"
mkdir -p "$home/Desktop" "$bin"

cat > "$bin/brew" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$bin/npm" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$bin/ipconfig" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "getifaddr" && "${2:-}" == "bridge100" ]]; then echo "192.168.2.1"; exit 0; fi
exit 1
EOF
cat > "$bin/mkcert" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "-install" ]]; then exit 0; fi
if [[ "${1:-}" == "-CAROOT" ]]; then mkdir -p "$HOME/test-ca"; : > "$HOME/test-ca/rootCA.pem"; echo "$HOME/test-ca"; exit 0; fi
cert=""; key=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -cert-file) cert="$2"; shift 2 ;;
    -key-file) key="$2"; shift 2 ;;
    *) shift ;;
  esac
done
mkdir -p "$(dirname "$cert")" "$(dirname "$key")"
: > "$cert"; : > "$key"
EOF
chmod 700 "$bin"/*

printf 'JA\n' | HOME="$home" PATH="$bin:$PATH" bash "$bundle/Install-SignLocal-Companion.command" --no-start >/dev/null
start="$home/Library/Application Support/SignLocal/Companion/Start-SignLocal-Companion.command"
autostart="$home/Library/Application Support/SignLocal/Companion/SignLocal-Companion-Autostart.command"
enable="$home/Desktop/SignLocal Companion Autostart aktivieren.command"
disable="$home/Desktop/SignLocal Companion Autostart beenden.command"

test -x "$start" && test -x "$autostart" && test -x "$enable" && test -x "$disable"
bash -n "$start" && bash -n "$autostart" && bash -n "$enable" && bash -n "$disable"
grep -Fq 'launchctl bootstrap' "$autostart"
grep -Fq 'launchctl bootout' "$autostart"
grep -Fq 'KeepAlive' "$autostart"
grep -Fq 'ThrottleInterval' "$autostart"
grep -Fq 'signlocal-lan-host.txt' "$start"
! grep -Fq '0.0.0.0' "$start"
printf 'test-macos-autostart-setup.sh: Test erfolgreich\n'
