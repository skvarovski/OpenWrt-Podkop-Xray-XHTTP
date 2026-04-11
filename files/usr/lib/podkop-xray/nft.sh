# Create an nftables table in the inet family
nft_create_table() {
    local name="$1"
    nft add table inet "$name"
}

# Create a set within a table for storing IPv4 addresses
nft_create_ipv4_set() {
    local table="$1"
    local name="$2"
    nft add set inet "$table" "$name" '{ type ipv4_addr; flags interval; auto-merge; }'
}

nft_create_ifname_set() {
    local table="$1"
    local name="$2"
    nft add set inet "$table" "$name" '{ type ifname; flags interval; }'
}

# Add one or more elements to a set
nft_add_set_elements() {
    local table="$1"
    local set="$2"
    local elements="$3"
    nft add element inet "$table" "$set" "{ $elements }"
}

nft_add_set_elements_from_file_chunked() {
    local filepath="$1"
    local nft_table_name="$2"
    local nft_set_name="$3"
    local chunk_size="${4:-5000}"

    local array count
    count=0
    while IFS= read -r line; do
        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        [ -z "$line" ] && continue

        if ! is_ipv4 "$line" && ! is_ipv4_cidr "$line"; then
            log "'$line' is not IPv4 or IPv4 CIDR" "debug"
            continue
        fi

        if [ -z "$array" ]; then
            array="$line"
        else
            array="$array,$line"
        fi

        count=$((count + 1))

        if [ "$count" = "$chunk_size" ]; then
            log "Adding $count elements to nft set $nft_set_name" "debug"
            nft_add_set_elements "$nft_table_name" "$nft_set_name" "$array"
            array=""
            count=0
        fi
    done < "$filepath"

    if [ -n "$array" ]; then
        log "Adding $count elements to nft set $nft_set_name" "debug"
        nft_add_set_elements "$nft_table_name" "$nft_set_name" "$array"
    fi
}

# Initialize interfaces set from UCI config
nft_init_interfaces_set() {
    nft_create_ifname_set "$NFT_TABLE_NAME" "$NFT_INTERFACE_SET_NAME"

    local source_network_interfaces
    config_get source_network_interfaces "settings" "source_network_interfaces" "br-lan"

    for interface in $source_network_interfaces; do
        nft add element inet "$NFT_TABLE_NAME" "$NFT_INTERFACE_SET_NAME" "{ $interface }"
    done
}

# Create all nftables rules for tproxy interception
create_nft_rules() {
    log "Create nft table"
    nft_create_table "$NFT_TABLE_NAME"

    log "Create localv4 set"
    nft_create_ipv4_set "$NFT_TABLE_NAME" "$NFT_LOCALV4_SET_NAME"
    nft add element inet "$NFT_TABLE_NAME" "$NFT_LOCALV4_SET_NAME" '{
        0.0.0.0/8,
        10.0.0.0/8,
        127.0.0.0/8,
        169.254.0.0/16,
        172.16.0.0/12,
        192.0.0.0/24,
        192.0.2.0/24,
        192.88.99.0/24,
        192.168.0.0/16,
        198.51.100.0/24,
        203.0.113.0/24,
        224.0.0.0/4,
        240.0.0.0-255.255.255.255
    }'

    log "Create common subnets set"
    nft_create_ipv4_set "$NFT_TABLE_NAME" "$NFT_COMMON_SET_NAME"

    log "Create interface set"
    nft_init_interfaces_set

    log "Create nft chains and rules"
    # Prerouting mangle: mark traffic destined for proxied IPs/FakeIP
    nft add chain inet "$NFT_TABLE_NAME" mangle '{ type filter hook prerouting priority -150; policy accept; }'
    # Output mangle: mark traffic from the router itself
    nft add chain inet "$NFT_TABLE_NAME" mangle_output '{ type route hook output priority -150; policy accept; }'
    # Prerouting proxy: tproxy marked traffic to Xray
    nft add chain inet "$NFT_TABLE_NAME" proxy '{ type filter hook prerouting priority -100; policy accept; }'

    # Mark LAN traffic to proxied subnets
    nft add rule inet "$NFT_TABLE_NAME" mangle iifname "@$NFT_INTERFACE_SET_NAME" ip daddr "@$NFT_COMMON_SET_NAME" meta l4proto tcp meta mark set "$NFT_FAKEIP_MARK" counter
    nft add rule inet "$NFT_TABLE_NAME" mangle iifname "@$NFT_INTERFACE_SET_NAME" ip daddr "@$NFT_COMMON_SET_NAME" meta l4proto udp meta mark set "$NFT_FAKEIP_MARK" counter
    # Mark LAN traffic to FakeIP range
    nft add rule inet "$NFT_TABLE_NAME" mangle iifname "@$NFT_INTERFACE_SET_NAME" ip daddr "$XRAY_FAKEDNS_POOL" meta l4proto tcp meta mark set "$NFT_FAKEIP_MARK" counter
    nft add rule inet "$NFT_TABLE_NAME" mangle iifname "@$NFT_INTERFACE_SET_NAME" ip daddr "$XRAY_FAKEDNS_POOL" meta l4proto udp meta mark set "$NFT_FAKEIP_MARK" counter

    # Tproxy marked traffic to Xray dokodemo-door
    nft add rule inet "$NFT_TABLE_NAME" proxy meta mark \& "$NFT_FAKEIP_MARK" == "$NFT_FAKEIP_MARK" meta l4proto tcp tproxy ip to "$XRAY_TPROXY_INBOUND_ADDRESS:$XRAY_TPROXY_INBOUND_PORT" counter
    nft add rule inet "$NFT_TABLE_NAME" proxy meta mark \& "$NFT_FAKEIP_MARK" == "$NFT_FAKEIP_MARK" meta l4proto udp tproxy ip to "$XRAY_TPROXY_INBOUND_ADDRESS:$XRAY_TPROXY_INBOUND_PORT" counter

    # Output chain: mark router's own traffic (only when explicitly enabled)
    local enable_output
    config_get_bool enable_output "settings" "enable_output_network_interface" 0
    if [ "$enable_output" -eq 1 ]; then
        nft add rule inet "$NFT_TABLE_NAME" mangle_output ip daddr "@$NFT_LOCALV4_SET_NAME" return
        nft add rule inet "$NFT_TABLE_NAME" mangle_output meta mark "$NFT_OUTBOUND_MARK" counter return
        nft add rule inet "$NFT_TABLE_NAME" mangle_output ip daddr "@$NFT_COMMON_SET_NAME" meta l4proto tcp meta mark set "$NFT_FAKEIP_MARK" counter
        nft add rule inet "$NFT_TABLE_NAME" mangle_output ip daddr "@$NFT_COMMON_SET_NAME" meta l4proto udp meta mark set "$NFT_FAKEIP_MARK" counter
        nft add rule inet "$NFT_TABLE_NAME" mangle_output ip daddr "$XRAY_FAKEDNS_POOL" meta l4proto tcp meta mark set "$NFT_FAKEIP_MARK" counter
        nft add rule inet "$NFT_TABLE_NAME" mangle_output ip daddr "$XRAY_FAKEDNS_POOL" meta l4proto udp meta mark set "$NFT_FAKEIP_MARK" counter
    fi

    local exclude_ntp
    config_get_bool exclude_ntp "settings" "exclude_ntp" "0"
    if [ "$exclude_ntp" -eq 1 ]; then
        log "NTP traffic exclude for proxy"
        nft insert rule inet "$NFT_TABLE_NAME" mangle udp dport 123 return
    fi
}

# Clean up nftables rules
destroy_nft_rules() {
    if nft list table inet "$NFT_TABLE_NAME" > /dev/null 2>&1; then
        nft delete table inet "$NFT_TABLE_NAME"
    fi
}

# Set up ip routing table for tproxy
route_table_setup() {
    grep -q "105 $RT_TABLE_NAME" /etc/iproute2/rt_tables || echo "105 $RT_TABLE_NAME" >> /etc/iproute2/rt_tables

    if ! ip route list table "$RT_TABLE_NAME" 2> /dev/null | grep -q "local default dev lo scope host"; then
        log "Added route for tproxy" "debug"
        ip route add local 0.0.0.0/0 dev lo table "$RT_TABLE_NAME"
    else
        log "Route for tproxy exists" "debug"
    fi

    if ! ip rule list | grep -q "from all fwmark $NFT_FAKEIP_MARK/$NFT_FAKEIP_MARK lookup $RT_TABLE_NAME"; then
        log "Create marking rule" "debug"
        ip -4 rule add fwmark "$NFT_FAKEIP_MARK"/"$NFT_FAKEIP_MARK" table "$RT_TABLE_NAME" priority 105
    else
        log "Marking rule exist" "debug"
    fi
}

# Clean up ip routing
route_table_cleanup() {
    if ip rule list | grep -q "$RT_TABLE_NAME"; then
        ip rule del fwmark "$NFT_FAKEIP_MARK"/"$NFT_FAKEIP_MARK" table "$RT_TABLE_NAME" priority 105
    fi

    if ip route list table "$RT_TABLE_NAME" > /dev/null 2>&1; then
        ip route flush table "$RT_TABLE_NAME"
    fi
}

# Configure dnsmasq to forward DNS to Xray
dnsmasq_configure() {
    local shutdown_correctly
    config_get shutdown_correctly "settings" "shutdown_correctly"
    if [ "$shutdown_correctly" -eq 0 ]; then
        log "Previous shutdown was not correct, reconfiguration of dnsmasq is not required"
        return 0
    fi

    log "Backup dnsmasq configuration"
    current_servers="$(uci_get "dhcp" "@dnsmasq[0]" "server")"
    if [ -n "$current_servers" ]; then
        for server in $(uci_get "dhcp" "@dnsmasq[0]" "server"); do
            if ! [ "$server" == "$XRAY_DNS_INBOUND_ADDRESS#$XRAY_DNS_INBOUND_PORT" ]; then
                uci_add_list "dhcp" "@dnsmasq[0]" "podkop_xray_server" "$server"
            fi
        done
        uci_remove "dhcp" "@dnsmasq[0]" "server"
    fi

    local cachesize noresolv
    cachesize="$(uci_get "dhcp" "@dnsmasq[0]" "cachesize")"
    if [ -n "$cachesize" ]; then
        uci_set "dhcp" "@dnsmasq[0]" "podkop_xray_cachesize" "$cachesize"
    fi
    noresolv="$(uci_get "dhcp" "@dnsmasq[0]" "noresolv")"
    if [ -n "$noresolv" ]; then
        uci_set "dhcp" "@dnsmasq[0]" "podkop_xray_noresolv" "$noresolv"
    fi

    log "Configure dnsmasq for Xray DNS"
    uci_add_list "dhcp" "@dnsmasq[0]" "server" "$XRAY_DNS_INBOUND_ADDRESS#$XRAY_DNS_INBOUND_PORT"
    uci_set "dhcp" "@dnsmasq[0]" "noresolv" 1
    uci_set "dhcp" "@dnsmasq[0]" "cachesize" 0
    uci_commit "dhcp"

    /etc/init.d/dnsmasq restart
}

# Restore dnsmasq to original state
dnsmasq_restore() {
    log "Restoring the dnsmasq configuration"
    local shutdown_correctly
    config_get shutdown_correctly "settings" "shutdown_correctly"
    if [ "$shutdown_correctly" -eq 1 ]; then
        log "Previous shutdown was correct, reconfiguration of dnsmasq is not required"
        return 0
    fi

    local cachesize noresolv backup_servers resolvfile

    log "Restoring cachesize" "debug"
    cachesize="$(uci_get "dhcp" "@dnsmasq[0]" "podkop_xray_cachesize")"
    if [ -z "$cachesize" ]; then
        uci_remove "dhcp" "@dnsmasq[0]" "cachesize"
        uci_set "dhcp" "@dnsmasq[0]" "cachesize" 150
    else
        uci_set "dhcp" "@dnsmasq[0]" "cachesize" "$cachesize"
        uci_remove "dhcp" "@dnsmasq[0]" "podkop_xray_cachesize"
    fi

    log "Restoring noresolv" "debug"
    noresolv="$(uci_get "dhcp" "@dnsmasq[0]" "podkop_xray_noresolv")"
    if [ -z "$noresolv" ]; then
        uci_set "dhcp" "@dnsmasq[0]" "noresolv" 0
    else
        uci_set "dhcp" "@dnsmasq[0]" "noresolv" "$noresolv"
        uci_remove "dhcp" "@dnsmasq[0]" "podkop_xray_noresolv"
    fi

    log "Restoring DNS servers" "debug"
    uci_remove "dhcp" "@dnsmasq[0]" "server"
    resolvfile="/tmp/resolv.conf.d/resolv.conf.auto"
    backup_servers="$(uci_get "dhcp" "@dnsmasq[0]" "podkop_xray_server")"
    if [ -n "$backup_servers" ]; then
        for server in $backup_servers; do
            uci_add_list "dhcp" "@dnsmasq[0]" "server" "$server"
        done
        uci_remove "dhcp" "@dnsmasq[0]" "podkop_xray_server"
    elif file_exists "$resolvfile"; then
        log "Backup DNS servers not found, using default resolvfile" "debug"
        uci_set "dhcp" "@dnsmasq[0]" "resolvfile" "$resolvfile"
        if [ -n "$noresolv" ] && [ "$noresolv" -eq 1 ]; then
            uci_set "dhcp" "@dnsmasq[0]" "noresolv" 0
        fi
    else
        log "Backup DNS servers and default resolvfile not found, possible resolving issues" "warn"
    fi

    uci_commit "dhcp"

    /etc/init.d/dnsmasq restart
}

# When router output interception is disabled, point resolv.conf to DHCP-obtained DNS
# so router processes resolve directly (not through FakeIP)
resolv_conf_configure() {
    local enable_output
    config_get_bool enable_output "settings" "enable_output_network_interface" 0
    [ "$enable_output" -eq 1 ] && return

    if [ -f "$RESOLV_CONF" ] && [ ! -f "${RESOLV_CONF}.podkop_xray_bak" ]; then
        cp "$RESOLV_CONF" "${RESOLV_CONF}.podkop_xray_bak"
    fi

    local dhcp_resolv="/tmp/resolv.conf.d/resolv.conf.auto"
    if [ -f "$dhcp_resolv" ]; then
        cp "$dhcp_resolv" "$RESOLV_CONF"
        log "Set resolv.conf to DHCP-obtained DNS from $dhcp_resolv (router direct mode)"
    else
        local bootstrap_dns
        config_get bootstrap_dns "settings" "bootstrap_dns_server" "8.8.8.8"
        printf 'nameserver %s\n' "$bootstrap_dns" > "$RESOLV_CONF"
        log "DHCP resolv not found, set resolv.conf to bootstrap DNS $bootstrap_dns (router direct mode)"
    fi
}

resolv_conf_restore() {
    if [ -f "${RESOLV_CONF}.podkop_xray_bak" ]; then
        mv "${RESOLV_CONF}.podkop_xray_bak" "$RESOLV_CONF"
        log "Restored resolv.conf"
    fi
}
