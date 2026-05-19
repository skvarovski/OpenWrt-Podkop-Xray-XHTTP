"use strict";
"require baseclass";
"require fs";
"require podkop-xray.constants as constants";

// structuredClone polyfill (must be before StoreService)
if (typeof structuredClone !== "function")
  globalThis.structuredClone = function(obj) { return JSON.parse(JSON.stringify(obj)); };

// Helpers

function withTimeout(promise, timeoutMs, operationName, timeoutMessage) {
  if (!timeoutMessage) timeoutMessage = _("Operation timed out");
  var timeoutId;
  var start = performance.now();
  var timeoutPromise = new Promise(function(_, reject) {
    timeoutId = setTimeout(function() { reject(new Error(timeoutMessage)); }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).then(function(result) {
    clearTimeout(timeoutId);
    var elapsed = performance.now() - start;
    logger.info("[SHELL]", "[" + operationName + "] took " + elapsed.toFixed(2) + " ms");
    return result;
  }, function(err) {
    clearTimeout(timeoutId);
    var elapsed = performance.now() - start;
    logger.info("[SHELL]", "[" + operationName + "] took " + elapsed.toFixed(2) + " ms");
    throw err;
  });
}

function executeShellCommand(opts) {
  var command = opts.command;
  var args = opts.args;
  var timeout = opts.timeout || constants.COMMAND_TIMEOUT;
  try {
    return withTimeout(
      fs.exec(command, args),
      timeout,
      [command].concat(args).join(" ")
    ).catch(function (err) {
      // Timeout / async rejection: resolve with an empty result so callers
      // always get a value and the diagnostic check reaches a terminal state.
      return { stdout: "", stderr: (err && err.message) || "", code: 1 };
    });
  } catch (err) {
    return Promise.resolve({ stdout: "", stderr: err?.message || "", code: 0 });
  }
}

function callBaseMethod(method, args, command) {
  if (!args) args = [];
  if (!command) command = "/usr/bin/podkop-xray";
  return executeShellCommand({
    command: command,
    args: [method].concat(args),
    timeout: 15000
  }).then(function(response) {
    if (response.stdout) {
      try {
        return { success: true, data: JSON.parse(response.stdout) };
      } catch (_e) {
        return { success: true, data: response.stdout };
      }
    }
    return { success: false, error: response.stderr || "" };
  });
}

// Shell Methods

var PodkopShellMethods = {
  checkXray: function() { return callBaseMethod("check_xray"); },
  getXrayStatus: function() { return callBaseMethod("get_xray_status"); },
  showXrayConfig: function() { return callBaseMethod("show_xray_config"); },
  checkNftRules: function() { return callBaseMethod("check_nft_rules"); },
  checkDNSAvailable: function() { return callBaseMethod("check_dns_available"); },
  checkProxy: function() { return callBaseMethod("check_proxy"); },
  checkFakeIP: function() { return callBaseMethod("check_fakeip"); },
  checkLogs: function() { return callBaseMethod("check_logs"); },
  getStatus: function() { return callBaseMethod("get_status"); },
  getSystemInfo: function() { return callBaseMethod("get_system_info"); },
  showConfig: function() { return callBaseMethod("show_config"); },
  showVersion: function() { return callBaseMethod("show_version"); },
  globalCheck: function() { return callBaseMethod("global_check"); },
  listGeositeCategories: function() { return callBaseMethod("list_geosite_categories"); },
  listGeoipCategories: function() { return callBaseMethod("list_geoip_categories"); },
  restart: function() { return callBaseMethod("restart", [], "/etc/init.d/podkop-xray"); },
  start: function() { return callBaseMethod("start", [], "/etc/init.d/podkop-xray"); },
  stop: function() { return callBaseMethod("stop", [], "/etc/init.d/podkop-xray"); },
  enable: function() { return callBaseMethod("enable", [], "/etc/init.d/podkop-xray"); },
  disable: function() { return callBaseMethod("disable", [], "/etc/init.d/podkop-xray"); }
};

// Remote FakeIP Methods

function createBaseApiRequest(fetchFn, options) {
  var wrappedFn = function() {
    if (options && options.timeoutMs && options.operationName) {
      return withTimeout(fetchFn(), options.timeoutMs, options.operationName, options.timeoutMessage);
    }
    return fetchFn();
  };
  return wrappedFn().then(function(response) {
    if (!response.ok) {
      return { success: false, message: _("HTTP error") + " " + response.status + ": " + response.statusText };
    }
    return response.json().then(function(data) {
      return { success: true, data: data };
    });
  }).catch(function(e) {
    return { success: false, message: e instanceof Error ? e.message : _("Unknown error") };
  });
}

var RemoteFakeIPMethods = {
  getFakeIpCheck: function() {
    return createBaseApiRequest(
      function() {
        return fetch("https://" + constants.FAKEIP_CHECK_DOMAIN + "/check", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
      },
      { operationName: "getFakeIpCheck", timeoutMs: 5000 }
    );
  },
  getIpCheck: function() {
    return createBaseApiRequest(
      function() {
        return fetch("https://" + constants.IP_CHECK_DOMAIN + "/check", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
      },
      { operationName: "getIpCheck", timeoutMs: 5000 }
    );
  }
};

// Logger

var Logger = function() {
  this.logs = [];
  this.levels = ["debug", "info", "warn", "error"];
};

Logger.prototype.format = function(level) {
  var args = Array.prototype.slice.call(arguments, 1);
  return "[" + level.toUpperCase() + "] " + args.join(" ");
};

Logger.prototype.push = function(level) {
  if (this.levels.indexOf(level) === -1) level = "info";
  var args = Array.prototype.slice.call(arguments, 1);
  var message = this.format.apply(this, [level].concat(args));
  this.logs.push(message);
  switch (level) {
    case "error": console.error(message); break;
    case "warn": console.warn(message); break;
    case "info": console.info(message); break;
    default: console.log(message);
  }
};

Logger.prototype.debug = function() { this.push.apply(this, ["debug"].concat(Array.prototype.slice.call(arguments))); };
Logger.prototype.info = function() { this.push.apply(this, ["info"].concat(Array.prototype.slice.call(arguments))); };
Logger.prototype.warn = function() { this.push.apply(this, ["warn"].concat(Array.prototype.slice.call(arguments))); };
Logger.prototype.error = function() { this.push.apply(this, ["error"].concat(Array.prototype.slice.call(arguments))); };
Logger.prototype.clear = function() { this.logs = []; };
Logger.prototype.getLogs = function() { return this.logs.join("\n"); };
Logger.prototype.download = function(filename) {
  if (!filename) filename = "logs.txt";
  if (typeof document === "undefined") {
    console.warn("Logger.download() only available in browser");
    return;
  }
  downloadAsTxt(this.getLogs(), filename);
};

var logger = new Logger();

// Store Service

function jsonStableStringify(obj) {
  return JSON.stringify(obj, function(_, value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce(function(acc, key) {
        acc[key] = value[key];
        return acc;
      }, {});
    }
    return value;
  });
}

function jsonEqual(a, b) {
  try {
    return jsonStableStringify(a) === jsonStableStringify(b);
  } catch (_e) {
    return false;
  }
}

var StoreService = function(initial) {
  this.listeners = new Set();
  this.lastHash = "";
  this.value = initial;
  this.initial = structuredClone(initial);
  this.lastHash = jsonStableStringify(initial);
};

StoreService.prototype.get = function() { return this.value; };

StoreService.prototype.set = function(next) {
  var prev = this.value;
  var merged = Object.assign({}, prev, next);
  if (jsonEqual(prev, merged)) return;
  this.value = merged;
  this.lastHash = jsonStableStringify(merged);
  var diff = {};
  for (var key in merged) {
    if (!jsonEqual(merged[key], prev[key])) diff[key] = merged[key];
  }
  this.listeners.forEach(function(cb) { cb(merged, prev, diff); });
};

StoreService.prototype.reset = function(keys) {
  var prev = this.value;
  var next = structuredClone(this.value);
  if (keys && keys.length > 0) {
    var self = this;
    keys.forEach(function(key) { next[key] = structuredClone(self.initial[key]); });
  } else {
    Object.assign(next, structuredClone(this.initial));
  }
  if (jsonEqual(prev, next)) return;
  this.value = next;
  this.lastHash = jsonStableStringify(next);
  var diff = {};
  for (var key in next) {
    if (!jsonEqual(next[key], prev[key])) diff[key] = next[key];
  }
  this.listeners.forEach(function(cb) { cb(next, prev, diff); });
};

StoreService.prototype.subscribe = function(cb) {
  this.listeners.add(cb);
  cb(this.value, this.value, {});
  return function() { this.listeners.delete(cb); }.bind(this);
};

StoreService.prototype.unsubscribe = function(cb) { this.listeners.delete(cb); };

StoreService.prototype.patch = function(key, value) {
  var update = {};
  update[key] = value;
  this.set(update);
};

StoreService.prototype.getKey = function(key) { return this.value[key]; };

StoreService.prototype.subscribeKey = function(key, cb) {
  var prev = this.value[key];
  var wrapper = function(val) {
    if (!jsonEqual(val[key], prev)) {
      prev = val[key];
      cb(val[key]);
    }
  };
  this.listeners.add(wrapper);
  return function() { this.listeners.delete(wrapper); }.bind(this);
};

// Initial Store

function buildInitialDiagnosticChecks(description) {
  var CHECKS = constants.DIAGNOSTICS_CHECKS_MAP;
  return [
    { code: "DNS", title: CHECKS.DNS.title, order: CHECKS.DNS.order, description: description, items: [], state: "skipped" },
    { code: "XRAY", title: CHECKS.XRAY.title, order: CHECKS.XRAY.order, description: description, items: [], state: "skipped" },
    { code: "NFT", title: CHECKS.NFT.title, order: CHECKS.NFT.order, description: description, items: [], state: "skipped" },
    { code: "PROXY", title: CHECKS.PROXY.title, order: CHECKS.PROXY.order, description: description, items: [], state: "skipped" },
    { code: "FAKEIP", title: CHECKS.FAKEIP.title, order: CHECKS.FAKEIP.order, description: description, items: [], state: "skipped" }
  ];
}

var initialStore = {
  tabService: { current: "", all: [] },
  servicesInfoWidget: { loading: true, failed: false, data: { xray: 0, podkop: 0 } },
  diagnosticsSystemInfo: {
    loading: true,
    podkop_version: "loading",
    podkop_latest_version: "loading",
    luci_app_version: "loading",
    xray_version: "loading",
    openwrt_version: "loading",
    device_model: "loading"
  },
  diagnosticsActions: {
    restart: { loading: false },
    start: { loading: false },
    stop: { loading: false },
    enable: { loading: false },
    disable: { loading: false },
    globalCheck: { loading: false },
    viewLogs: { loading: false },
    showXrayConfig: { loading: false }
  },
  diagnosticsRunAction: { loading: false },
  diagnosticsChecks: buildInitialDiagnosticChecks(_("Not running"))
};

var store = new StoreService(initialStore);

// Helpers

function downloadAsTxt(text, filename) {
  var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  var safeName = filename.endsWith(".txt") ? filename : filename + ".txt";
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function showToast(message, type, duration) {
  if (!duration) duration = 3000;
  var container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  var toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() { toast.classList.add("visible"); }, 100);
  setTimeout(function() {
    toast.classList.remove("visible");
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
}

function copyToClipboard(text) {
  var textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showToast(_("Successfully copied!"), "success");
  } catch (_err) {
    showToast(_("Failed to copy!"), "error");
    console.error("copyToClipboard - e", _err);
  }
  document.body.removeChild(textarea);
}

function svgEl(tag, attrs, children) {
  if (!attrs) attrs = {};
  if (!children) children = [];
  var NS = "http://www.w3.org/2000/svg";
  var el = document.createElementNS(NS, tag);
  var keys = Object.keys(attrs);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (attrs[k] != null) el.setAttribute(k, String(attrs[k]));
  }
  var ch = Array.isArray(children) ? children : [children];
  ch.filter(Boolean).forEach(function(c) { el.appendChild(c); });
  return el;
}

function insertIf(condition, elements) {
  return condition ? elements : [];
}

function insertIfObj(condition, object) {
  return condition ? object : {};
}

function maskIP(ip) {
  if (!ip) ip = "";
  var ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  return ip.replace(ipv4Regex, function(_match, _p1, _p2, _p3, p4) { return "XX.XX.XX." + p4; });
}

function getProxyUrlName(url) {
  try {
    var hash = url.split("#")[1];
    if (!hash) return "";
    return decodeURIComponent(hash);
  } catch (_e) {
    return "";
  }
}

function onMount(id) {
  return new Promise(function(resolve) {
    var el = document.getElementById(id);
    if (el && el.offsetParent !== null) {
      return resolve(el);
    }
    var observer = new MutationObserver(function() {
      var target = document.getElementById(id);
      if (target) {
        var io = new IntersectionObserver(function(entries) {
          var visible = entries.some(function(e) { return e.isIntersecting; });
          if (visible) {
            observer.disconnect();
            io.disconnect();
            resolve(target);
          }
        });
        io.observe(target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function splitProxyString(str) {
  return str.split("\n").map(function(line) { return line.trim(); })
    .filter(function(line) { return !line.startsWith("//"); })
    .filter(Boolean);
}

function preserveScrollForPage(renderFn) {
  var scrollY = window.scrollY;
  renderFn();
  requestAnimationFrame(function() { window.scrollTo({ top: scrollY }); });
}

function parseValueList(value) {
  return value.split(/\n/).map(function(line) { return line.split("//")[0]; })
    .join(" ").split(/[,\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
}

function normalizeCompiledVersion(version) {
  if (version.indexOf("COMPILED") !== -1) return "dev";
  return version;
}

// Fetch services info

function fetchServicesInfo() {
  return Promise.all([
    PodkopShellMethods.getStatus(),
    PodkopShellMethods.getXrayStatus()
  ]).then(function(results) {
    var podkop = results[0];
    var xray = results[1];
    if (!podkop.success || !xray.success) {
      store.set({ servicesInfoWidget: { loading: false, failed: true, data: { xray: 0, podkop: 0 } } });
      return;
    }
    store.set({
      servicesInfoWidget: {
        loading: false, failed: false,
        data: { xray: xray.data.running, podkop: podkop.data.enabled }
      }
    });
  });
}

return baseclass.extend({
  PodkopShellMethods: PodkopShellMethods,
  RemoteFakeIPMethods: RemoteFakeIPMethods,
  Logger: Logger,
  logger: logger,
  StoreService: StoreService,
  store: store,
  executeShellCommand: executeShellCommand,
  withTimeout: withTimeout,
  downloadAsTxt: downloadAsTxt,
  showToast: showToast,
  copyToClipboard: copyToClipboard,
  svgEl: svgEl,
  insertIf: insertIf,
  insertIfObj: insertIfObj,
  maskIP: maskIP,
  getProxyUrlName: getProxyUrlName,
  onMount: onMount,
  splitProxyString: splitProxyString,
  preserveScrollForPage: preserveScrollForPage,
  parseValueList: parseValueList,
  normalizeCompiledVersion: normalizeCompiledVersion,
  fetchServicesInfo: fetchServicesInfo,
  buildInitialDiagnosticChecks: buildInitialDiagnosticChecks,
  injectStyles: function() {
    if (document.getElementById("podkop-xray-styles")) return;
    var link = document.createElement("link");
    link.id = "podkop-xray-styles";
    link.rel = "stylesheet";
    link.href = L.resource("podkop-xray/style.css");
    document.head.appendChild(link);
  }
});
