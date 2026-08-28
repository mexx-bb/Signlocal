#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
installer="$root/macos/Install-SignLocal-Companion.command"
guide="$root/macos/README-macOS.md"
builder="$root/macos/build-package.sh"
runtime_test="$root/scripts/test-macos-package-runtime.sh"
autostart_setup_test="$root/scripts/test-macos-autostart-setup.sh"

test -f "$installer"
test -f "$guide"
test -f "$builder"
test -f "$runtime_test"
test -f "$autostart_setup_test"
bash -n "$installer"
bash -n "$builder"

grep -Fq 'AUSSENDIENST OHNE INTERNET' "$installer"
grep -Fq 'Internetsfreigabe' "$installer" || grep -Fq 'Internetfreigabe' "$installer"
grep -Fq 'Test-PrivateIPv4' "$installer" || grep -Fq 'is_private_ipv4' "$installer"
grep -Fq 'SIGNLOCAL_TLS_KEY' "$installer"
grep -Fq 'SIGNLOCAL_TLS_CERT' "$installer"
grep -Fq 'SIGNLOCAL_ALLOWED_ORIGIN' "$installer"
grep -Fq 'SIGNLOCAL_CA_DOWNLOAD=1' "$installer"
grep -Fq 'signlocal-lan-key.pem' "$installer"
grep -Fq 'brew.sh' "$installer"
grep -Fq 'BUNDLED_COMPANION' "$installer"
grep -Fq 'Mitgelieferte lokale Companion-Dateien' "$installer"
grep -Fq 'Die mobile Companion-Seite' "$installer"
grep -Fq 'SignLocal-Companion-Autostart.command' "$installer"
grep -Fq 'launchctl bootstrap' "$installer"
grep -Fq 'KeepAlive' "$installer"
grep -Fq 'ThrottleInterval' "$installer"
grep -Fq 'signlocal-lan-host.txt' "$installer"
grep -Fq 'Autostart bewusst aktivieren' "$installer"
! grep -Fq 'sudo launchctl' "$installer"
! grep -Fq 'SIGNLOCAL_ALLOW_ORIGINLESS_TESTS=1' "$installer"
! grep -Fq 'SIGNLOCAL_HOST=0.0.0.0' "$installer"
! grep -Fq 'github.com/mexx-bb/Signlocal' "$installer"
! grep -Fq 'SOURCE_ZIP=' "$installer"
grep -Fq 'Außendienst ohne Internet' "$guide"
grep -Fq 'Internetfreigabe' "$guide"
grep -Fq 'signlocal-lan-key.pem' "$guide"
grep -Fq 'kein GitHub-Zugang erforderlich' "$guide"

temporary_root="$(mktemp -d "${TMPDIR:-/tmp}/signlocal-macos-installer-test.XXXXXX")"
trap 'rm -rf "$temporary_root"' EXIT
package_path="$temporary_root/SignLocal-macOS-Companion-Installation.zip"
bash "$builder" "$package_path" >/dev/null
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/Install-SignLocal-Companion.command'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/server.mjs'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/package.json'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/scripts/prepare-local-cert.sh'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/public/index.html'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/public/mobile.html'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/public/desktop.js'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/public/mobile.js'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-macOS-Companion-Installation/companion/public/app.css'
! unzip -Z1 "$package_path" | grep -Eq 'companion/(node_modules|certs)|companion/.*\.(key|pem|crt|p12|pfx)$'
bash "$runtime_test"
bash "$autostart_setup_test"

printf 'test-macos-installer.sh: Test erfolgreich\n'
