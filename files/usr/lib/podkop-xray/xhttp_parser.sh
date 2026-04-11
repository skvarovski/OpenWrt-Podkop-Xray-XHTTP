# Parse XHTTP transport parameters from a proxy URL and output JSON streamSettings
# Usage: parse_xhttp_stream_settings <url>
# Returns JSON object for streamSettings.xhttpSettings

parse_xhttp_settings() {
    local url="$1"

    local path mode extra_headers
    path=$(url_get_query_param "$url" "path")
    mode=$(url_get_query_param "$url" "mode")
    [ -z "$path" ] && path="/"
    [ -z "$mode" ] && mode="auto"

    local xhttp_json
    xhttp_json=$(jq -n \
        --arg path "$path" \
        --arg mode "$mode" \
        '{
            path: $path,
            mode: $mode
        }')

    # Parse host header if present
    local host
    host=$(url_get_query_param "$url" "host")
    if [ -n "$host" ]; then
        xhttp_json=$(echo "$xhttp_json" | jq --arg host "$host" \
            '. + { extra: { headers: { Host: $host } } }')
    fi

    # Parse xmux settings
    local xmux_max_concurrency xmux_max_connections xmux_h_max_request_times xmux_h_keep_alive_period
    xmux_max_concurrency=$(url_get_query_param "$url" "xmux_maxConcurrency")
    xmux_max_connections=$(url_get_query_param "$url" "xmux_maxConnections")
    xmux_h_max_request_times=$(url_get_query_param "$url" "xmux_hMaxRequestTimes")
    xmux_h_keep_alive_period=$(url_get_query_param "$url" "xmux_hKeepAlivePeriod")

    if [ -n "$xmux_max_concurrency" ] || [ -n "$xmux_max_connections" ] || \
       [ -n "$xmux_h_max_request_times" ] || [ -n "$xmux_h_keep_alive_period" ]; then

        local xmux_json
        xmux_json=$(jq -n '{}')

        if [ -n "$xmux_max_concurrency" ]; then
            xmux_json=$(echo "$xmux_json" | _parse_range_or_int "maxConcurrency" "$xmux_max_concurrency")
        fi
        if [ -n "$xmux_max_connections" ]; then
            xmux_json=$(echo "$xmux_json" | _parse_range_or_int "maxConnections" "$xmux_max_connections")
        fi
        if [ -n "$xmux_h_max_request_times" ]; then
            xmux_json=$(echo "$xmux_json" | _parse_range_or_int "hMaxRequestTimes" "$xmux_h_max_request_times")
        fi
        if [ -n "$xmux_h_keep_alive_period" ]; then
            xmux_json=$(echo "$xmux_json" | jq --argjson val "$xmux_h_keep_alive_period" \
                '. + { hKeepAlivePeriod: $val }')
        fi

        xhttp_json=$(echo "$xhttp_json" | jq --argjson xmux "$xmux_json" '. + { xmux: $xmux }')
    fi

    # Parse xPadding
    local xpadding_from xpadding_to
    xpadding_from=$(url_get_query_param "$url" "xpadding_from")
    xpadding_to=$(url_get_query_param "$url" "xpadding_to")
    if [ -n "$xpadding_from" ] && [ -n "$xpadding_to" ]; then
        xhttp_json=$(echo "$xhttp_json" | jq \
            --argjson from "$xpadding_from" \
            --argjson to "$xpadding_to" \
            '. + { xPadding: { from: $from, to: $to } }')
    fi

    echo "$xhttp_json"
}

# Parse downloadSettings from URL (separate download path/address)
parse_xhttp_download_settings() {
    local url="$1"

    local dl_address dl_port dl_path
    dl_address=$(url_get_query_param "$url" "downloadAddress")
    dl_port=$(url_get_query_param "$url" "downloadPort")
    dl_path=$(url_get_query_param "$url" "downloadPath")

    if [ -z "$dl_address" ] && [ -z "$dl_path" ]; then
        echo ""
        return
    fi

    local dl_json
    dl_json=$(jq -n '{}')

    if [ -n "$dl_address" ]; then
        dl_json=$(echo "$dl_json" | jq --arg addr "$dl_address" '. + { address: $addr }')
    fi
    if [ -n "$dl_port" ]; then
        dl_json=$(echo "$dl_json" | jq --argjson port "$dl_port" '. + { port: $port }')
    fi
    if [ -n "$dl_path" ]; then
        dl_json=$(echo "$dl_json" | jq --arg path "$dl_path" '. + { path: $path }')
    fi

    echo "$dl_json"
}

# Helper: parse "from-to" range or single int into JSON
_parse_range_or_int() {
    local key="$1"
    local value="$2"

    if echo "$value" | grep -q '-'; then
        local from to
        from="${value%%-*}"
        to="${value##*-}"
        jq --arg key "$key" --argjson from "$from" --argjson to "$to" \
            '. + { ($key): { from: $from, to: $to } }'
    else
        jq --arg key "$key" --argjson val "$value" \
            '. + { ($key): $val }'
    fi
}
