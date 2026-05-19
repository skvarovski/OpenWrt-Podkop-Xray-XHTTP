#!/bin/sh
# install.sh — one-line installer for podkop-xray on OpenWrt 25.12+
# Usage: wget -qO- https://raw.githubusercontent.com/skvarovski/OpenWrt-Podkop-Xray-XHTTP/main/install.sh | sh

set -e

XRAY_VER="26.3.27"
REPO="skvarovski/OpenWrt-Podkop-Xray-XHTTP"

# Fetch latest release tag from GitHub API
echo "=== Fetching latest release ==="
LATEST_TAG=$(wget -qO- "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//')
if [ -z "$LATEST_TAG" ]; then
    echo "ERROR: Cannot fetch latest release from GitHub"
    exit 1
fi
echo "Latest release: $LATEST_TAG"

# Tag format: v0.26.3.27-0 → extract version parts
PKG_VER=$(echo "$LATEST_TAG" | sed 's/^v//')          # 0.26.3.27-0
XRAY_VER_FROM_TAG=$(echo "$PKG_VER" | sed 's/-[0-9]*$//')  # 0.26.3.27
BUILD_NUM=$(echo "$PKG_VER" | grep -o '[0-9]*$')       # 0

GITHUB="https://github.com/$REPO/releases/download/$LATEST_TAG"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
aarch64) XRAY_ARCH="arm64-v8a" ;;
x86_64)  XRAY_ARCH="64" ;;
armv7*)  XRAY_ARCH="arm32-v7a" ;;
*)       echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

# Ensure the OpenWrt package mirror is reachable before any `apk` call.
# Some uplinks hand out a DNS that resolves downloads.openwrt.org (Fastly)
# to an IP that is unreachable on TCP/443 — ping works, HTTPS times out —
# which makes `apk` fail with "wget: Operation not permitted". Detect that
# and pin a working Fastly IP into /etc/hosts (musl reads /etc/hosts
# before consulting DNS, so this fixes apk, wget and curl alike).
ensure_openwrt_mirror() {
    host="downloads.openwrt.org"
    probe="https://$host/releases/"

    if wget -q -T 10 -O /dev/null "$probe" 2>/dev/null; then
        return 0
    fi
    echo "WARNING: $host unreachable — resolving via public DNS..."

    for dns in 8.8.8.8 1.1.1.1 9.9.9.9; do
        for ip in $(nslookup "$host" "$dns" 2>/dev/null \
                    | awk '/^Address/ {print $2}' \
                    | grep -E '^[0-9]+\.[0-9.]+$'); do
            sed -i '/# podkop-xray installer$/d' /etc/hosts 2>/dev/null
            echo "$ip $host  # podkop-xray installer" >> /etc/hosts
            if wget -q -T 10 -O /dev/null "$probe" 2>/dev/null; then
                echo "Using mirror IP $ip for $host"
                return 0
            fi
        done
    done

    sed -i '/# podkop-xray installer$/d' /etc/hosts 2>/dev/null
    echo "WARNING: no reachable $host IP found — apk may fail"
    return 0
}
ensure_openwrt_mirror

echo "=== Installing xray-core $XRAY_VER ($XRAY_ARCH) ==="
# Ensure unzip is available
if ! command -v unzip >/dev/null 2>&1; then
    echo "Installing unzip..."
    apk add unzip
fi
TMPDIR=$(mktemp -d)
wget -qO "$TMPDIR/xray.zip" "https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VER}/Xray-linux-${XRAY_ARCH}.zip"
unzip -o "$TMPDIR/xray.zip" xray -d "$TMPDIR/"
mv "$TMPDIR/xray" /usr/bin/xray
chmod +x /usr/bin/xray
rm -rf "$TMPDIR"
echo "Xray $(xray version | head -1)"

echo "=== Installing podkop-xray packages ==="
# APK naming: podkop-xray-VERSION-rBUILD.apk (OpenWrt SDK format)
APK_SUFFIX="${XRAY_VER_FROM_TAG}-r${BUILD_NUM}"
wget -qO /tmp/podkop-xray.apk "$GITHUB/podkop-xray-${APK_SUFFIX}.apk"
wget -qO /tmp/luci-app-podkop-xray.apk "$GITHUB/luci-app-podkop-xray-${APK_SUFFIX}.apk"

# Install dependencies
apk add curl jq kmod-nft-tproxy coreutils-base64 bind-dig dnsmasq-full 2>/dev/null || true

apk add --allow-untrusted /tmp/podkop-xray.apk
apk add --allow-untrusted /tmp/luci-app-podkop-xray.apk
rm -f /tmp/podkop-xray.apk /tmp/luci-app-podkop-xray.apk

echo "=== Enabling service ==="
/etc/init.d/podkop-xray enable

# Ensure crond is running (needed for automatic list updates)
if ! pgrep -x crond >/dev/null 2>&1; then
    /etc/init.d/cron start 2>/dev/null
    /etc/init.d/cron enable 2>/dev/null
fi

echo ""
echo "=== podkop-xray installed ==="
echo "Version: $(podkop-xray show_version 2>/dev/null || echo "$PKG_VER")"
echo "Edit config: vi /etc/config/podkop-xray (or use LuCI web UI)"
echo "Start: /etc/init.d/podkop-xray start"
