#!/usr/bin/env zsh
set -euo pipefail

BUILD_ID="${1:-}"
OUT_FILE="${2:-dist/myministories-preview.apk}"

if [[ -z "$BUILD_ID" ]]; then
  echo "Usage: $0 <EAS_BUILD_ID> [output_apk_path]" >&2
  exit 2
fi

mkdir -p "$(dirname "$OUT_FILE")"

echo "Waiting for EAS build to finish: $BUILD_ID"
while true; do
  json=$(npx --yes eas-cli@latest build:view "$BUILD_ID" --json)

  parsed=$(printf '%s' "$json" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);const st=j.status||"?";const url=((j.artifacts||{}).buildUrl)||"";process.stdout.write(st+"\t"+url);});')

  IFS=$'\t' read -r build_status build_url <<< "$parsed"
  echo "$(date '+%H:%M:%S') status=$build_status"

  if [[ "$build_status" == "FINISHED" ]]; then
    if [[ -z "$build_url" ]]; then
      echo "Build FINISHED but buildUrl is empty; check build details page." >&2
      exit 3
    fi

    echo "APK URL: $build_url"
    echo "Downloading to: $OUT_FILE"
    curl -L "$build_url" -o "$OUT_FILE"
    ls -lh "$OUT_FILE"
    exit 0
  fi

  if [[ "$build_status" == "ERRORED" || "$build_status" == "CANCELED" ]]; then
    echo "Build ended: $build_status" >&2
    exit 1
  fi

  sleep 30
done
