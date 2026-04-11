"use strict";
"require baseclass";

function validateIPV4(ip) {
  var ipRegex = /^(?:(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/;
  if (ipRegex.test(ip)) {
    return { valid: true, message: _("Valid") };
  }
  return { valid: false, message: _("Invalid IP address") };
}

function validateDomain(domain, allowDotTLD) {
  var domainRegex = /^(?=.{1,253}(?:\/|$))(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9-]{1,59}[a-zA-Z0-9])(?:\/[^\s]*)?$/;
  if (allowDotTLD) {
    var dotTLD = /^\.[a-zA-Z]{2,}$/;
    if (dotTLD.test(domain)) {
      return { valid: true, message: _("Valid") };
    }
  }
  if (!domainRegex.test(domain)) {
    return { valid: false, message: _("Invalid domain address") };
  }
  var hostname = domain.split("/")[0];
  var parts = hostname.split(".");
  var atLeastOneInvalidPart = parts.some(function(part) { return part.length > 63; });
  if (atLeastOneInvalidPart) {
    return { valid: false, message: _("Invalid domain address") };
  }
  return { valid: true, message: _("Valid") };
}

function validateDNS(value) {
  if (!value) {
    return { valid: false, message: _("DNS server address cannot be empty") };
  }
  if (/^https?:\/\//.test(value) || /^tls:\/\//.test(value)) {
    var host = value.replace(/^[a-z]+:\/\//, "").split("/")[0].split(":")[0];
    if (validateIPV4(host).valid || validateDomain(host).valid) {
      return { valid: true, message: _("Valid") };
    }
  }
  var cleanedValueWithoutPort = value.replace(/:(\d+)(?=\/|$)/, "");
  var cleanedIpWithoutPath = cleanedValueWithoutPort.split("/")[0];
  if (validateIPV4(cleanedIpWithoutPath).valid) {
    return { valid: true, message: _("Valid") };
  }
  if (validateDomain(cleanedValueWithoutPort).valid) {
    return { valid: true, message: _("Valid") };
  }
  return {
    valid: false,
    message: _(
      "Invalid DNS server format. Examples: 8.8.8.8 or dns.example.com or https://dns.example.com/dns-query for DoH"
    )
  };
}

function validateUrl(url, protocols) {
  if (!protocols) protocols = ["http:", "https:"];
  if (!url.length) {
    return { valid: false, message: _("Invalid URL format") };
  }
  var hasValidProtocol = protocols.some(function(p) { return url.indexOf(p + "//") === 0; });
  if (!hasValidProtocol)
    return {
      valid: false,
      message: _("URL must use one of the following protocols:") + " " + protocols.join(", ")
    };
  var regex = new RegExp(
    "^(?:" + protocols.map(function(p) { return p.replace(":", ""); }).join("|") + ")://(?:[A-Za-z0-9-]+\\.)+[A-Za-z]{2,}(?::\\d+)?(?:/[^\\s]*)?$"
  );
  if (regex.test(url)) {
    return { valid: true, message: _("Valid") };
  }
  return { valid: false, message: _("Invalid URL format") };
}

function validatePath(value) {
  if (!value) {
    return { valid: false, message: _("Path cannot be empty") };
  }
  var pathRegex = /^\/[a-zA-Z0-9_\-/.]+$/;
  if (pathRegex.test(value)) {
    return { valid: true, message: _("Valid") };
  }
  return {
    valid: false,
    message: _(
      'Invalid path format. Path must start with "/" and contain valid characters'
    )
  };
}

function validateSubnet(value) {
  var subnetRegex = /^(\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/;
  if (!subnetRegex.test(value)) {
    return {
      valid: false,
      message: _("Invalid format. Use X.X.X.X or X.X.X.X/Y")
    };
  }
  var parts = value.split("/");
  var ip = parts[0];
  var cidr = parts[1];
  if (ip === "0.0.0.0") {
    return { valid: false, message: _("IP address 0.0.0.0 is not allowed") };
  }
  var ipCheck = validateIPV4(ip);
  if (!ipCheck.valid) {
    return ipCheck;
  }
  if (cidr) {
    var cidrNum = parseInt(cidr, 10);
    if (cidrNum < 0 || cidrNum > 32) {
      return { valid: false, message: _("CIDR must be between 0 and 32") };
    }
  }
  return { valid: true, message: _("Valid") };
}

function parseQueryString(query) {
  var clean = query.startsWith("?") ? query.slice(1) : query;
  return clean.split("&").filter(Boolean).reduce(
    function(acc, pair) {
      var eqIdx = pair.indexOf("=");
      var rawKey, rawValue;
      if (eqIdx === -1) {
        rawKey = pair;
        rawValue = "";
      } else {
        rawKey = pair.substring(0, eqIdx);
        rawValue = pair.substring(eqIdx + 1);
      }
      if (!rawKey) return acc;
      var key = decodeURIComponent(rawKey);
      var value = decodeURIComponent(rawValue);
      acc[key] = value;
      return acc;
    },
    {}
  );
}

function validateVlessUrl(url) {
  try {
    if (!url.startsWith("vless://"))
      return { valid: false, message: "Invalid VLESS URL: must start with vless://" };
    if (/\s/.test(url))
      return { valid: false, message: "Invalid VLESS URL: must not contain spaces" };
    var body = url.slice("vless://".length);
    var mainPart = body.split("#")[0];
    var qIdx = mainPart.indexOf("?");
    var userHostPort = qIdx === -1 ? mainPart : mainPart.substring(0, qIdx);
    var queryString = qIdx === -1 ? null : mainPart.substring(qIdx + 1);
    if (!userHostPort)
      return { valid: false, message: "Invalid VLESS URL: missing host and UUID" };
    var atIdx = userHostPort.indexOf("@");
    var userPart = atIdx === -1 ? null : userHostPort.substring(0, atIdx);
    var hostPortPart = atIdx === -1 ? userHostPort : userHostPort.substring(atIdx + 1);
    if (!userPart)
      return { valid: false, message: "Invalid VLESS URL: missing UUID" };
    if (!hostPortPart)
      return { valid: false, message: "Invalid VLESS URL: missing server" };
    var colonIdx = hostPortPart.lastIndexOf(":");
    var host = colonIdx === -1 ? hostPortPart : hostPortPart.substring(0, colonIdx);
    var port = colonIdx === -1 ? null : hostPortPart.substring(colonIdx + 1);
    if (!host)
      return { valid: false, message: "Invalid VLESS URL: missing hostname" };
    if (!port)
      return { valid: false, message: "Invalid VLESS URL: missing port" };
    var cleanedPort = port.replace("/", "");
    var portNum = Number(cleanedPort);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535)
      return { valid: false, message: "Invalid VLESS URL: invalid port number" };
    if (!queryString)
      return { valid: false, message: "Invalid VLESS URL: missing query parameters" };
    var params = parseQueryString(queryString);
    var validTypes = ["tcp", "raw", "udp", "grpc", "http", "httpupgrade", "xhttp", "ws", "kcp"];
    var validSecurities = ["tls", "reality", "none"];
    if (!params.type || validTypes.indexOf(params.type) === -1)
      return { valid: false, message: "Invalid VLESS URL: unsupported or missing type" };
    if (!params.security || validSecurities.indexOf(params.security) === -1)
      return { valid: false, message: "Invalid VLESS URL: unsupported or missing security" };
    if (params.security === "reality") {
      if (!params.pbk)
        return { valid: false, message: "Invalid VLESS URL: missing pbk for reality" };
      if (!params.fp)
        return { valid: false, message: "Invalid VLESS URL: missing fp for reality" };
    }
    if (params.flow === "xtls-rprx-vision-udp443") {
      return { valid: false, message: "Invalid VLESS URL: flow xtls-rprx-vision-udp443 is not supported" };
    }
    return { valid: true, message: _("Valid") };
  } catch (_e) {
    return { valid: false, message: _("Invalid VLESS URL: parsing failed") };
  }
}

function validateSocksUrl(url) {
  try {
    if (!/^socks(4|4a|5):\/\//.test(url)) {
      return {
        valid: false,
        message: _("Invalid SOCKS URL: must start with socks4://, socks4a://, or socks5://")
      };
    }
    if (!url || /\s/.test(url)) {
      return { valid: false, message: _("Invalid SOCKS URL: must not contain spaces") };
    }
    var body = url.replace(/^socks(4|4a|5):\/\//, "");
    var authAndHost = body.split("#")[0];
    var credentials, hostPortPart;
    if (authAndHost.indexOf("@") !== -1) {
      var atIdx = authAndHost.indexOf("@");
      credentials = authAndHost.substring(0, atIdx);
      hostPortPart = authAndHost.substring(atIdx + 1);
    } else {
      credentials = null;
      hostPortPart = authAndHost;
    }
    if (credentials) {
      var username = credentials.split(":")[0];
      if (!username) {
        return { valid: false, message: _("Invalid SOCKS URL: missing username") };
      }
    }
    if (!hostPortPart) {
      return { valid: false, message: _("Invalid SOCKS URL: missing host and port") };
    }
    var colonIdx = hostPortPart.lastIndexOf(":");
    var host = colonIdx === -1 ? hostPortPart : hostPortPart.substring(0, colonIdx);
    var port = colonIdx === -1 ? null : hostPortPart.substring(colonIdx + 1);
    if (!host) {
      return { valid: false, message: _("Invalid SOCKS URL: missing hostname or IP") };
    }
    if (!port) {
      return { valid: false, message: _("Invalid SOCKS URL: missing port") };
    }
    var portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return { valid: false, message: _("Invalid SOCKS URL: invalid port number") };
    }
    var ipv4Result = validateIPV4(host);
    var domainResult = validateDomain(host);
    if (!ipv4Result.valid && !domainResult.valid) {
      return { valid: false, message: _("Invalid SOCKS URL: invalid host format") };
    }
  } catch (_e) {
    return { valid: false, message: _("Invalid SOCKS URL: parsing failed") };
  }
  return { valid: true, message: _("Valid") };
}

function validateProxyUrl(url) {
  var trimmedUrl = url.trim();
  if (trimmedUrl.startsWith("vless://")) {
    return validateVlessUrl(trimmedUrl);
  }
  if (/^socks(4|4a|5):\/\//.test(trimmedUrl)) {
    return validateSocksUrl(trimmedUrl);
  }
  return {
    valid: false,
    message: _("URL must start with vless:// or socks4/4a/5://")
  };
}

function bulkValidate(values, validate) {
  var results = values.map(function(value) {
    var r = validate(value);
    r.value = value;
    return r;
  });
  return {
    valid: results.every(function(r) { return r.valid; }),
    results: results
  };
}

return baseclass.extend({
  validateIPV4: validateIPV4,
  validateDomain: validateDomain,
  validateDNS: validateDNS,
  validateUrl: validateUrl,
  validatePath: validatePath,
  validateSubnet: validateSubnet,
  validateVlessUrl: validateVlessUrl,
  validateSocksUrl: validateSocksUrl,
  validateProxyUrl: validateProxyUrl,
  bulkValidate: bulkValidate,
  parseQueryString: parseQueryString
});
