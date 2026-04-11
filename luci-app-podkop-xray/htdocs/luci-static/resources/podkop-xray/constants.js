"use strict";
"require baseclass";

var STATUS_COLORS = {
  SUCCESS: "#4caf50",
  ERROR: "#f44336",
  WARNING: "#ff9800"
};

var PODKOP_XRAY_LUCI_APP_VERSION = "__COMPILED_VERSION_VARIABLE__";
var FAKEIP_CHECK_DOMAIN = "fakeip.podkop.fyi";
var IP_CHECK_DOMAIN = "ip.podkop.fyi";

var UPDATE_INTERVAL_OPTIONS = {
  "1h": "Every hour",
  "3h": "Every 3 hours",
  "12h": "Every 12 hours",
  "1d": "Every day",
  "3d": "Every 3 days"
};

var DNS_SERVER_OPTIONS = {
  "1.1.1.1": "1.1.1.1 (Cloudflare)",
  "8.8.8.8": "8.8.8.8 (Google)",
  "9.9.9.9": "9.9.9.9 (Quad9)",
  "dns.adguard-dns.com": "dns.adguard-dns.com (AdGuard Default)",
  "unfiltered.adguard-dns.com": "unfiltered.adguard-dns.com (AdGuard Unfiltered)",
  "family.adguard-dns.com": "family.adguard-dns.com (AdGuard Family)"
};

var BOOTSTRAP_DNS_SERVER_OPTIONS = {
  "77.88.8.8": "77.88.8.8 (Yandex DNS)",
  "77.88.8.1": "77.88.8.1 (Yandex DNS)",
  "1.1.1.1": "1.1.1.1 (Cloudflare DNS)",
  "1.0.0.1": "1.0.0.1 (Cloudflare DNS)",
  "8.8.8.8": "8.8.8.8 (Google DNS)",
  "8.8.4.4": "8.8.4.4 (Google DNS)",
  "9.9.9.9": "9.9.9.9 (Quad9 DNS)",
  "9.9.9.11": "9.9.9.11 (Quad9 DNS)"
};

var DIAGNOSTICS_UPDATE_INTERVAL = 10000;
var CACHE_TIMEOUT = DIAGNOSTICS_UPDATE_INTERVAL - 1000;
var ERROR_POLL_INTERVAL = 10000;
var COMMAND_TIMEOUT = 10000;
var FETCH_TIMEOUT = 10000;
var BUTTON_FEEDBACK_TIMEOUT = 1000;
var DIAGNOSTICS_INITIAL_DELAY = 100;

var COMMAND_SCHEDULING = {
  P0_PRIORITY: 0,
  P1_PRIORITY: 100,
  P2_PRIORITY: 300,
  P3_PRIORITY: 500,
  P4_PRIORITY: 700,
  P5_PRIORITY: 900,
  P6_PRIORITY: 1100,
  P7_PRIORITY: 1300,
  P8_PRIORITY: 1500,
  P9_PRIORITY: 1700,
  P10_PRIORITY: 1900
};

var DIAGNOSTICS_CHECKS_MAP = {
  DNS: { order: 1, title: "DNS " + _("checks"), code: "DNS" },
  XRAY: { order: 2, title: "Xray " + _("checks"), code: "XRAY" },
  NFT: { order: 3, title: "Nftables " + _("checks"), code: "NFT" },
  PROXY: { order: 4, title: "Proxy " + _("checks"), code: "PROXY" },
  FAKEIP: { order: 5, title: "FakeIP " + _("checks"), code: "FAKEIP" }
};

return baseclass.extend({
  STATUS_COLORS: STATUS_COLORS,
  PODKOP_XRAY_LUCI_APP_VERSION: PODKOP_XRAY_LUCI_APP_VERSION,
  FAKEIP_CHECK_DOMAIN: FAKEIP_CHECK_DOMAIN,
  IP_CHECK_DOMAIN: IP_CHECK_DOMAIN,
  UPDATE_INTERVAL_OPTIONS: UPDATE_INTERVAL_OPTIONS,
  DNS_SERVER_OPTIONS: DNS_SERVER_OPTIONS,
  BOOTSTRAP_DNS_SERVER_OPTIONS: BOOTSTRAP_DNS_SERVER_OPTIONS,
  DIAGNOSTICS_UPDATE_INTERVAL: DIAGNOSTICS_UPDATE_INTERVAL,
  CACHE_TIMEOUT: CACHE_TIMEOUT,
  ERROR_POLL_INTERVAL: ERROR_POLL_INTERVAL,
  COMMAND_TIMEOUT: COMMAND_TIMEOUT,
  FETCH_TIMEOUT: FETCH_TIMEOUT,
  BUTTON_FEEDBACK_TIMEOUT: BUTTON_FEEDBACK_TIMEOUT,
  DIAGNOSTICS_INITIAL_DELAY: DIAGNOSTICS_INITIAL_DELAY,
  COMMAND_SCHEDULING: COMMAND_SCHEDULING,
  DIAGNOSTICS_CHECKS_MAP: DIAGNOSTICS_CHECKS_MAP,
});
