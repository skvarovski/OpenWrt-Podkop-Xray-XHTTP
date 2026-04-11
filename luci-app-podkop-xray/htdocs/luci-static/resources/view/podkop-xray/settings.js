"use strict";
"require view";
"require form";
"require uci";
"require tools.widgets as widgets";
"require podkop-xray.validators as validators";
"require podkop-xray.constants as constants";
"require podkop-xray.api as api";

return view.extend({
  render: function() {
    api.injectStyles();

    var m = new form.Map(
      "podkop-xray",
      _("Podkop Xray - Settings"),
      _("Global settings for Podkop Xray service")
    );

    var s = m.section(
      form.TypedSection,
      "settings",
      _("Settings")
    );
    s.anonymous = true;
    s.addremove = false;
    s.cfgsections = function() { return ["settings"]; };

    var o;

    o = s.option(
      form.ListValue,
      "dns_type",
      _("DNS Protocol Type"),
      _("Select DNS protocol to use")
    );
    o.value("doh", _("DNS over HTTPS (DoH)"));
    o.value("dot", _("DNS over TLS (DoT)"));
    o.value("udp", _("UDP (Unprotected DNS)"));
    o.default = "udp";
    o.rmempty = false;

    o = s.option(
      form.Value,
      "dns_server",
      _("DNS Server"),
      _("Select or enter DNS server address")
    );
    var dnsKeys = Object.keys(constants.DNS_SERVER_OPTIONS);
    for (var i = 0; i < dnsKeys.length; i++) {
      o.value(dnsKeys[i], _(constants.DNS_SERVER_OPTIONS[dnsKeys[i]]));
    }
    o.default = "8.8.8.8";
    o.rmempty = false;
    o.validate = function(section_id, value) {
      var validation = validators.validateDNS(value);
      if (validation.valid) return true;
      return validation.message;
    };

    o = s.option(
      form.Value,
      "bootstrap_dns_server",
      _("Bootstrap DNS server"),
      _("The DNS server used to look up the IP address of an upstream DNS server")
    );
    var bootstrapKeys = Object.keys(constants.BOOTSTRAP_DNS_SERVER_OPTIONS);
    for (var i = 0; i < bootstrapKeys.length; i++) {
      o.value(bootstrapKeys[i], _(constants.BOOTSTRAP_DNS_SERVER_OPTIONS[bootstrapKeys[i]]));
    }
    o.default = "77.88.8.8";
    o.rmempty = false;
    o.validate = function(section_id, value) {
      var validation = validators.validateDNS(value);
      if (validation.valid) return true;
      return validation.message;
    };

    o = s.option(
      form.Value,
      "dns_rewrite_ttl",
      _("DNS Rewrite TTL"),
      _("Time in seconds for DNS record caching (default: 60)")
    );
    o.default = "60";
    o.rmempty = false;
    o.validate = function(section_id, value) {
      if (!value) return _("TTL value cannot be empty");
      var ttl = parseInt(value);
      if (isNaN(ttl) || ttl < 0) return _("TTL must be a positive number");
      return true;
    };

    o = s.option(
      widgets.DeviceSelect,
      "source_network_interfaces",
      _("Source Network Interface"),
      _("Select the network interface from which the traffic will originate")
    );
    o.default = "br-lan";
    o.noaliases = true;
    o.nobridges = false;
    o.noinactive = false;
    o.multiple = true;
    o.filter = function(section_id, value) {
      var blocked = ["wan", "phy0-ap0", "phy1-ap0", "pppoe-wan"];
      if (blocked.indexOf(value) !== -1) return false;
      var device = this.devices.find(function(dev) { return dev.getName() === value; });
      if (!device) return true;
      var type = device.getType();
      var isWireless = type === "wifi" || type === "wireless" || type.indexOf("wlan") !== -1;
      return !isWireless;
    };

    o = s.option(
      form.Flag,
      "enable_output_network_interface",
      _("Enable Output Network Interface"),
      _("You can select Output Network Interface, by default autodetect")
    );
    o.default = "0";
    o.rmempty = false;

    o = s.option(
      widgets.DeviceSelect,
      "output_network_interface",
      _("Output Network Interface"),
      _("Select the network interface to which the traffic will originate")
    );
    o.noaliases = true;
    o.multiple = false;
    o.depends("enable_output_network_interface", "1");
    o.filter = function(section_id, value) {
      var blockedInterfaces = ["br-lan"];
      if (blockedInterfaces.indexOf(value) !== -1) return false;
      if (value.startsWith("lan")) return false;
      if (value.startsWith("tun") || value.startsWith("wg") ||
          value.startsWith("vpn") || value.startsWith("awg") ||
          value.startsWith("oc")) return false;
      var device = this.devices.find(function(dev) { return dev.getName() === value; });
      if (!device) return true;
      var type = device.getType();
      var isWireless = type === "wifi" || type === "wireless" || type.indexOf("wlan") !== -1;
      return !isWireless;
    };

    o = s.option(
      form.Flag,
      "enable_badwan_interface_monitoring",
      _("Interface Monitoring"),
      _("Interface monitoring for Bad WAN")
    );
    o.default = "0";
    o.rmempty = false;

    o = s.option(
      widgets.NetworkSelect,
      "badwan_monitored_interfaces",
      _("Monitored Interfaces"),
      _("Select the WAN interfaces to be monitored")
    );
    o.depends("enable_badwan_interface_monitoring", "1");
    o.multiple = true;
    o.filter = function(section_id, value) {
      if (["lan", "loopback"].indexOf(value) !== -1) return false;
      if (value.startsWith("@")) return false;
      return true;
    };

    o = s.option(
      form.Value,
      "badwan_reload_delay",
      _("Interface Monitoring Delay"),
      _("Delay in milliseconds before reloading podkop after interface UP")
    );
    o.depends("enable_badwan_interface_monitoring", "1");
    o.default = "2000";
    o.rmempty = false;
    o.validate = function(section_id, value) {
      if (!value) return _("Delay value cannot be empty");
      return true;
    };

    o = s.option(
      form.Flag,
      "disable_quic",
      _("Disable QUIC"),
      _("Disable the QUIC protocol to improve compatibility or fix issues with video streaming")
    );
    o.default = "0";
    o.rmempty = false;

    o = s.option(
      form.ListValue,
      "update_interval",
      _("List Update Frequency"),
      _("Select how often the domain or subnet lists are updated automatically")
    );
    var intervalKeys = Object.keys(constants.UPDATE_INTERVAL_OPTIONS);
    for (var i = 0; i < intervalKeys.length; i++) {
      o.value(intervalKeys[i], _(constants.UPDATE_INTERVAL_OPTIONS[intervalKeys[i]]));
    }
    o.default = "1d";
    o.rmempty = false;

    o = s.option(
      form.Flag,
      "download_lists_via_proxy",
      _("Download Lists via Proxy/VPN"),
      _("Downloading all lists via specific Proxy/VPN")
    );
    o.default = "0";
    o.rmempty = false;

    o = s.option(
      form.ListValue,
      "download_lists_via_proxy_section",
      _("Download Lists via specific proxy section"),
      _("Downloading all lists via specific Proxy/VPN")
    );
    o.rmempty = false;
    o.depends("download_lists_via_proxy", "1");
    o.cfgvalue = function(section_id) {
      return uci.get("podkop-xray", section_id, "download_lists_via_proxy_section");
    };
    o.load = function() {
      var sections = this.map?.data?.state?.values?.["podkop-xray"] || {};
      this.keylist = [];
      this.vallist = [];
      for (var secName in sections) {
        var sec = sections[secName];
        if (sec[".type"] === "section") {
          this.keylist.push(secName);
          this.vallist.push(secName);
        }
      }
      return Promise.resolve();
    };

    o = s.option(
      form.Flag,
      "dont_touch_dhcp",
      _("Dont Touch My DHCP!"),
      _("Podkop will not modify your DHCP configuration")
    );
    o.default = "0";
    o.rmempty = false;

    o = s.option(
      form.ListValue,
      "config_path",
      _("Config File Path"),
      _("Select path for Xray config file. Change this ONLY if you know what you are doing")
    );
    o.value("/etc/xray/config.json", "Flash (/etc/xray/config.json)");
    o.value("/tmp/xray/config.json", "RAM (/tmp/xray/config.json)");
    o.default = "/etc/xray/config.json";
    o.rmempty = false;

    o = s.option(
      form.ListValue,
      "log_level",
      _("Log Level"),
      _("Select the log level for Xray")
    );
    o.value("debug", "Debug");
    o.value("info", "Info");
    o.value("warning", "Warning");
    o.value("error", "Error");
    o.value("none", "None");
    o.default = "warning";
    o.rmempty = false;

    o = s.option(
      form.Flag,
      "exclude_ntp",
      _("Exclude NTP"),
      _("Exclude NTP protocol traffic from the tunnel to prevent it from being routed through the proxy or VPN")
    );
    o.default = "0";
    o.rmempty = false;

    o = s.option(
      form.DynamicList,
      "routing_excluded_ips",
      _("Routing Excluded IPs"),
      _("Specify a local IP address to be excluded from routing")
    );
    o.placeholder = "IP";
    o.rmempty = true;
    o.validate = function(section_id, value) {
      if (!value || value.length === 0) return true;
      var validation = validators.validateIPV4(value);
      if (validation.valid) return true;
      return validation.message;
    };

    return m.render();
  }
});
