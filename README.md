# 🚀 podkop-xray

> 🇷🇺 **[Русская версия / Russian version](README_RU.md)**

🔒 Selective domain routing for OpenWrt using **Xray-core** with **REALITY** security for maximum DPI resistance.

An alternative to [podkop](https://github.com/itdoginfo/podkop) that replaces sing-box with Xray-core, focusing on VLESS+REALITY combinations with advanced transports.

## 📦 Installation (one command)

```sh
wget -qO- https://raw.githubusercontent.com/skvarovski/OpenWrt-Podkop-Xray-XHTTP/main/install.sh | sh
```

This will:
1. 📥 Download and install **xray-core 26.3.27** (binary from GitHub releases)
2. 📦 Install **podkop-xray** + **luci-app-podkop-xray** APK packages
3. 🔧 Install all dependencies (`curl`, `jq`, `kmod-nft-tproxy`, etc.)
4. ✅ Enable the service

After installation:
- 🌐 Open LuCI web UI → Services → Podkop Xray
- 📋 Paste your VLESS+REALITY proxy string
- 💾 Save & Apply, then start the service

### 🖥️ Supported architectures
| Architecture | Devices |
|---|---|
| `aarch64` | Xiaomi AX3000T, most modern routers |
| `x86_64` | x86 routers, VMs |
| `armv7` | older ARM routers |

### ⚙️ Requirements
- **OpenWrt 25.12+** (apk package manager)
- ~15MB free space
- Working internet connection

### 🔥 Recommended: Custom Firmware with All Dependencies

> **For the best experience, build a firmware image with all required packages pre-installed.** This eliminates dependency issues and ensures everything works out of the box.

Use [OpenWrt Firmware Selector](https://firmware-selector.openwrt.org/) for your device and add these packages to the **"Installed Packages"** field:

```
-dnsmasq dnsmasq-full kmod-nft-tproxy curl jq coreutils-base64 bind-dig unzip
```

These are added **on top of** the default package set for your device. See [firmware/README.md](firmware/README.md) for a complete example with Xiaomi AX3000T (including Wi-Fi setup, Russian locale, and other useful packages).

## ✨ Features

- 🛡️ **VLESS + REALITY** — all transports (TCP, XHTTP, gRPC) with REALITY security
- ⚡ **XTLS-Vision** — TCP + REALITY with flow control for maximum performance
- 🌊 **XHTTP + REALITY** — xmux multiplexing + xPadding for DPI evasion
- 🔗 **gRPC + REALITY** — CDN-compatible transport with REALITY masking
- 🔀 **Mixed Proxy** — HTTP+SOCKS5 inbound on one port for manual proxy configuration
- 🎭 **FakeDNS** — transparent DNS-based routing via 198.18.0.0/15
- 🎯 **Selective routing** — route only specific domains/IPs through proxy
- 🌍 **Geosite routing** — 24 categories (dynamic from geosite.dat), proxy/direct/block per section
- 🗺️ **GeoIP routing** — 11 categories (dynamic from geoip.dat), proxy/direct/block per section
- 📐 **Rules Type** — configurable rule evaluation order with catch-all based on last word
- 🏠 **Router direct mode** — router's own traffic bypasses proxy by default (DHCP DNS)
- 📝 **User lists** — manual domains/subnets via dynamic list or text with comments
- 📡 **Remote/local lists** — domain/subnet lists from URLs or local files
- 🖥️ **LuCI Web UI** — full web interface with diagnostics and geofiles release tracking
- 🧦 **SOCKS** — outbound for proxy chaining

## 🔍 How It Works

```
LAN client -> dnsmasq -> Xray DNS (127.0.0.1:5300) -> FakeDNS (198.18.0.0/15)
           -> nftables mangle (prerouting) mark 0x00100000 -> tproxy :12345
           -> Xray dokodemo-door -> VLESS+XHTTP -> remote server

Router     -> /etc/resolv.conf -> DHCP DNS -> real IP -> direct (no nftables)
           (when enable_output_network_interface=0, default)
```

Four layers work together:

| Layer | Component | Role |
|-------|-----------|------|
| 1 | **nftables** | Mark traffic by FakeIP range + custom subnets |
| 2 | **ip routing** | Route marked packets via tproxy to Xray |
| 3 | **Xray-core** | dokodemo-door inbound, protocol handling, FakeDNS |
| 4 | **dnsmasq** | Forward DNS queries to Xray DNS inbound |

## ⚙️ Configuration

Edit `/etc/config/podkop-xray` or use LuCI web UI:

```
config settings 'settings'
        option dns_type 'doh'
        option dns_server 'https://dns.google/dns-query'
        option bootstrap_dns_server '8.8.8.8'
        list source_network_interfaces 'br-lan'
        option config_path '/etc/xray/config.json'
        option log_level 'warning'

config section 'main'
        option connection_type 'proxy'
        option proxy_config_type 'url'
        option proxy_string 'vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto'
        option rules_type 'block_proxy_direct'
        list geosite_proxy 'RU-BLOCKED'
        list geosite_proxy 'CATEGORY-MEDIA'
        list geosite_direct 'CATEGORY-RU'
        list geosite_block 'CATEGORY-ADS-ALL'
        list geoip_proxy 'RU-BLOCKED'
        list geoip_direct 'RU-WHITELIST'
```

### 🔑 Proxy String Format

All VLESS connections use **REALITY** security for maximum DPI resistance:

🛡️ **VLESS + XHTTP + REALITY + Finalmask** — maximum DPI resistance, best setup as of April 2026 🔥🏆:
```
vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22length%22%3A%22100-300%22%2C%22delay%22%3A%221-5%22%7D%7D%2C%7B%22type%22%3A%22sudoku%22%2C%22settings%22%3A%7B%22password%22%3A%22mypassword%22%2C%22paddingMin%22%3A10%2C%22paddingMax%22%3A50%7D%7D%5D%7D
```
> 💡 `fm=` is a URL-encoded JSON object that is placed into `streamSettings.finalmask` as-is. The decoded form of the example above is:
> ```json
> {"tcp":[
>   {"type":"fragment","settings":{"packets":"tlshello","length":"100-300","delay":"1-5"}},
>   {"type":"sudoku","settings":{"password":"mypassword","paddingMin":10,"paddingMax":50}}
> ]}
> ```
> Fragment breaks TLS ClientHello into small chunks, Sudoku transforms data patterns — together they defeat deep packet inspection. `sudoku` password must match on client and server.

📋 **Finalmask (`fm=` parameter):**
- Any client panel that supports the new xray-core Finalmask format (Hiddify, v2rayN, etc.) generates `fm=` automatically from the server config.
- The layer types (`fragment`, `sudoku`, future ones) and their settings are defined by xray-core — podkop-xray passes the object through unchanged.
- If `fm=` is present but the decoded value is not valid JSON, the service refuses to start and logs `Invalid JSON in fm= parameter of proxy_string`.

**VLESS + TCP + REALITY** (XTLS-Vision — golden standard):
```
vless://UUID@server:443?security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&flow=xtls-rprx-vision
```

**VLESS + XHTTP + REALITY** (advanced, with xmux and xPadding):
```
vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto
```

**VLESS + gRPC + REALITY**:
```
vless://UUID@server:443?type=grpc&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&serviceName=mygrpc
```

**SOCKS** (for proxy chaining):
```
socks://user:pass@127.0.0.1:1080
```

### 📐 Rules Type

Controls the order of geosite/geoip rule evaluation (first match wins). The last word determines the catch-all outbound for unmatched traffic:

| Value | Order | Catch-all |
|-------|-------|-----------|
| `proxy_direct_block` | Proxy → Direct → Block | block |
| `block_proxy_direct` | Block → Proxy → Direct (default) | direct |
| `direct_proxy_block` | Direct → Proxy → Block | block |
| `block_direct_proxy` | Block → Direct → Proxy | proxy |
| `proxy_everything` | all lists ignored | proxy |

`block_direct_proxy` sends any traffic not matched by explicit block/direct lists through the proxy — useful for a "VPN unless listed" policy. `proxy_everything` skips every geosite/geoip/user list in the section and forwards all traffic that reaches xray straight to the proxy outbound.

### 📚 Advanced documentation

- 🛡️ [Maximum DPI protection guide](docs/xray-max-protection-config.md) — full client + server configs with VLESS+XHTTP+REALITY+Finalmask, layer-by-layer DPI resistance breakdown, all available Finalmask layers reference
- 🖥️ [Server config example](docs/server-config-example.json) — ready-to-use Xray server config with XHTTP+REALITY+Finalmask (fragment+sudoku) and chain proxy outbound

## 🏷️ Versioning

Version format: `0.<xray_version>-<build>`, e.g. `0.26.3.27-0`

- `0.26.3.27` — based on xray-core version
- `-0` — incrementing build number

GitHub tags: `v0.26.3.27-0`, `v0.26.3.27-1`, etc.

## 🔨 Building from source

Requires Docker 20+.

```bash
# Build APK packages
./build-apk-local.sh 0.26.3.27 0

# Output: bin/apk/podkop-xray_0.26.3.27-r0_all.apk
#         bin/apk/luci-app-podkop-xray_0.26.3.27-r0_all.apk
```

See [docs/building-apk.md](docs/building-apk.md) for details.

## 🤖 CI/CD

GitHub Actions workflow:

| Workflow | Trigger | Action |
|---|---|---|
| `build-release.yml` | Tag push `v*` | Build APK + create GitHub release |

To create a release:
```bash
git tag v0.26.3.27-0
git push origin v0.26.3.27-0
```

## 🛠️ CLI Usage

```bash
# Service management
/etc/init.d/podkop-xray start|stop|restart

# Diagnostics
podkop-xray global_check          # Full diagnostic report
podkop-xray check_xray            # Xray installation status
podkop-xray check_dns_available   # DNS connectivity check
podkop-xray check_nft_rules       # nftables rules check
podkop-xray check_fakeip          # FakeIP check
podkop-xray check_logs            # Recent logs
podkop-xray show_xray_config      # Generated Xray config (masked)
podkop-xray list_geosite_categories  # List geosite.dat categories
podkop-xray list_geoip_categories    # List geoip.dat categories
```

## 📁 File Structure

```
podkop-xray/
    Makefile                            # OpenWrt package definition
    Dockerfile-apk                      # Docker build image
    build-apk-local.sh                  # Local APK build script
    install.sh                          # One-line installer
    .github/workflows/
        build-release.yml               # CI: build APK + release on tag push
    files/
        etc/
            config/podkop-xray          # UCI default configuration
            init.d/podkop-xray          # procd init script
        usr/
            bin/podkop-xray             # Main script
            lib/podkop-xray/
                constants.sh            # Ports, marks, URLs, tags
                logging.sh              # Logging functions
                helpers.sh              # URL parsing, IP validation
                nft.sh                  # nftables + ip routing + dnsmasq
                rulesets.sh             # Domain/subnet list management
                xray_config.sh          # Xray JSON config generation
                xhttp_parser.sh         # XHTTP URL parameter parsing
    luci-app-podkop-xray/               # LuCI web UI package
    docs/                               # Documentation
```

## 🙏 Credits

- [podkop](https://github.com/itdoginfo/podkop) — original project by ITDog
- [Xray-core](https://github.com/XTLS/Xray-core) — proxy platform with XHTTP
- [russia-v2ray-rules-dat](https://github.com/runetfreedom/russia-v2ray-rules-dat) — geodata source

## 📄 License

GPL-2.0-or-later (same as podkop)
