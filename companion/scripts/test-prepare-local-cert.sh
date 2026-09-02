#!/usr/bin/env bash
# Isolierter Test für prepare-local-cert.sh: verwendet ein temporäres mkcert-Dummyprogramm.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/prepare-local-cert.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

MOCK_BIN="$TEST_ROOT/bin"
MOCK_CA_ROOT="$TEST_ROOT/mock-ca"
OUTPUT_DIR="$TEST_ROOT/output"
mkdir -p "$MOCK_BIN" "$MOCK_CA_ROOT"

cat > "$MOCK_BIN/mkcert" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  -install)
    mkdir -p "$FAKE_MKCERT_ROOT"
    printf '%s\n' 'mock-root-ca' > "$FAKE_MKCERT_ROOT/rootCA.pem"
    ;;
  -CAROOT)
    printf '%s\n' "$FAKE_MKCERT_ROOT"
    ;;
  -cert-file)
    CERT_FILE="$2"
    shift 2
    [[ "${1:-}" == "-key-file" ]] || exit 64
    KEY_FILE="$2"
    HOST="$3"
    mkdir -p "$(dirname "$CERT_FILE")"
    printf 'mock certificate for %s\n' "$HOST" > "$CERT_FILE"
    printf '%s\n' 'mock-private-key' > "$KEY_FILE"
    ;;
  *)
    exit 64
    ;;
esac
EOF
chmod +x "$MOCK_BIN/mkcert"

PATH="$MOCK_BIN:$PATH" FAKE_MKCERT_ROOT="$MOCK_CA_ROOT" \
  bash "$TARGET_SCRIPT" \
    --host 192.168.178.25 \
    --origin https://mexx-bb.github.io \
    --output-dir "$OUTPUT_DIR" > "$TEST_ROOT/output.log"

[[ -s "$OUTPUT_DIR/signlocal-lan-cert.pem" ]]
[[ -s "$OUTPUT_DIR/signlocal-lan-key.pem" ]]
[[ -s "$OUTPUT_DIR/Signlocal-Local-CA.pem" ]]
grep -q 'SIGNLOCAL_HOST="192.168.178.25"' "$TEST_ROOT/output.log"

if PATH="$MOCK_BIN:$PATH" FAKE_MKCERT_ROOT="$MOCK_CA_ROOT" \
  bash "$TARGET_SCRIPT" --host 8.8.8.8 --output-dir "$TEST_ROOT/invalid" >/dev/null 2>&1; then
  printf '%s\n' 'Fehler: Öffentliche IP-Adresse wurde fälschlich akzeptiert.' >&2
  exit 1
fi

printf '%s\n' 'prepare-local-cert.sh: Test erfolgreich'
