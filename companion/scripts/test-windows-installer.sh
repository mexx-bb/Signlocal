#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
installer="$root/windows/Install-SignLocal-Companion.ps1"
starter="$root/windows/SignLocal-Companion-Installation-starten.cmd"
guide="$root/windows/README-Windows.md"
builder="$root/windows/build-package.sh"

test -f "$installer"
test -f "$starter"
test -f "$guide"
test -f "$builder"

grep -Fq 'NetworkCategory -ne "Private"' "$installer"
grep -Fq 'Test-PrivateIPv4' "$installer"
grep -Fq 'SIGNLOCAL_TLS_KEY' "$installer"
grep -Fq 'SIGNLOCAL_TLS_CERT' "$installer"
grep -Fq 'SIGNLOCAL_ALLOWED_ORIGIN' "$installer"
grep -Fq 'SIGNLOCAL_CA_DOWNLOAD=1' "$installer"
grep -Fq 'New-NetFirewallRule' "$installer"
grep -Fq -- '-Profile Private' "$installer"
grep -Fq 'FiloSottile.mkcert' "$installer"
grep -Fq 'OpenJS.NodeJS.LTS' "$installer"
grep -Fq 'AUSSENDIENST OHNE INTERNET' "$installer"
grep -Fq 'Mobiler Hotspot' "$installer"
grep -Fq 'Start-SignLocal-Companion-Background.ps1' "$installer"
grep -Fq 'SignLocal-Companion-Autostart.ps1' "$installer"
grep -Fq 'schtasks.exe /Create' "$installer"
grep -Fq '/SC ONLOGON' "$installer"
grep -Fq '/RL LIMITED' "$installer"
grep -Fq 'Get-NetConnectionProfile' "$installer"
grep -Fq 'signlocal-lan-host.txt' "$installer"
grep -Fq 'Autostart bewusst aktivieren' "$installer"
grep -Fq 'BundledCompanion' "$installer"
grep -Fq 'Mitgelieferte lokale Companion-Dateien' "$installer"
! grep -Fq 'github.com/mexx-bb' "$installer"
! grep -Fq 'SIGNLOCAL_ALLOW_ORIGINLESS_TESTS=1' "$installer"
! grep -Fq 'SIGNLOCAL_HOST=0.0.0.0' "$installer"
grep -Fq 'privaten WLAN' "$guide"
grep -Fq 'Außendienst ohne Internet' "$guide"
grep -Fq 'Mobiler Hotspot' "$guide"
grep -Fq 'signlocal-lan-key.pem' "$guide"

temporary_root="$(mktemp -d "${TMPDIR:-/tmp}/signlocal-windows-package-test.XXXXXX")"
trap 'rm -rf "$temporary_root"' EXIT
package_path="$temporary_root/SignLocal-Windows-Companion-Installation.zip"
bash "$builder" "$package_path" >/dev/null
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-Windows-Companion-Installation/companion/server.mjs'
unzip -Z1 "$package_path" | grep -Fxq 'SignLocal-Windows-Companion-Installation/companion/public/mobile.html'
! unzip -Z1 "$package_path" | grep -Eq 'companion/(node_modules|certs)|companion/.*\.(key|pem|crt|p12|pfx)$'

printf 'test-windows-installer.sh: Test erfolgreich\n'
