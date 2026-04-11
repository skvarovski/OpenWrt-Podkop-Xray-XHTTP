# Xray JSON configuration generator
# Builds complete Xray config from UCI settings

# Initialize empty Xray config
xray_init_config() {
    echo '{
        "log": {},
        "dns": {},
        "fakeDns": {},
        "routing": {},
        "inbounds": [],
        "outbounds": []
    }'
}

# Configure log section
xray_configure_log() {
    local config="$1"
    local log_level="$2"

    echo "$config" | jq --arg level "$log_level" \
        '.log = { loglevel: $level }'
}

# Configure FakeDNS
xray_configure_fakedns() {
    local config="$1"

    echo "$config" | jq \
        --arg pool "$XRAY_FAKEDNS_POOL" \
        --argjson size "$XRAY_FAKEDNS_POOL_SIZE" \
        '.fakeDns = { ipPool: $pool, poolSize: $size }'
}

# Configure DNS section with category-aware servers
# dns_type: udp, doh, dot
# dns_server: IP or URL of DNS server (for proxy categories)
# bootstrap_dns: IP of bootstrap DNS
# proxy_geosite_cats: space-separated geosite categories routed through proxy
# direct_geosite_cats: space-separated geosite categories routed directly
xray_configure_dns() {
    local config="$1"
    local dns_type="$2"
    local dns_server="$3"
    local bootstrap_dns="$4"
    local proxy_geosite_cats="$5"
    local direct_geosite_cats="$6"

    # Build external DNS address (for proxy categories — Russian DNS won't resolve blocked domains)
    local dns_address
    case "$dns_type" in
    udp)
        dns_address="$dns_server"
        ;;
    doh)
        if echo "$dns_server" | grep -q "^https://"; then
            dns_address="$dns_server"
        else
            dns_address="https://$dns_server/dns-query"
        fi
        ;;
    dot)
        dns_address="tcp+tls://$dns_server"
        ;;
    *)
        log "Unsupported DNS type: $dns_type" "error"
        dns_address="$dns_server"
        ;;
    esac

    # Build proxy domains JSON array from categories
    local proxy_domains_json="[]"
    if [ -n "$proxy_geosite_cats" ]; then
        proxy_domains_json=$(echo "$proxy_geosite_cats" | tr ' ' '\n' | sort -u | while read -r cat; do
            [ -n "$cat" ] && echo "geosite:$(echo "$cat" | tr 'A-Z' 'a-z')"
        done | jq -R . | jq -s .)
    fi

    # Build direct domains JSON array from categories
    local direct_domains_json="[]"
    if [ -n "$direct_geosite_cats" ]; then
        direct_domains_json=$(echo "$direct_geosite_cats" | tr ' ' '\n' | sort -u | while read -r cat; do
            [ -n "$cat" ] && echo "geosite:$(echo "$cat" | tr 'A-Z' 'a-z')"
        done | jq -R . | jq -s .)
    fi

    # Build DNS config: fakedns must be the ONLY server that handles queries
    # Domain-filtered servers (DoH with geosite domains) would override fakedns priority
    # in Xray's DNS resolution order, causing real IPs instead of FakeIP.
    # Real DNS resolution happens on the outbound side (freedom outbound resolves via DoH).
    local dns_config
    dns_config=$(echo "$config" | jq \
        --arg bootstrap "$bootstrap_dns" \
        '.dns = {
            servers: [
                { address: "fakedns" },
                $bootstrap,
                "localhost"
            ],
            queryStrategy: "UseIPv4"
        }')

    # Map DoH hostname to bootstrap IP (prevents "tries to resolve itself" loop)
    if [ "$dns_type" = "doh" ]; then
        local doh_host
        doh_host=$(echo "$dns_address" | sed 's|https://||;s|/.*||')
        case "$doh_host" in
        [0-9]*.[0-9]*.[0-9]*.[0-9]*) ;;
        *)
            dns_config=$(echo "$dns_config" | jq \
                --arg host "$doh_host" \
                --arg ip "$bootstrap_dns" \
                '.dns.hosts = { ($host): $ip }')
            ;;
        esac
    fi

    echo "$dns_config"
}

# Add tproxy dokodemo-door inbound
xray_add_tproxy_inbound() {
    local config="$1"
    local tag="$2"
    local listen="$3"
    local port="$4"

    echo "$config" | jq \
        --arg tag "$tag" \
        --argjson port "$port" \
        --arg listen "$listen" \
        '.inbounds += [{
            tag: $tag,
            port: $port,
            listen: $listen,
            protocol: "dokodemo-door",
            settings: {
                network: "tcp,udp",
                followRedirect: true
            },
            sniffing: {
                enabled: true,
                destOverride: ["http", "tls", "quic", "fakedns"],
                routeOnly: false
            },
            streamSettings: {
                sockopt: {
                    tproxy: "tproxy",
                    mark: 255
                }
            }
        }]'
}

# Add DNS dokodemo-door inbound
xray_add_dns_inbound() {
    local config="$1"
    local tag="$2"
    local listen="$3"
    local port="$4"
    local dns_server="$5"

    echo "$config" | jq \
        --arg tag "$tag" \
        --argjson port "$port" \
        --arg listen "$listen" \
        --arg dns "$dns_server" \
        '.inbounds += [{
            tag: $tag,
            port: $port,
            listen: $listen,
            protocol: "dokodemo-door",
            settings: {
                address: $dns,
                port: 53,
                network: "udp"
            }
        }]'
}

# Add VLESS outbound (supports tcp, xhttp, grpc transports + reality security)
xray_add_vless_outbound() {
    local config="$1"
    local tag="$2"
    local url="$3"

    url=$(url_decode "$url")
    url=$(url_strip_fragment "$url")

    local host port uuid flow encryption
    host=$(url_get_host "$url")
    port=$(url_get_port "$url")
    uuid=$(url_get_userinfo "$url")
    flow=$(url_get_query_param "$url" "flow")
    encryption=$(url_get_query_param "$url" "encryption")
    [ -z "$port" ] && port=443
    [ -z "$encryption" ] && encryption="none"

    # Build base outbound
    local outbound
    outbound=$(jq -n \
        --arg tag "$tag" \
        --arg host "$host" \
        --argjson port "$port" \
        --arg uuid "$uuid" \
        --arg encryption "$encryption" \
        '{
            tag: $tag,
            protocol: "vless",
            settings: {
                vnext: [{
                    address: $host,
                    port: $port,
                    users: [{
                        id: $uuid,
                        encryption: $encryption
                    }]
                }]
            }
        }')

    # Add flow if present
    if [ -n "$flow" ]; then
        outbound=$(echo "$outbound" | jq --arg flow "$flow" \
            '.settings.vnext[0].users[0].flow = $flow')
    fi

    # Build streamSettings
    local stream_settings
    stream_settings=$(jq -n '{}')

    # Transport
    local transport
    transport=$(url_get_query_param "$url" "type")
    [ -z "$transport" ] && transport="tcp"

    case "$transport" in
    xhttp|splithttp)
        local xhttp_settings
        xhttp_settings=$(parse_xhttp_settings "$url")

        stream_settings=$(echo "$stream_settings" | jq --argjson xhttp "$xhttp_settings" \
            '. + { network: "xhttp", xhttpSettings: $xhttp }')

        # Download settings (optional)
        local dl_settings
        dl_settings=$(parse_xhttp_download_settings "$url")
        if [ -n "$dl_settings" ]; then
            stream_settings=$(echo "$stream_settings" | jq --argjson dl "$dl_settings" \
                '.xhttpSettings.downloadSettings = $dl')
        fi
        ;;
    grpc)
        local service_name grpc_mode
        service_name=$(url_get_query_param "$url" "serviceName")
        grpc_mode=$(url_get_query_param "$url" "mode")

        local grpc_settings
        grpc_settings=$(jq -n --arg sn "$service_name" '{ serviceName: $sn }')
        if [ "$grpc_mode" = "multi" ]; then
            grpc_settings=$(echo "$grpc_settings" | jq '. + { multiMode: true }')
        fi

        stream_settings=$(echo "$stream_settings" | jq --argjson grpc "$grpc_settings" \
            '. + { network: "grpc", grpcSettings: $grpc }')
        ;;
    tcp|raw)
        stream_settings=$(echo "$stream_settings" | jq '. + { network: "tcp" }')
        ;;
    *)
        log "Unsupported transport '$transport'. Supported: tcp, xhttp, grpc" "error"
        exit 1
        ;;
    esac

    # Security (TLS / REALITY)
    local security
    security=$(url_get_query_param "$url" "security")
    [ -z "$security" ] && security="none"

    case "$security" in
    reality)
        local sni fingerprint public_key short_id spider_x
        sni=$(url_get_query_param "$url" "sni")
        fingerprint=$(url_get_query_param "$url" "fp")
        public_key=$(url_get_query_param "$url" "pbk")
        short_id=$(url_get_query_param "$url" "sid")
        spider_x=$(url_get_query_param "$url" "spx")

        local reality_settings
        reality_settings=$(jq -n '{}')
        [ -n "$sni" ] && reality_settings=$(echo "$reality_settings" | jq --arg sni "$sni" '. + { serverName: $sni }')
        [ -n "$fingerprint" ] && reality_settings=$(echo "$reality_settings" | jq --arg fp "$fingerprint" '. + { fingerprint: $fp }')
        [ -n "$public_key" ] && reality_settings=$(echo "$reality_settings" | jq --arg pbk "$public_key" '. + { publicKey: $pbk }')
        [ -n "$short_id" ] && reality_settings=$(echo "$reality_settings" | jq --arg sid "$short_id" '. + { shortId: $sid }')
        [ -n "$spider_x" ] && reality_settings=$(echo "$reality_settings" | jq --arg spx "$spider_x" '. + { spiderX: $spx }')

        stream_settings=$(echo "$stream_settings" | jq --argjson reality "$reality_settings" \
            '. + { security: "reality", realitySettings: $reality }')
        ;;
    *)
        log "Unsupported security '$security'. Only 'reality' is supported for VLESS." "error"
        exit 1
        ;;
    esac

    # Add sockopt with mark to prevent routing loops
    stream_settings=$(echo "$stream_settings" | jq \
        '. + { sockopt: { mark: 255 } }')

    # Finalmask: fragment + sudoku (DPI resistance layers)
    local sudoku fragment_length fragment_delay fragment_packets
    sudoku=$(url_get_query_param "$url" "sudoku")
    fragment_length=$(url_get_query_param "$url" "fragment_length")
    fragment_delay=$(url_get_query_param "$url" "fragment_delay")
    fragment_packets=$(url_get_query_param "$url" "fragment_packets")
    [ -z "$fragment_packets" ] && fragment_packets="tlshello"

    if [ -n "$fragment_length" ] || [ -n "$sudoku" ]; then
        local tcp_layers="[]"

        # Fragment layer first (breaks TLS ClientHello into chunks)
        if [ -n "$fragment_length" ]; then
            local frag_settings
            frag_settings=$(jq -n \
                --arg packets "$fragment_packets" \
                --arg length "$fragment_length" \
                '{ packets: $packets, length: $length }')
            if [ -n "$fragment_delay" ]; then
                frag_settings=$(echo "$frag_settings" | jq --arg delay "$fragment_delay" \
                    '. + { delay: $delay }')
            fi
            tcp_layers=$(echo "$tcp_layers" | jq --argjson settings "$frag_settings" \
                '. + [{ type: "fragment", settings: $settings }]')
        fi

        # Sudoku layer second (transforms data appearance)
        if [ -n "$sudoku" ]; then
            local sudoku_settings
            sudoku_settings=$(jq -n \
                --arg password "$sudoku" \
                '{ password: $password, ascii: "prefer_ascii", paddingMin: 1, paddingMax: 8 }')
            tcp_layers=$(echo "$tcp_layers" | jq --argjson settings "$sudoku_settings" \
                '. + [{ type: "sudoku", settings: $settings }]')
        fi

        stream_settings=$(echo "$stream_settings" | jq --argjson layers "$tcp_layers" \
            '. + { finalmask: { tcp: $layers } }')
    fi

    # Combine outbound with streamSettings
    outbound=$(echo "$outbound" | jq --argjson ss "$stream_settings" \
        '. + { streamSettings: $ss }')

    echo "$config" | jq --argjson ob "$outbound" '.outbounds += [$ob]'
}

# Add SOCKS5 inbound with routing rule
xray_add_socks_inbound() {
    local config="$1"
    local tag="$2"
    local listen="$3"
    local port="$4"
    local outbound_tag="$5"

    config=$(echo "$config" | jq \
        --arg tag "$tag" \
        --arg listen "$listen" \
        --argjson port "$port" \
        '.inbounds += [{
            tag: $tag,
            listen: $listen,
            port: $port,
            protocol: "socks",
            settings: {
                udp: true
            },
            sniffing: {
                enabled: true,
                destOverride: ["http", "tls", "quic"],
                routeOnly: true
            }
        }]')

    config=$(echo "$config" | jq \
        --arg in_tag "$tag" \
        --arg out_tag "$outbound_tag" \
        '.routing.rules = [{
            type: "field",
            inboundTag: [$in_tag],
            outboundTag: $out_tag
        }] + .routing.rules')

    echo "$config"
}

# Add HTTP inbound with routing rule
xray_add_http_inbound() {
    local config="$1"
    local tag="$2"
    local listen="$3"
    local port="$4"
    local outbound_tag="$5"

    config=$(echo "$config" | jq \
        --arg tag "$tag" \
        --arg listen "$listen" \
        --argjson port "$port" \
        '.inbounds += [{
            tag: $tag,
            listen: $listen,
            port: $port,
            protocol: "http",
            settings: {},
            sniffing: {
                enabled: true,
                destOverride: ["http", "tls", "quic"],
                routeOnly: true
            }
        }]')

    config=$(echo "$config" | jq \
        --arg in_tag "$tag" \
        --arg out_tag "$outbound_tag" \
        '.routing.rules = [{
            type: "field",
            inboundTag: [$in_tag],
            outboundTag: $out_tag
        }] + .routing.rules')

    echo "$config"
}

# Add SOCKS outbound
xray_add_socks_outbound() {
    local config="$1"
    local tag="$2"
    local url="$3"

    url=$(url_decode "$url")
    url=$(url_strip_fragment "$url")

    local host port userinfo username password
    host=$(url_get_host "$url")
    port=$(url_get_port "$url")
    userinfo=$(url_get_userinfo "$url")
    if [ -n "$userinfo" ]; then
        username="${userinfo%%:*}"
        password="${userinfo#*:}"
    fi

    local server_json
    server_json=$(jq -n \
        --arg host "$host" \
        --argjson port "$port" \
        '{ address: $host, port: $port }')

    if [ -n "$username" ]; then
        server_json=$(echo "$server_json" | jq \
            --arg user "$username" \
            --arg pass "$password" \
            '. + { users: [{ user: $user, pass: $pass }] }')
    fi

    echo "$config" | jq \
        --arg tag "$tag" \
        --argjson server "$server_json" \
        '.outbounds += [{
            tag: $tag,
            protocol: "socks",
            settings: {
                servers: [$server]
            },
            streamSettings: {
                sockopt: { mark: 255 }
            }
        }]'
}

# Add direct (freedom) outbound
xray_add_direct_outbound() {
    local config="$1"
    local tag="$2"

    echo "$config" | jq --arg tag "$tag" \
        '.outbounds += [{
            tag: $tag,
            protocol: "freedom",
            settings: {
                domainStrategy: "UseIPv4"
            },
            streamSettings: {
                sockopt: { mark: 255 }
            }
        }]'
}

# Add blackhole (block) outbound
xray_add_block_outbound() {
    local config="$1"
    local tag="$2"

    echo "$config" | jq --arg tag "$tag" \
        '.outbounds += [{
            tag: $tag,
            protocol: "blackhole",
            settings: {
                response: { type: "http" }
            }
        }]'
}

# Add DNS outbound (routes DNS queries through proxy)
xray_add_dns_outbound() {
    local config="$1"
    local tag="$2"
    local proxy_tag="$3"

    if [ -n "$proxy_tag" ]; then
        echo "$config" | jq \
            --arg tag "$tag" \
            --arg proxy "$proxy_tag" \
            '.outbounds += [{
                tag: $tag,
                protocol: "dns",
                proxySettings: { tag: $proxy }
            }]'
    else
        echo "$config" | jq --arg tag "$tag" \
            '.outbounds += [{
                tag: $tag,
                protocol: "dns"
            }]'
    fi
}

# Configure routing section with rules
xray_configure_routing() {
    local config="$1"
    local proxy_outbound_tag="$2"

    echo "$config" | jq \
        --arg proxy_tag "$proxy_outbound_tag" \
        --arg direct_tag "$XRAY_DIRECT_OUTBOUND_TAG" \
        --arg block_tag "$XRAY_BLOCK_OUTBOUND_TAG" \
        --arg dns_out_tag "$XRAY_DNS_OUTBOUND_TAG" \
        --arg dns_in_tag "$XRAY_DNS_INBOUND_TAG" \
        '.routing = {
            domainStrategy: "IPIfNonMatch",
            rules: [
                {
                    type: "field",
                    inboundTag: [$dns_in_tag],
                    outboundTag: $dns_out_tag
                },
                {
                    type: "field",
                    domain: ["geosite:private"],
                    outboundTag: $direct_tag
                },
                {
                    type: "field",
                    ip: [
                        "0.0.0.0/8",
                        "10.0.0.0/8",
                        "100.64.0.0/10",
                        "127.0.0.0/8",
                        "169.254.0.0/16",
                        "172.16.0.0/12",
                        "192.0.0.0/24",
                        "192.168.0.0/16",
                        "224.0.0.0/3"
                    ],
                    outboundTag: $direct_tag
                }
            ]
        }'
}

# Add a routing rule for specific domains -> outbound
xray_add_domain_routing_rule() {
    local config="$1"
    local domains_json="$2"
    local outbound_tag="$3"

    echo "$config" | jq \
        --argjson domains "$domains_json" \
        --arg tag "$outbound_tag" \
        '.routing.rules += [{
            type: "field",
            domain: $domains,
            outboundTag: $tag
        }]'
}

# Add a routing rule for specific IPs -> outbound
xray_add_ip_routing_rule() {
    local config="$1"
    local ips_json="$2"
    local outbound_tag="$3"

    echo "$config" | jq \
        --argjson ips "$ips_json" \
        --arg tag "$outbound_tag" \
        '.routing.rules += [{
            type: "field",
            ip: $ips,
            outboundTag: $tag
        }]'
}

# Add geosite routing rule
xray_add_geosite_routing_rule() {
    local config="$1"
    local geosite_tag="$2"
    local outbound_tag="$3"

    echo "$config" | jq \
        --arg geo "geosite:$geosite_tag" \
        --arg tag "$outbound_tag" \
        '.routing.rules += [{
            type: "field",
            domain: [$geo],
            outboundTag: $tag
        }]'
}

# Add catch-all routing rule (must be last)
xray_add_catchall_routing_rule() {
    local config="$1"
    local outbound_tag="$2"

    echo "$config" | jq \
        --arg tag "$outbound_tag" \
        '.routing.rules += [{
            type: "field",
            network: "tcp,udp",
            outboundTag: $tag
        }]'
}

# Parse proxy URL and add appropriate outbound
xray_add_proxy_outbound_from_url() {
    local config="$1"
    local tag="$2"
    local url="$3"

    local scheme
    scheme="$(url_get_scheme "$url")"

    case "$scheme" in
    vless)
        config=$(xray_add_vless_outbound "$config" "$tag" "$url")
        ;;
    socks4|socks4a|socks5|socks)
        config=$(xray_add_socks_outbound "$config" "$tag" "$url")
        ;;
    *)
        log "Unsupported protocol: $scheme. Supported: vless, socks" "error"
        exit 1
        ;;
    esac

    echo "$config"
}
