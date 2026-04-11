# Check if string is valid IPv4
is_ipv4() {
    local ip="$1"
    local regex="^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\.?\b){4}$"
    echo "$ip" | grep -qE "$regex"
}

# Check if string is valid IPv4 with CIDR mask
is_ipv4_cidr() {
    local ip="$1"
    local regex="^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\.?\b){4}(\/(3[0-2]|2[0-9]|1[0-9]|[0-9]))$"
    echo "$ip" | grep -qE "$regex"
}

is_ipv4_ip_or_ipv4_cidr() {
    is_ipv4 "$1" || is_ipv4_cidr "$1"
}

is_domain() {
    local str="$1"
    local regex='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$'

    echo "$str" | grep -qE "$regex"
}

is_domain_suffix() {
    local str="$1"
    local normalized="${str#.}"

    is_domain "$normalized"
}

is_base64() {
    local str="$1"

    if echo "$str" | base64 -d > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

is_min_package_version() {
    local current="$1"
    local required="$2"

    local lowest
    lowest="$(printf '%s\n' "$current" "$required" | sort -V | head -n1)"

    [ "$lowest" = "$required" ]
}

file_exists() {
    local filepath="$1"
    [ -f "$filepath" ]
}

service_exists() {
    local service="$1"
    [ -x "/etc/init.d/$service" ]
}

get_outbound_tag_by_section() {
    local section="$1"
    echo "$section-out"
}

comma_string_to_json_array() {
    local input="$1"

    if [ -z "$input" ]; then
        echo "[]"
        return
    fi

    local replaced
    replaced=$(echo "$input" | sed 's/,/","/g')
    echo "[\"$replaced\"]"
}

url_decode() {
    local encoded="$1"
    printf '%b' "$(echo "$encoded" | sed 's/+/ /g; s/%/\\x/g')"
}

url_get_scheme() {
    local url="$1"
    echo "${url%%://*}"
}

url_get_userinfo() {
    local url="$1"
    echo "$url" | sed -n -e 's#^[^:/?]*://##' -e '/@/!d' -e 's/@.*//p'
}

url_get_host() {
    local url="$1"

    url="${url#*://}"
    url="${url#*@}"
    url="${url%%[/?#]*}"

    echo "${url%%:*}"
}

url_get_port() {
    local url="$1"

    url="${url#*://}"
    url="${url#*@}"
    url="${url%%[/?#]*}"

    case "$url" in
    *:*) echo "${url#*:}" ;;
    *) echo "" ;;
    esac
}

url_get_path() {
    local url="$1"
    echo "$url" | sed -n -e 's#^[^:/?]*://##' -e 's#^[^/]*##' -e 's#\([^?]*\).*#\1#p'
}

url_get_query_param() {
    local url="$1"
    local param="$2"

    local raw
    raw=$(echo "$url" | sed -n "s/.*[?&]$param=\([^&?#]*\).*/\1/p")

    [ -z "$raw" ] && echo "" && return

    echo "$raw"
}

url_strip_fragment() {
    local url="$1"
    echo "${url%%#*}"
}

# Get the LAN IP address for service listening (mixed proxy, etc.)
get_service_listen_address() {
    local service_listen_address

    config_get service_listen_address "settings" "service_listen_address"
    if [ -n "$service_listen_address" ]; then
        echo "$service_listen_address"
        return 0
    fi

    local interface="lan"
    network_get_ipaddr service_listen_address "$interface"

    if [ -z "$service_listen_address" ]; then
        log "Failed to determine the listening IP address" "error"
        echo "127.0.0.1"
        return 1
    fi

    echo "$service_listen_address"
}

gen_id() {
    printf '%s%s' "$(date +%s)" "$RANDOM" | md5sum | cut -c1-16
}

download_to_file() {
    local url="$1"
    local filepath="$2"
    local http_proxy_address="$3"
    local retries="${4:-3}"
    local wait="${5:-2}"

    for attempt in $(seq 1 "$retries"); do
        if [ -n "$http_proxy_address" ]; then
            http_proxy="http://$http_proxy_address" https_proxy="http://$http_proxy_address" wget -O "$filepath" "$url" && break
        else
            wget -O "$filepath" "$url" && break
        fi

        log "Attempt $attempt/$retries to download $url failed" "warn"
        sleep "$wait"
    done
}

convert_crlf_to_lf() {
    local filepath="$1"

    if grep -q $'\r' "$filepath"; then
        log "File '$filepath' contains CRLF line endings. Converting to LF..." "debug"
        local tmpfile
        tmpfile=$(mktemp)
        tr -d '\r' < "$filepath" > "$tmpfile" && mv "$tmpfile" "$filepath" || rm -f "$tmpfile"
    fi
}

parse_domain_or_subnet_string_to_commas_string() {
    local string="$1"
    local type="$2"

    tmpfile=$(mktemp)
    printf "%s\n" "$string" | sed 's/\/\/.*//' | tr ', ' '\n' | grep -v '^$' > "$tmpfile"

    result="$(parse_domain_or_subnet_file_to_comma_string "$tmpfile" "$type")"
    rm -f "$tmpfile"

    echo "$result"
}

parse_domain_or_subnet_file_to_comma_string() {
    local filepath="$1"
    local type="$2"

    local result
    while IFS= read -r line; do
        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        [ -z "$line" ] && continue

        case "$type" in
        domains)
            if ! is_domain_suffix "$line"; then
                log "'$line' is not a valid domain" "debug"
                continue
            fi
            ;;
        subnets)
            if ! is_ipv4 "$line" && ! is_ipv4_cidr "$line"; then
                log "'$line' is not IPv4 or IPv4 CIDR" "debug"
                continue
            fi
            ;;
        *)
            log "Unknown type: $type" "error"
            return 1
            ;;
        esac

        if [ -z "$result" ]; then
            result="$line"
        else
            result="$result,$line"
        fi
    done < "$filepath"

    echo "$result"
}
