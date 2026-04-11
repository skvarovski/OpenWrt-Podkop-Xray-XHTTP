# Rulesets management for podkop-xray
# Uses geosite/geoip .dat files and plain text domain/subnet lists

# Resolve the latest release tag from a GitHub "releases/latest" URL
# Uses curl redirect to extract the tag
resolve_geofiles_release_tag() {
    local url="https://github.com/skvarovski/russia-v2ray-rules-dat-small/releases/latest"
    local redirect_url
    redirect_url=$(curl -sI -o /dev/null -w "%{redirect_url}" "$url" 2>/dev/null)
    if [ -n "$redirect_url" ]; then
        echo "$redirect_url" | sed 's|.*/tag/||'
    fi
}

# Save geofiles release tag to a file for diagnostics
save_geofiles_release_tag() {
    local xray_data_dir="$1"
    local tag
    tag=$(resolve_geofiles_release_tag)
    if [ -n "$tag" ]; then
        echo "$tag" > "$xray_data_dir/geofiles_release_tag"
        log "Geofiles release tag: $tag"
    fi
}

# Read saved geofiles release tag
get_geofiles_release_tag() {
    local tag_file="$TMP_GEOFILES_FOLDER/geofiles_release_tag"
    if [ -f "$tag_file" ]; then
        cat "$tag_file"
    else
        echo ""
    fi
}

# Download geosite.dat and geoip.dat to Xray data directory
# Graceful fallback: if file already exists and download fails, keep existing
download_geofiles() {
    local xray_data_dir="$1"
    local http_proxy_address="$2"
    local need_tag=0

    mkdir -p "$xray_data_dir"

    if ! file_exists "$xray_data_dir/geosite.dat"; then
        log "Downloading geosite.dat"
        download_to_file "$GEOSITE_URL" "$xray_data_dir/geosite.dat" "$http_proxy_address"
        if ! file_exists "$xray_data_dir/geosite.dat"; then
            log "geosite.dat download failed, no existing file to fallback to" "error"
        else
            need_tag=1
        fi
    fi

    if ! file_exists "$xray_data_dir/geoip.dat"; then
        log "Downloading geoip.dat"
        download_to_file "$GEOIP_URL" "$xray_data_dir/geoip.dat" "$http_proxy_address"
        if ! file_exists "$xray_data_dir/geoip.dat"; then
            log "geoip.dat download failed, no existing file to fallback to" "error"
        else
            need_tag=1
        fi
    fi

    # Download category files (non-critical, fallback to strings/constants)
    if ! file_exists "$xray_data_dir/geosite_categories.txt"; then
        log "Downloading geosite_categories.txt"
        download_to_file "$GEOSITE_CATEGORIES_URL" "$xray_data_dir/geosite_categories.txt" "$http_proxy_address"
        if ! file_exists "$xray_data_dir/geosite_categories.txt"; then
            log "geosite_categories.txt download failed, will use strings fallback" "warn"
        fi
    fi

    if ! file_exists "$xray_data_dir/geoip_categories.txt"; then
        log "Downloading geoip_categories.txt"
        download_to_file "$GEOIP_CATEGORIES_URL" "$xray_data_dir/geoip_categories.txt" "$http_proxy_address"
        if ! file_exists "$xray_data_dir/geoip_categories.txt"; then
            log "geoip_categories.txt download failed, will use constant fallback" "warn"
        fi
    fi

    [ "$need_tag" = "1" ] && save_geofiles_release_tag "$xray_data_dir"
}

# Update geofiles (force re-download with validation)
# Returns 0 if at least one file was updated, 1 if nothing changed
update_geofiles() {
    local xray_data_dir="$1"
    local http_proxy_address="$2"
    local files_updated=0

    mkdir -p "$xray_data_dir"

    # Update geosite.dat
    local tmpfile
    tmpfile="${xray_data_dir}/geosite.dat.tmp"

    log "Downloading geosite.dat update"
    download_to_file "$GEOSITE_URL" "$tmpfile" "$http_proxy_address"

    if file_exists "$tmpfile"; then
        local filesize
        filesize=$(wc -c < "$tmpfile" 2>/dev/null)
        if [ "$filesize" -gt 102400 ]; then
            mv -f "$tmpfile" "$xray_data_dir/geosite.dat"
            log "geosite.dat updated successfully (${filesize} bytes)"
            files_updated=1
        else
            log "geosite.dat download failed: file too small (${filesize} bytes, expected >100KB)" "warn"
            rm -f "$tmpfile"
        fi
    else
        log "geosite.dat download failed: file not created" "warn"
        rm -f "$tmpfile"
    fi

    # Update geoip.dat
    local tmpfile_geoip
    tmpfile_geoip="${xray_data_dir}/geoip.dat.tmp"

    log "Downloading geoip.dat update"
    download_to_file "$GEOIP_URL" "$tmpfile_geoip" "$http_proxy_address"

    if file_exists "$tmpfile_geoip"; then
        local geoip_size
        geoip_size=$(wc -c < "$tmpfile_geoip" 2>/dev/null)
        if [ "$geoip_size" -gt 102400 ]; then
            mv -f "$tmpfile_geoip" "$xray_data_dir/geoip.dat"
            log "geoip.dat updated successfully (${geoip_size} bytes)"
            files_updated=1
        else
            log "geoip.dat download failed: file too small (${geoip_size} bytes)" "warn"
            rm -f "$tmpfile_geoip"
        fi
    else
        log "geoip.dat download failed" "warn"
        rm -f "$tmpfile_geoip"
    fi

    # Update category files (non-critical)
    local tmpcat
    tmpcat="${xray_data_dir}/geosite_categories.txt.tmp"
    download_to_file "$GEOSITE_CATEGORIES_URL" "$tmpcat" "$http_proxy_address"
    if file_exists "$tmpcat" && [ -s "$tmpcat" ]; then
        mv -f "$tmpcat" "$xray_data_dir/geosite_categories.txt"
        log "geosite_categories.txt updated"
    else
        log "geosite_categories.txt download failed, keeping existing" "warn"
        rm -f "$tmpcat"
    fi

    tmpcat="${xray_data_dir}/geoip_categories.txt.tmp"
    download_to_file "$GEOIP_CATEGORIES_URL" "$tmpcat" "$http_proxy_address"
    if file_exists "$tmpcat" && [ -s "$tmpcat" ]; then
        mv -f "$tmpcat" "$xray_data_dir/geoip_categories.txt"
        log "geoip_categories.txt updated"
    else
        log "geoip_categories.txt download failed, keeping existing" "warn"
        rm -f "$tmpcat"
    fi

    # Save release tag for diagnostics
    if [ "$files_updated" = "1" ]; then
        save_geofiles_release_tag "$xray_data_dir"
    fi

    return $((1 - files_updated))
}

# Download and parse a plain text domain list, return JSON array of domains
download_and_parse_domain_list() {
    local url="$1"
    local http_proxy_address="$2"

    local tmpfile
    tmpfile=$(mktemp)

    download_to_file "$url" "$tmpfile" "$http_proxy_address"

    if ! file_exists "$tmpfile" || [ ! -s "$tmpfile" ]; then
        log "Failed to download domain list: $url" "error"
        rm -f "$tmpfile"
        echo "[]"
        return
    fi

    convert_crlf_to_lf "$tmpfile"

    # Parse domains and output JSON array
    local domains
    domains=$(sed 's/^[[:space:]]*//;s/[[:space:]]*$//' "$tmpfile" | grep -v '^$' | grep -v '^#' | jq -R . | jq -s .)

    rm -f "$tmpfile"
    echo "$domains"
}

# Download and parse a plain text subnet list, return JSON array of IPs/CIDRs
download_and_parse_subnet_list() {
    local url="$1"
    local http_proxy_address="$2"

    local tmpfile
    tmpfile=$(mktemp)

    download_to_file "$url" "$tmpfile" "$http_proxy_address"

    if ! file_exists "$tmpfile" || [ ! -s "$tmpfile" ]; then
        log "Failed to download subnet list: $url" "error"
        rm -f "$tmpfile"
        echo "[]"
        return
    fi

    convert_crlf_to_lf "$tmpfile"

    local subnets
    subnets=$(sed 's/^[[:space:]]*//;s/[[:space:]]*$//' "$tmpfile" | grep -v '^$' | grep -v '^#' | jq -R . | jq -s .)

    rm -f "$tmpfile"
    echo "$subnets"
}

# Parse a local plain text file into JSON array
parse_local_list_to_json() {
    local filepath="$1"
    local type="$2"

    if ! file_exists "$filepath"; then
        log "Local list file not found: $filepath" "warn"
        echo "[]"
        return
    fi

    convert_crlf_to_lf "$filepath"

    local items
    items=$(sed 's/^[[:space:]]*//;s/[[:space:]]*$//' "$filepath" | grep -v '^$' | grep -v '^#' | jq -R . | jq -s .)

    echo "$items"
}

# Parse UCI user domains/subnets list to JSON array
parse_uci_list_to_json() {
    local items="$1"

    if [ -z "$items" ]; then
        echo "[]"
        return
    fi

    echo "$items" | tr ' ' '\n' | jq -R . | jq -s .
}

# Add subnets to nftables set from a downloaded list
add_subnets_to_nft_set() {
    local url="$1"
    local http_proxy_address="$2"

    local tmpfile
    tmpfile=$(mktemp)

    download_to_file "$url" "$tmpfile" "$http_proxy_address"

    if file_exists "$tmpfile" && [ -s "$tmpfile" ]; then
        convert_crlf_to_lf "$tmpfile"
        nft_add_set_elements_from_file_chunked "$tmpfile" "$NFT_TABLE_NAME" "$NFT_COMMON_SET_NAME"
    fi

    rm -f "$tmpfile"
}

# Build geosite domains JSON array from a UCI list
# Usage: _build_geosite_json "category1 category2 ..."
_build_geosite_json() {
    local categories="$1"
    local domains_json="["
    local first=1
    for category in $categories; do
        local tag
        tag=$(echo "$category" | tr 'A-Z' 'a-z')
        if [ "$first" = "1" ]; then
            domains_json="${domains_json}\"geosite:${tag}\""
            first=0
        else
            domains_json="${domains_json},\"geosite:${tag}\""
        fi
        log "Added geosite category: $tag"
    done
    domains_json="${domains_json}]"
    echo "$domains_json"
}

# Build geoip IPs JSON array from a UCI list
# Usage: _build_geoip_json "category1 category2 ..."
_build_geoip_json() {
    local categories="$1"
    local ips_json="["
    local first=1
    for category in $categories; do
        local tag
        tag=$(echo "$category" | tr 'A-Z' 'a-z')
        if [ "$first" = "1" ]; then
            ips_json="${ips_json}\"geoip:${tag}\""
            first=0
        else
            ips_json="${ips_json},\"geoip:${tag}\""
        fi
        log "Added geoip category: $tag"
    done
    ips_json="${ips_json}]"
    echo "$ips_json"
}

# Process geoip proxy categories — route through proxy outbound
process_geoip_proxy() {
    local config="$1"
    local section="$2"
    local outbound_tag="$3"

    local categories
    config_get categories "$section" "geoip_proxy"

    if [ -z "$categories" ]; then
        echo "$config"
        return
    fi

    local ips_json
    ips_json=$(_build_geoip_json "$categories")
    config=$(xray_add_ip_routing_rule "$config" "$ips_json" "$outbound_tag")

    echo "$config"
}

# Process geoip direct categories — route directly (bypass proxy)
process_geoip_direct() {
    local config="$1"
    local section="$2"

    local categories
    config_get categories "$section" "geoip_direct"

    if [ -z "$categories" ]; then
        echo "$config"
        return
    fi

    local ips_json
    ips_json=$(_build_geoip_json "$categories")
    config=$(xray_add_ip_routing_rule "$config" "$ips_json" "$XRAY_DIRECT_OUTBOUND_TAG")

    echo "$config"
}

# Process geoip block categories — drop traffic (blackhole)
process_geoip_block() {
    local config="$1"
    local section="$2"

    local categories
    config_get categories "$section" "geoip_block"

    if [ -z "$categories" ]; then
        echo "$config"
        return
    fi

    local ips_json
    ips_json=$(_build_geoip_json "$categories")
    config=$(xray_add_ip_routing_rule "$config" "$ips_json" "$XRAY_BLOCK_OUTBOUND_TAG")

    echo "$config"
}

# Process geosite proxy categories — route through proxy outbound
process_geosite_proxy() {
    local config="$1"
    local section="$2"
    local outbound_tag="$3"

    local categories
    config_get categories "$section" "geosite_proxy"

    if [ -z "$categories" ]; then
        echo "$config"
        return
    fi

    local domains_json
    domains_json=$(_build_geosite_json "$categories")
    config=$(xray_add_domain_routing_rule "$config" "$domains_json" "$outbound_tag")

    echo "$config"
}

# Process geosite direct categories — route directly (bypass proxy)
process_geosite_direct() {
    local config="$1"
    local section="$2"

    local categories
    config_get categories "$section" "geosite_direct"

    if [ -z "$categories" ]; then
        echo "$config"
        return
    fi

    local domains_json
    domains_json=$(_build_geosite_json "$categories")
    config=$(xray_add_domain_routing_rule "$config" "$domains_json" "$XRAY_DIRECT_OUTBOUND_TAG")

    echo "$config"
}

# Process geosite block categories — drop traffic (blackhole)
process_geosite_block() {
    local config="$1"
    local section="$2"

    local categories
    config_get categories "$section" "geosite_block"

    if [ -z "$categories" ]; then
        echo "$config"
        return
    fi

    local domains_json
    domains_json=$(_build_geosite_json "$categories")
    config=$(xray_add_domain_routing_rule "$config" "$domains_json" "$XRAY_BLOCK_OUTBOUND_TAG")

    echo "$config"
}


# Process remote domain lists for a section
process_remote_domain_lists() {
    local config="$1"
    local section="$2"
    local outbound_tag="$3"
    local http_proxy_address="$4"

    local remote_domain_lists
    config_get remote_domain_lists "$section" "remote_domain_lists"

    if [ -z "$remote_domain_lists" ]; then
        echo "$config"
        return
    fi

    for url in $remote_domain_lists; do
        log "Downloading remote domain list: $url"
        local domains
        domains=$(download_and_parse_domain_list "$url" "$http_proxy_address")
        local domain_count
        domain_count=$(echo "$domains" | jq 'length')
        if [ "$domain_count" -gt 0 ]; then
            config=$(xray_add_domain_routing_rule "$config" "$domains" "$outbound_tag")
            log "Added $domain_count remote domains"
        fi
    done

    echo "$config"
}

# Process remote subnet lists for a section
process_remote_subnet_lists() {
    local section="$1"
    local http_proxy_address="$2"

    local remote_subnet_lists
    config_get remote_subnet_lists "$section" "remote_subnet_lists"

    if [ -z "$remote_subnet_lists" ]; then
        return
    fi

    for url in $remote_subnet_lists; do
        log "Downloading remote subnet list: $url"
        add_subnets_to_nft_set "$url" "$http_proxy_address"
    done
}

# Process local domain lists for a section
process_local_domain_lists() {
    local config="$1"
    local section="$2"
    local outbound_tag="$3"

    local local_domain_lists
    config_get local_domain_lists "$section" "local_domain_lists"

    if [ -z "$local_domain_lists" ]; then
        echo "$config"
        return
    fi

    for filepath in $local_domain_lists; do
        log "Loading local domain list: $filepath"
        local domains
        domains=$(parse_local_list_to_json "$filepath" "domains")
        local domain_count
        domain_count=$(echo "$domains" | jq 'length')
        if [ "$domain_count" -gt 0 ]; then
            config=$(xray_add_domain_routing_rule "$config" "$domains" "$outbound_tag")
            log "Added $domain_count local domains from $filepath"
        fi
    done

    echo "$config"
}

# Process local subnet lists for a section
process_local_subnet_lists() {
    local section="$1"

    local local_subnet_lists
    config_get local_subnet_lists "$section" "local_subnet_lists"

    if [ -z "$local_subnet_lists" ]; then
        return
    fi

    for filepath in $local_subnet_lists; do
        if file_exists "$filepath"; then
            log "Loading local subnet list: $filepath"
            convert_crlf_to_lf "$filepath"
            nft_add_set_elements_from_file_chunked "$filepath" "$NFT_TABLE_NAME" "$NFT_COMMON_SET_NAME"
        fi
    done
}

# Process user-defined domains from UCI
process_user_domains() {
    local config="$1"
    local section="$2"
    local outbound_tag="$3"

    local user_domain_list_type
    config_get user_domain_list_type "$section" "user_domain_list_type" "dynamic"

    case "$user_domain_list_type" in
    disabled)
        echo "$config"
        return
        ;;
    text)
        local user_domains_text
        config_get user_domains_text "$section" "user_domains_text"
        if [ -n "$user_domains_text" ]; then
            local domains_csv
            domains_csv=$(parse_domain_or_subnet_string_to_commas_string "$user_domains_text" "domains")
            if [ -n "$domains_csv" ]; then
                local domains_json
                domains_json=$(echo "$domains_csv" | tr ',' '\n' | jq -R . | jq -s .)
                local domain_count
                domain_count=$(echo "$domains_json" | jq 'length')
                if [ "$domain_count" -gt 0 ]; then
                    config=$(xray_add_domain_routing_rule "$config" "$domains_json" "$outbound_tag")
                    log "Added $domain_count user domains (text)"
                fi
            fi
        fi
        ;;
    *)
        # dynamic (default) — UCI list
        local user_domains
        config_get user_domains "$section" "user_domains"
        if [ -n "$user_domains" ]; then
            local domains_json
            domains_json=$(parse_uci_list_to_json "$user_domains")
            local domain_count
            domain_count=$(echo "$domains_json" | jq 'length')
            if [ "$domain_count" -gt 0 ]; then
                config=$(xray_add_domain_routing_rule "$config" "$domains_json" "$outbound_tag")
                log "Added $domain_count user domains"
            fi
        fi
        ;;
    esac

    echo "$config"
}

# Process user-defined subnets from UCI (add to nft set)
process_user_subnets() {
    local section="$1"

    local user_subnet_list_type
    config_get user_subnet_list_type "$section" "user_subnet_list_type" "dynamic"

    case "$user_subnet_list_type" in
    disabled)
        return
        ;;
    text)
        local user_subnets_text
        config_get user_subnets_text "$section" "user_subnets_text"
        if [ -n "$user_subnets_text" ]; then
            local subnets_csv
            subnets_csv=$(parse_domain_or_subnet_string_to_commas_string "$user_subnets_text" "subnets")
            if [ -n "$subnets_csv" ]; then
                local tmpfile
                tmpfile=$(mktemp)
                echo "$subnets_csv" | tr ',' '\n' > "$tmpfile"
                nft_add_set_elements_from_file_chunked "$tmpfile" "$NFT_TABLE_NAME" "$NFT_COMMON_SET_NAME"
                rm -f "$tmpfile"
                log "Added user subnets (text)"
            fi
        fi
        ;;
    *)
        # dynamic (default) — UCI list
        local user_subnets
        config_get user_subnets "$section" "user_subnets"
        if [ -n "$user_subnets" ]; then
            local tmpfile
            tmpfile=$(mktemp)
            echo "$user_subnets" | tr ' ' '\n' > "$tmpfile"
            nft_add_set_elements_from_file_chunked "$tmpfile" "$NFT_TABLE_NAME" "$NFT_COMMON_SET_NAME"
            rm -f "$tmpfile"
        fi
        ;;
    esac
}
