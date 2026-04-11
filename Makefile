include $(TOPDIR)/rules.mk

PKG_NAME:=podkop-xray

PKG_VERSION := $(if $(PODKOP_XRAY_VERSION),$(PODKOP_XRAY_VERSION),0.26.3.27)

PKG_RELEASE := $(if $(PODKOP_XRAY_BUILD),$(PODKOP_XRAY_BUILD),0)

PKG_MAINTAINER:=podkop-xray
PKG_LICENSE:=GPL-2.0-or-later

include $(INCLUDE_DIR)/package.mk

define Package/podkop-xray
	SECTION:=net
	CATEGORY:=Network
	DEPENDS:=+curl +jq +kmod-nft-tproxy +coreutils-base64 +bind-dig
	CONFLICTS:=https-dns-proxy podkop
	TITLE:=Domain routing via Xray with XHTTP transport
	PKGARCH:=all
endef

define Package/podkop-xray/description
	Selective domain routing for OpenWrt using Xray-core with XHTTP transport.
	Supports VLESS, Shadowsocks, Trojan with XHTTP, REALITY, xmux.
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/podkop-xray/prerm
#!/bin/sh

grep -q "105 podkop_xray" /etc/iproute2/rt_tables && sed -i "/105 podkop_xray/d" /etc/iproute2/rt_tables

/etc/init.d/podkop-xray stop

exit 0
endef

define Package/podkop-xray/conffiles
/etc/config/podkop-xray
endef

define Package/podkop-xray/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/podkop-xray $(1)/etc/init.d/podkop-xray

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/podkop-xray $(1)/etc/config/podkop-xray

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/podkop-xray $(1)/usr/bin/podkop-xray

	$(INSTALL_DIR) $(1)/usr/lib/podkop-xray
	$(CP) ./files/usr/lib/podkop-xray/* $(1)/usr/lib/podkop-xray/

	sed -i -e 's/__COMPILED_VERSION_VARIABLE__/$(PKG_VERSION)-$(PKG_RELEASE)/g' $(1)/usr/lib/podkop-xray/constants.sh
endef

$(eval $(call BuildPackage,podkop-xray))
