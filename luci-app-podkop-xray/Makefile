include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-podkop-xray

PKG_VERSION := $(if $(PODKOP_XRAY_VERSION),$(PODKOP_XRAY_VERSION),0.26.3.27)

PKG_RELEASE := $(if $(PODKOP_XRAY_BUILD),$(PODKOP_XRAY_BUILD),0)

LUCI_TITLE:=LuCI podkop-xray app
LUCI_DEPENDS:=+luci-base +podkop-xray
LUCI_PKGARCH:=all

PKG_LICENSE:=GPL-2.0-or-later

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)$(HTDOCS)
	$(CP) $(PKG_BUILD_DIR)/htdocs/* $(1)$(HTDOCS)/
	$(INSTALL_DIR) $(1)/
	$(CP) $(PKG_BUILD_DIR)/root/* $(1)/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
