https://firmware-selector.openwrt.org/?version=25.12.2&target=mediatek%2Ffilogic&id=xiaomi_mi-router-ax3000t





packages:
apk-mbedtls base-files ca-bundle dropbear firewall4 fitblk fstools kmod-crypto-hw-safexcel kmod-gpio-button-hotplug kmod-leds-gpio kmod-nft-offload libc libgcc libustream-mbedtls logd mtd netifd nftables odhcp6c odhcpd-ipv6only ppp ppp-mod-pppoe procd-ujail uboot-envtools uci uclient-fetch urandom-seed urngd kmod-mt7915e kmod-mt7981-firmware mt7981-wo-firmware luci luci-app-attendedsysupgrade -wpad-basic-mbedtls wpad-mbedtls -dnsmasq dnsmasq-full kmod-nft-tproxy iperf3 curl luci-app-upnp luci-i18n-upnp-ru 6to4 6in4 luci-i18n-base-ru luci-i18n-firewall-ru luci-i18n-package-manager-ru jq coreutils-base64 bind-dig zram-swap unzip




script:
# Включить Wi-Fi
uci delete wireless.default_radio0.disabled 2>/dev/null
uci delete wireless.default_radio1.disabled 2>/dev/null

# SSID и пароль (ЗАМЕНИ НА СВОИ!)
uci set wireless.default_radio0.ssid='OpenWRT'
uci set wireless.default_radio0.encryption='psk2'
uci set wireless.default_radio0.key='12345678'
uci set wireless.default_radio1.ssid='OpenWRT'
uci set wireless.default_radio1.encryption='psk2'
uci set wireless.default_radio1.key='12345678'
uci commit wireless

# Русский язык в LuCI
uci set luci.main.lang='ru'
uci commit luci

# Hostname
uci set system.@system[0].hostname='ax3000t'
uci set attendedsysupgrade.client.login_check_for_upgrades='0'
uci commit system

# Пароль root
#echo -e '123123123\n123123123' | passwd root

# LAN IP адрес
uci set network.lan.ipaddr='192.168.7.5'
uci set network.lan.netmask='255.255.255.0'

# Публичный DNS — чтобы apk/install.sh могли скачивать пакеты с
# downloads.openwrt.org. DNS, выдаваемый аплинком, может отдавать
# недоступные Fastly-адреса (TCP/443 в таймаут) и ломать apk.
uci -q delete network.lan.dns
uci add_list network.lan.dns='8.8.8.8'
uci add_list network.lan.dns='1.1.1.1'
uci set network.lan.peerdns='0'

uci commit network
/etc/init.d/network restart

echo "All done!"
