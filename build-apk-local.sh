#!/bin/bash
# Build APK packages for OpenWrt 25.12 (podkop-xray + luci-app-podkop-xray)
# Usage: ./build-apk-local.sh [version] [build]
# Example: ./build-apk-local.sh 0.26.3.27 0
# Output: bin/apk/podkop-xray_0.26.3.27-r0_all.apk

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

VERSION="${1:-0.26.3.27}"
BUILD="${2:-0}"
echo "=== Building podkop-xray APK v${VERSION}-${BUILD} ==="

# Step 1: Build SDK base image (cached after first run)
echo "=== Building SDK base image ==="
docker build -t podkop-xray-sdk-apk:latest -f sdk/Dockerfile-sdk-apk sdk/

# Step 2: Build packages
echo "=== Building APK packages ==="
docker build \
    --build-arg PODKOP_XRAY_VERSION="$VERSION" \
    --build-arg PODKOP_XRAY_BUILD="$BUILD" \
    -t podkop-xray-build \
    -f Dockerfile-apk .

# Step 3: Extract APK files
echo "=== Extracting APK packages ==="
mkdir -p ./bin/apk
docker rm px-extract 2>/dev/null || true
docker create --name px-extract podkop-xray-build
docker cp px-extract:/builder/bin/packages/x86_64/utilities/. ./bin/apk/ 2>/dev/null || true
docker cp px-extract:/builder/bin/packages/x86_64/luci/. ./bin/apk/ 2>/dev/null || true
docker rm px-extract

echo ""
echo "=== APK packages ==="
ls -la ./bin/apk/*.apk 2>/dev/null || echo "No APK files found — check build output above"
