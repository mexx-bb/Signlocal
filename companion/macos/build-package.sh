#!/usr/bin/env bash
# Erstellt das verteilbare macOS-Installationspaket mit allen produktiven Companion-Dateien.
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="${1:?Verwendung: build-package.sh /vollstaendiger/Pfad/SignLocal-macOS-Companion-Installation.zip}"
output_directory="$(cd "$(dirname "$output")" && pwd)"
output="${output_directory}/$(basename "$output")"
bundle_name="SignLocal-macOS-Companion-Installation"
temporary_root="$(mktemp -d "${TMPDIR:-/tmp}/signlocal-macos-package.XXXXXX")"
bundle_root="${temporary_root}/${bundle_name}"

cleanup() { rm -rf "$temporary_root"; }
trap cleanup EXIT

mkdir -p "${bundle_root}/companion/scripts" "${bundle_root}/companion/public"
install -m 700 "${root}/macos/Install-SignLocal-Companion.command" "${bundle_root}/Install-SignLocal-Companion.command"
install -m 600 "${root}/macos/README-macOS.md" "${bundle_root}/README-macOS.md"
install -m 600 "${root}/server.mjs" "${bundle_root}/companion/server.mjs"
install -m 600 "${root}/package.json" "${bundle_root}/companion/package.json"
install -m 700 "${root}/scripts/prepare-local-cert.sh" "${bundle_root}/companion/scripts/prepare-local-cert.sh"
for web_file in index.html mobile.html desktop.js mobile.js app.css; do
  install -m 600 "${root}/public/${web_file}" "${bundle_root}/companion/public/${web_file}"
done

rm -f "$output"
( cd "$temporary_root" && zip -q -r "$output" "$bundle_name" )
printf 'macOS-Paket erstellt: %s\n' "$output"
