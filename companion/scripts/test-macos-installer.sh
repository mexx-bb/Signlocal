#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
installer="$root/macos/Install-SignLocal-Companion.command"
guide="$root/macos/README-macOS.md"

test -f "$installer"
test -f "$guide"
bash -n "$installer"

grep -Fq 'AUSSENDIENST OHNE INTERNET' "$installer"
grep -Fq 'Internetsfreigabe' "$installer" || grep -Fq 'Internetfreigabe' "$installer"
grep -Fq 'Test-PrivateIPv4' "$installer" || grep -Fq 'is_private_ipv4' "$installer"
grep -Fq 'SIGNLOCAL_TLS_KEY' "$installer"
grep -Fq 'SIGNLOCAL_TLS_CERT' "$installer"
grep -Fq 'SIGNLOCAL_ALLOWED_ORIGIN' "$installer"
grep -Fq 'SIGNLOCAL_CA_DOWNLOAD=1' "$installer"
grep -Fq 'signlocal-lan-key.pem' "$installer"
grep -Fq 'brew.sh' "$installer"
! grep -Fq 'SIGNLOCAL_ALLOW_ORIGINLESS_TESTS=1' "$installer"
! grep -Fq 'SIGNLOCAL_HOST=0.0.0.0' "$installer"
grep -Fq 'Außendienst ohne Internet' "$guide"
grep -Fq 'Internetfreigabe' "$guide"
grep -Fq 'signlocal-lan-key.pem' "$guide"

printf 'test-macos-installer.sh: Test erfolgreich\n'
