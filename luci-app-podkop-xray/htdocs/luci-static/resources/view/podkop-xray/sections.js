"use strict";
"require view";
"require form";
"require tools.widgets as widgets";
"require podkop-xray.validators as validators";
"require podkop-xray.api as api";

// Descriptions for known geosite categories (shown in UI dropdowns)
var GEOSITE_DESCRIPTIONS = {
  "RU-BLOCKED": "Заблокировано в РФ (основной список ReFilter)",
  "ANTIFILTER-DOWNLOAD-COMMUNITY": "Комьюнити-дополнения к антифильтру",
  "CATEGORY-MEDIA": "Медиа (YouTube, Netflix, Spotify, Twitch, BBC, CNN...)",
  "CATEGORY-COMMUNICATION": "Мессенджеры (Telegram, Discord, Signal, WhatsApp...)",
  "CATEGORY-ENTERTAINMENT": "Развлечения (стриминг, аниме)",
  "CATEGORY-GAMES": "Игры (Steam, Epic, Riot, Blizzard...)",
  "CATEGORY-DEV": "Инструменты разработчика (GitHub, Docker, npm, JetBrains...)",
  "CATEGORY-FORUMS": "Форумы (Reddit, 4chan, Habr, Rutracker...)",
  "CATEGORY-ANTICENSORSHIP": "Средства обхода блокировок",
  "CATEGORY-VPNSERVICES": "Сайты VPN-сервисов (часто заблокированы)",
  "CATEGORY-CRYPTOCURRENCY": "Криптовалюты (биржи, кошельки)",
  "GOOGLE": "Google",
  "CLOUDFLARE": "Cloudflare",
  "AMAZON": "Amazon / AWS",
  "CATEGORY-RU": "Все российские домены",
  "RU-AVAILABLE-ONLY-INSIDE": "Доступно только из РФ (Госуслуги, МФЦ...)",
  "CATEGORY-BANK-RU": "Российские банки",
  "CATEGORY-GOV-RU": "Госсайты РФ",
  "PRIVATE": "Приватные/локальные домены",
  "CATEGORY-ADS-ALL": "Вся реклама (AdGuard DNS + Peter Lowe)"
};

// Descriptions for known geoip categories
var GEOIP_DESCRIPTIONS = {
  "RU-BLOCKED": "IP заблокированных ресурсов",
  "RE-FILTER": "IP из ReFilter",
  "RU-BLOCKED-COMMUNITY": "Комьюнити-дополнения",
  "TELEGRAM": "Telegram IP ranges",
  "GOOGLE": "Google IP ranges",
  "CLOUDFLARE": "Cloudflare IP ranges",
  "RU": "Российские IP",
  "RU-WHITELIST": "Российский whitelist",
  "YANDEX": "Яндекс IP",
  "DDOS-GUARD": "DDoS-Guard (российский CDN)",
  "PRIVATE": "Приватные/локальные (RFC1918)"
};

function getGeositeLabel(code) {
  var desc = GEOSITE_DESCRIPTIONS[code];
  if (desc) return desc + " [" + code + "]";
  return code;
}

function getGeoipLabel(code) {
  var desc = GEOIP_DESCRIPTIONS[code];
  if (desc) return desc + " [" + code + "]";
  return code;
}

function loadCategories(method) {
  return method().then(function(result) {
    if (result.success && result.data) {
      var raw = typeof result.data === "string" ? result.data : "";
      var cats = raw.trim().split(/\n/).filter(Boolean);
      if (cats.length > 0) return cats;
    }
    return [];
  }).catch(function() {
    return [];
  });
}

function addValues(option, categories, labelFn) {
  categories.forEach(function(code) {
    option.value(code, labelFn(code));
  });
}

return view.extend({
  render: function() {
    api.injectStyles();

    return Promise.all([
      loadCategories(api.PodkopShellMethods.listGeositeCategories),
      loadCategories(api.PodkopShellMethods.listGeoipCategories)
    ]).then(function(results) {
      var geositeCategories = results[0];
      var geoipCategories = results[1];

      var m = new form.Map(
        "podkop-xray",
        _("Podkop Xray"),
        _("Configure routing sections for Podkop Xray service")
      );

      var s = m.section(
        form.TypedSection,
        "section",
        _("Sections")
      );
      s.anonymous = false;
      s.addremove = true;

      var o;

      o = s.option(
        form.ListValue,
        "connection_type",
        _("Connection Type"),
        _("Тип подключения для Xray: прокси, прокси в несколько потоков с балансировкой и отключено")
      );
      o.value("proxy", _("Proxy"));
      o.value("block", _("Block"));
      o.value("exclusion", _("Exclusion (direct)"));

      o = s.option(
        form.TextValue,
        "proxy_string",
        _("Proxy URL"),
        _("Строка подключения VLESS+REALITY (TCP/XTLS-Vision) или XHTTP+Finalmask. Транспорты: tcp, xhttp, grpc. Безопасность: только REALITY.")
      );
      o.depends("connection_type", "proxy");
      o.placeholder = "vless://UUID@server:443?security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&flow=xtls-rprx-vision";
      o.rows = 5;
      o.wrap = "soft";
      o.textarea = true;
      o.rmempty = true;
      o.validate = function(section_id, value) {
        if (!value || value.length === 0) return true;
        var lines = value.trim().split(/\s+/);
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (!line) continue;
          var validation;
          if (line.startsWith("vless://")) {
            validation = validators.validateVlessUrl(line);
          } else if (line.startsWith("socks4://") || line.startsWith("socks4a://") || line.startsWith("socks5://")) {
            validation = validators.validateSocksUrl(line);
          } else {
            return _("Unsupported URL scheme. Only vless:// and socks4/4a/5:// URLs are supported.");
          }
          if (!validation.valid) return validation.message;
        }
        return true;
      };

      // Geosite Proxy
      o = s.option(
        form.DynamicList,
        "geosite_proxy",
        _("Geosite Proxy"),
        _("Домены из выбранных категорий будут маршрутизироваться через прокси.")
      );
      o.placeholder = _("Выберите категории для проксирования...");
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      addValues(o, geositeCategories, getGeositeLabel);

      // Geosite Direct
      o = s.option(
        form.DynamicList,
        "geosite_direct",
        _("Geosite Direct"),
        _("Домены из выбранных категорий пойдут напрямую, минуя прокси. Используйте для локальных и национальных сервисов.")
      );
      o.placeholder = _("Выберите категории для прямого доступа...");
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "exclusion");
      addValues(o, geositeCategories, getGeositeLabel);

      // Geosite Block
      o = s.option(
        form.DynamicList,
        "geosite_block",
        _("Geosite Block"),
        _("Домены из выбранных категорий будут заблокированы. Используйте для рекламы, трекеров, вредоносных сайтов.")
      );
      o.placeholder = _("Выберите категории для блокировки...");
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      addValues(o, geositeCategories, getGeositeLabel);

      // GeoIP Proxy
      o = s.option(
        form.DynamicList,
        "geoip_proxy",
        _("GeoIP Proxy"),
        _("IP-диапазоны из выбранных категорий будут маршрутизироваться через прокси.")
      );
      o.placeholder = _("Выберите категории для проксирования...");
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      addValues(o, geoipCategories, getGeoipLabel);

      // GeoIP Direct
      o = s.option(
        form.DynamicList,
        "geoip_direct",
        _("GeoIP Direct"),
        _("IP-диапазоны из выбранных категорий пойдут напрямую, минуя прокси.")
      );
      o.placeholder = _("Выберите категории для прямого доступа...");
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "exclusion");
      addValues(o, geoipCategories, getGeoipLabel);

      // GeoIP Block
      o = s.option(
        form.DynamicList,
        "geoip_block",
        _("GeoIP Block"),
        _("IP-диапазоны из выбранных категорий будут заблокированы.")
      );
      o.placeholder = _("Выберите категории для блокировки...");
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      addValues(o, geoipCategories, getGeoipLabel);

      // Rules Type — order of routing rule evaluation
      o = s.option(
        form.ListValue,
        "rules_type",
        _("Rules Type"),
        _("Порядок применения правил маршрутизации. Первое совпадение — выигрывает.")
      );
      o.depends("connection_type", "proxy");
      o.value("proxy_direct_block", _("Proxy → Direct → Block"));
      o.value("block_proxy_direct", _("Block → Proxy → Direct"));
      o.value("direct_proxy_block", _("Direct → Proxy → Block"));
      o.value("block_direct_proxy", _("Block → Direct → Proxy (catch-all → proxy)"));
      o.value("proxy_everything", _("Proxy everything (ignore all lists)"));
      o.default = "proxy_direct_block";
      o.rmempty = true;

      // --- User Domain List ---
      o = s.option(
        form.ListValue,
        "user_domain_list_type",
        _("User Domain List Type"),
        _("Выберите тип списка для добавления пользовательских доменов")
      );
      o.value("disabled", _("Disabled"));
      o.value("dynamic", _("Dynamic List"));
      o.value("text", _("Text List"));
      o.default = "disabled";
      o.rmempty = false;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      o.depends("connection_type", "exclusion");

      o = s.option(
        form.DynamicList,
        "user_domains",
        _("User Domains"),
        _("Введите доменные имена без протоколов, например example.com или sub.example.com")
      );
      o.placeholder = "example.com";
      o.depends("user_domain_list_type", "dynamic");
      o.rmempty = true;
      o.validate = function(section_id, value) {
        if (!value || value.length === 0) return true;
        if (/^[a-zA-Z0-9*][a-zA-Z0-9.*-]*\.[a-zA-Z]{2,}$/.test(value)) return true;
        return _("Invalid domain name");
      };

      o = s.option(
        form.TextValue,
        "user_domains_text",
        _("User Domains List"),
        _("Введите домены через запятую, пробел или с новой строки. Комментарии через //")
      );
      o.placeholder = "example.com, sub.example.com\n// Social networks\ndomain.com test.com // personal domains";
      o.depends("user_domain_list_type", "text");
      o.rows = 8;
      o.rmempty = true;

      // --- User Subnet List ---
      o = s.option(
        form.ListValue,
        "user_subnet_list_type",
        _("User Subnet List Type"),
        _("Выберите тип списка для добавления пользовательских подсетей")
      );
      o.value("disabled", _("Disabled"));
      o.value("dynamic", _("Dynamic List"));
      o.value("text", _("Text List"));
      o.default = "disabled";
      o.rmempty = false;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      o.depends("connection_type", "exclusion");

      o = s.option(
        form.DynamicList,
        "user_subnets",
        _("User Subnets"),
        _("Введите подсети в формате CIDR (например 103.21.244.0/22) или отдельные IP-адреса")
      );
      o.placeholder = "103.21.244.0/22";
      o.depends("user_subnet_list_type", "dynamic");
      o.rmempty = true;
      o.validate = function(section_id, value) {
        if (!value || value.length === 0) return true;
        var validation = validators.validateSubnet(value);
        if (validation.valid) return true;
        return validation.message;
      };

      o = s.option(
        form.TextValue,
        "user_subnets_text",
        _("User Subnets List"),
        _("Введите подсети в формате CIDR или IP-адреса через запятую, пробел или с новой строки. Комментарии через //")
      );
      o.placeholder = "103.21.244.0/22\n// Google DNS\n8.8.8.8\n1.1.1.1/32, 9.9.9.9 // Cloudflare and Quad9";
      o.depends("user_subnet_list_type", "text");
      o.rows = 10;
      o.rmempty = true;

      // Remote domain lists
      o = s.option(
        form.DynamicList,
        "remote_domain_lists",
        _("Remote Domain Lists"),
        _("URL-адреса текстовых файлов со списками доменов (один домен на строку).")
      );
      o.placeholder = "https://example.com/domains.txt";
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      o.depends("connection_type", "exclusion");
      o.validate = function(section_id, value) {
        if (!value || value.length === 0) return true;
        if (/^https?:\/\/.+/.test(value)) return true;
        return _("Must be a valid HTTP(S) URL");
      };

      // Remote subnet lists
      o = s.option(
        form.DynamicList,
        "remote_subnet_lists",
        _("Remote Subnet Lists"),
        _("URL-адреса текстовых файлов со списками подсетей (один CIDR на строку).")
      );
      o.placeholder = "https://example.com/subnets.txt";
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      o.depends("connection_type", "exclusion");
      o.validate = function(section_id, value) {
        if (!value || value.length === 0) return true;
        if (/^https?:\/\/.+/.test(value)) return true;
        return _("Must be a valid HTTP(S) URL");
      };

      // Local domain lists
      o = s.option(
        form.DynamicList,
        "local_domain_lists",
        _("Local Domain Lists"),
        _("Пути к локальным файлам со списками доменов на роутере.")
      );
      o.placeholder = "/etc/podkop-xray/my-domains.txt";
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      o.depends("connection_type", "exclusion");

      // Local subnet lists
      o = s.option(
        form.DynamicList,
        "local_subnet_lists",
        _("Local Subnet Lists"),
        _("Пути к локальным файлам со списками подсетей на роутере.")
      );
      o.placeholder = "/etc/podkop-xray/my-subnets.txt";
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.depends("connection_type", "block");
      o.depends("connection_type", "exclusion");

      // Fully routed IPs
      o = s.option(
        form.DynamicList,
        "fully_routed_ips",
        _("Полное проксирование устройств"),
        _(
          "IP-адреса устройств в локальной сети, весь трафик которых будет направлен через прокси " +
          "(без учёта списков доменов выше). Используйте для устройств, которым нужен полный обход блокировок, " +
          "например: приставки, Smart TV, игровые консоли."
        )
      );
      o.placeholder = "192.168.1.2 or 192.168.1.0/24";
      o.rmempty = true;
      o.depends("connection_type", "proxy");
      o.validate = function(section_id, value) {
        if (!value || value.length === 0) return true;
        var validation = validators.validateSubnet(value);
        if (validation.valid) return true;
        return validation.message;
      };

      // Mixed proxy
      o = s.option(
        form.Flag,
        "mixed_proxy_enabled",
        _("Enable Mixed Proxy"),
        _(
          "Включить локальные SOCKS5 и HTTP прокси на роутере. " +
          "Устройства в сети смогут использовать эти прокси для маршрутизации трафика через сервер."
        )
      );
      o.default = "1";
      o.rmempty = false;
      o.depends("connection_type", "proxy");

      o = s.option(
        form.Value,
        "socks_proxy_port",
        _("SOCKS5 Proxy Port"),
        _("Порт SOCKS5 прокси. Используйте в настройках устройств: <router-ip>:<port>")
      );
      o.default = "10808";
      o.datatype = "port";
      o.rmempty = false;
      o.depends("mixed_proxy_enabled", "1");

      o = s.option(
        form.Value,
        "http_proxy_port",
        _("HTTP Proxy Port"),
        _("Порт HTTP прокси. Используйте в настройках устройств: <router-ip>:<port>")
      );
      o.default = "10809";
      o.datatype = "port";
      o.rmempty = false;
      o.depends("mixed_proxy_enabled", "1");

      return m.render();
    });
  }
});
