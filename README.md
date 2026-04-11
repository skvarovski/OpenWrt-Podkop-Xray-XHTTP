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

🛡️ **VLESS + XHTTP + REALITY + Fragment + Sudoku** — maximum DPI resistance, best setup as of March 2026 🔥🏆:
```
vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto&fragment_length=10-50&fragment_delay=5-15&sudoku=mypassword
```
> 💡 `sudoku` password must match on client and server. Fragment breaks TLS ClientHello into small chunks, Sudoku transforms data patterns — together they defeat deep packet inspection.

⚡ **VLESS + XHTTP + REALITY + Fragment** — TLS ClientHello fragmentation for DPI bypass:
```
vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto&fragment_length=10-50&fragment_delay=5-15
```

📋 **Finalmask parameters:**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `fragment_length` | `10-50` | TLS ClientHello fragment size range (bytes) |
| `fragment_delay` | `5-15` | Delay between fragments (ms) |
| `fragment_packets` | `tlshello` | What to fragment (default: `tlshello`) |
| `sudoku` | `mypassword` | Sudoku obfuscation password (must match server) |

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
