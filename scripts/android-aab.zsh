#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

print_usage() {
  cat <<'EOF'
Build a signed Android App Bundle (AAB).

Usage:
  zsh scripts/android-aab.zsh

Env:
  ALLOW_DEBUG_SIGNING=1   Allow building even if android/key.properties is missing
                          (build will fall back to debug keystore; not Play-Store-ready).
EOF
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  print_usage
  exit 0
fi

# Prefer Homebrew OpenJDK 17 if present (Apple Silicon default path).
if [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if ! command -v java >/dev/null 2>&1; then
  echo "ERROR: java not found. Install JDK 17 (recommended):" >&2
  echo "  brew install openjdk@17" >&2
  exit 1
fi

KEY_PROPS="$ANDROID_DIR/key.properties"
if [[ ! -f "$KEY_PROPS" ]]; then
  if [[ "${ALLOW_DEBUG_SIGNING-}" == "1" ]]; then
    echo "WARN: $KEY_PROPS missing -> Gradle will sign release with debug keystore." >&2
    echo "      This AAB is NOT Play-Store-ready." >&2
  else
    echo "ERROR: Missing $KEY_PROPS" >&2
    echo "Create it by copying the template:" >&2
    echo "  cp android/key.properties.example android/key.properties" >&2
    echo "Then generate a keystore (example):" >&2
    echo "  keytool -genkeypair -v -storetype JKS -keystore android/release.keystore \\" >&2
    echo "    -keyalg RSA -keysize 2048 -validity 10000 -alias release" >&2
    echo "And fill passwords/alias in android/key.properties." >&2
    echo "" >&2
    echo "(If you intentionally want debug signing, run with ALLOW_DEBUG_SIGNING=1)" >&2
    exit 1
  fi
fi

cd "$ANDROID_DIR"
./gradlew :app:bundleRelease --no-daemon

if [[ -f "$AAB_PATH" ]]; then
  echo ""
  echo "OK: AAB built:"
  echo "$AAB_PATH"
  ls -lh "$AAB_PATH"
else
  echo "ERROR: Expected AAB not found at: $AAB_PATH" >&2
  exit 1
fi
