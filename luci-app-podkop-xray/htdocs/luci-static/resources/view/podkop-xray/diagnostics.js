"use strict";
"require view";
"require ui";
"require podkop-xray.api as api";
"require podkop-xray.constants as constants";

// SVG icon helpers
function svgIcon(pathData, cls, extra) {
  var NS = "http://www.w3.org/2000/svg";
  var children = [];
  if (Array.isArray(pathData)) {
    children = pathData;
  } else {
    children = [api.svgEl("path", { d: pathData })];
  }
  if (extra) children = children.concat(extra);
  return api.svgEl("svg", {
    xmlns: NS, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", "stroke-width": "2",
    "stroke-linecap": "round", "stroke-linejoin": "round",
    class: cls, width: "24", height: "24"
  }, children);
}

function iconLoaderCircle() {
  return svgIcon(
    [api.svgEl("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }),
     api.svgEl("animateTransform", {
       attributeName: "transform", attributeType: "XML",
       type: "rotate", from: "0 12 12", to: "360 12 12",
       dur: "1s", repeatCount: "indefinite"
     })],
    "lucide lucide-loader-circle rotate"
  );
}

function iconCircleAlert() {
  return svgIcon([
    api.svgEl("circle", { cx: "12", cy: "12", r: "10" }),
    api.svgEl("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
    api.svgEl("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
  ], "lucide lucide-circle-alert");
}

function iconCircleCheck() {
  return svgIcon([
    api.svgEl("circle", { cx: "12", cy: "12", r: "10" }),
    api.svgEl("path", { d: "M9 12l2 2 4-4" })
  ], "lucide lucide-circle-check");
}

function iconCircleX() {
  return svgIcon([
    api.svgEl("circle", { cx: "12", cy: "12", r: "10" }),
    api.svgEl("path", { d: "M15 9L9 15" }),
    api.svgEl("path", { d: "M9 9L15 15" })
  ], "lucide lucide-circle-x");
}

function iconCircleSlash() {
  return svgIcon([
    api.svgEl("circle", { cx: "12", cy: "12", r: "10" }),
    api.svgEl("line", { x1: "9", y1: "15", x2: "15", y2: "9" })
  ], "lucide lucide-circle-slash");
}

function iconCheck() {
  return svgIcon([api.svgEl("path", { d: "M20 6 9 17l-5-5" })], "lucide lucide-check");
}

function iconX() {
  return svgIcon([api.svgEl("path", { d: "M18 6 6 18" }), api.svgEl("path", { d: "m6 6 12 12" })], "lucide lucide-x");
}

function iconTriangleAlert() {
  return svgIcon([
    api.svgEl("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }),
    api.svgEl("path", { d: "M12 9v4" }),
    api.svgEl("path", { d: "M12 17h.01" })
  ], "lucide lucide-triangle-alert");
}

function iconSearch() {
  return svgIcon([
    api.svgEl("path", { d: "m21 21-4.34-4.34" }),
    api.svgEl("circle", { cx: "11", cy: "11", r: "8" })
  ], "lucide lucide-search");
}

function iconRotateCcw() {
  return svgIcon([
    api.svgEl("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
    api.svgEl("path", { d: "M3 3v5h5" })
  ], "lucide lucide-rotate-ccw");
}

function iconCircleStop() {
  return svgIcon([
    api.svgEl("circle", { cx: "12", cy: "12", r: "10" }),
    api.svgEl("rect", { x: "9", y: "9", width: "6", height: "6", rx: "1" })
  ], "lucide lucide-circle-stop");
}

function iconCirclePlay() {
  return svgIcon([
    api.svgEl("path", { d: "M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" }),
    api.svgEl("circle", { cx: "12", cy: "12", r: "10" })
  ], "lucide lucide-circle-play");
}

function iconPlay() {
  return svgIcon([
    api.svgEl("path", { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" })
  ], "lucide lucide-play");
}

function iconPause() {
  return svgIcon([
    api.svgEl("rect", { x: "14", y: "3", width: "5", height: "18", rx: "1" }),
    api.svgEl("rect", { x: "5", y: "3", width: "5", height: "18", rx: "1" })
  ], "lucide lucide-pause");
}

function iconCircleCheckBig() {
  return svgIcon([
    api.svgEl("path", { d: "M21.801 10A10 10 0 1 1 17 3.335" }),
    api.svgEl("path", { d: "m9 11 3 3L22 4" })
  ], "lucide lucide-circle-check-big");
}

function iconSquareChartGantt() {
  return svgIcon([
    api.svgEl("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }),
    api.svgEl("path", { d: "M9 8h7" }),
    api.svgEl("path", { d: "M8 12h6" }),
    api.svgEl("path", { d: "M11 16h5" })
  ], "lucide lucide-square-chart-gantt");
}

function iconCog() {
  return svgIcon([
    api.svgEl("path", { d: "M11 10.27 7 3.34" }),
    api.svgEl("path", { d: "m11 13.73-4 6.93" }),
    api.svgEl("path", { d: "M12 22v-2" }),
    api.svgEl("path", { d: "M12 2v2" }),
    api.svgEl("path", { d: "M14 12h8" }),
    api.svgEl("path", { d: "m17 20.66-1-1.73" }),
    api.svgEl("path", { d: "m17 3.34-1 1.73" }),
    api.svgEl("path", { d: "M2 12h2" }),
    api.svgEl("path", { d: "m20.66 17-1.73-1" }),
    api.svgEl("path", { d: "m20.66 7-1.73 1" }),
    api.svgEl("path", { d: "m3.34 17 1.73-1" }),
    api.svgEl("path", { d: "m3.34 7 1.73 1" }),
    api.svgEl("circle", { cx: "12", cy: "12", r: "2" }),
    api.svgEl("circle", { cx: "12", cy: "12", r: "8" })
  ], "lucide lucide-cog");
}

function iconBookOpenText() {
  return svgIcon([
    api.svgEl("path", { d: "M12 7v14" }),
    api.svgEl("path", { d: "M16 12h2" }),
    api.svgEl("path", { d: "M16 8h2" }),
    api.svgEl("path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }),
    api.svgEl("path", { d: "M6 12h2" }),
    api.svgEl("path", { d: "M6 8h2" })
  ], "lucide lucide-book-open-text");
}

// Button helper
function renderButton(opts) {
  var hasIcon = !!opts.loading || !!opts.icon;
  function getWrappedIcon() {
    var iconWrap = E("span", { class: "pdk-partial-button__icon" });
    if (opts.loading) { iconWrap.appendChild(iconLoaderCircle()); return iconWrap; }
    if (opts.icon) { iconWrap.appendChild(opts.icon()); return iconWrap; }
    return iconWrap;
  }
  var classes = ["btn", "pdk-partial-button"];
  if (opts.disabled) classes.push("pdk-partial-button--disabled");
  if (opts.loading) classes.push("pdk-partial-button--loading");
  if (hasIcon) classes.push("pdk-partial-button--with-icon");
  if (opts.classNames) classes = classes.concat(opts.classNames);
  var children = [];
  if (hasIcon) children.push(getWrappedIcon());
  children.push(E("span", {}, opts.text));
  return E("button", {
    class: classes.join(" "),
    disabled: (opts.loading || opts.disabled) ? true : undefined,
    click: opts.onClick
  }, children);
}

// Modal helper
function renderModal(text, name) {
  return E("div", { class: "pdk-partial-modal__body" },
    E("div", {}, [
      E("pre", { class: "pdk-partial-modal__content" }, E("code", {}, text)),
      E("div", { class: "pdk-partial-modal__footer" }, [
        renderButton({ classNames: ["cbi-button-apply"], text: _("Download"), onClick: function() { api.downloadAsTxt(text, name); } }),
        renderButton({ classNames: ["cbi-button-apply"], text: _("Copy"), onClick: function() { api.copyToClipboard(" ```" + name + " \n " + text + "  \n ```"); } }),
        renderButton({ classNames: ["cbi-button-remove"], text: _("Close"), onClick: ui.hideModal })
      ])
    ])
  );
}

// Check rendering
function renderCheckSummary(items) {
  if (!items.length) return E("div", {}, "");
  var rendered = items.map(function(item) {
    var iconWrap = E("span", { class: "pdk_diagnostic_alert__summary__item__icon" });
    if (item.state === "success") iconWrap.appendChild(iconCheck());
    if (item.state === "warning") iconWrap.appendChild(iconTriangleAlert());
    if (item.state === "error") iconWrap.appendChild(iconX());
    return E("div", { class: "pdk_diagnostic_alert__summary__item pdk_diagnostic_alert__summary__item--" + item.state },
      [iconWrap, E("b", {}, item.key), E("div", {}, item.value)]
    );
  });
  return E("div", { class: "pdk_diagnostic_alert__summary" }, rendered);
}

function renderCheckSection(props) {
  var iconFnMap = {
    loading: iconLoaderCircle, warning: iconCircleAlert,
    error: iconCircleX, success: iconCircleCheck, skipped: iconCircleSlash
  };
  var iconFn = iconFnMap[props.state] || iconCircleSlash;
  var iconWrap = E("span", { class: "pdk_diagnostic_alert__icon" });
  iconWrap.appendChild(iconFn());
  return E("div", { class: "pdk_diagnostic_alert pdk_diagnostic_alert--" + props.state }, [
    iconWrap,
    E("div", { class: "pdk_diagnostic_alert__content" }, [
      E("b", { class: "pdk_diagnostic_alert__title" }, props.title),
      E("div", { class: "pdk_diagnostic_alert__description" }, props.description)
    ]),
    E("div", {}, ""),
    renderCheckSummary(props.items)
  ]);
}

// Meta helper
function getMeta(opts) {
  if (opts.allGood) return { state: "success", description: _("Checks passed") };
  if (opts.atLeastOneGood) return { state: "warning", description: _("Issues detected") };
  return { state: "error", description: _("Checks failed") };
}

// Store reference
var store = api.store;
var shell = api.PodkopShellMethods;
var remote = api.RemoteFakeIPMethods;
var logger = api.logger;
var CHECKS = constants.DIAGNOSTICS_CHECKS_MAP;

function updateCheckStore(check) {
  var diagnosticsChecks = store.get().diagnosticsChecks;
  var other = diagnosticsChecks.filter(function(item) { return item.code !== check.code; });
  var smallCheck = Object.assign({}, check, {
    items: check.items.filter(function(item) { return item.state !== "success"; })
  });
  store.set({ diagnosticsChecks: other.concat([smallCheck]) });
}

// Diagnostic checks
function runDnsCheck() {
  var c = CHECKS.DNS;
  updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Checking, please wait"), state: "loading", items: [] });
  return shell.checkDNSAvailable().then(function(dnsChecks) {
    if (!dnsChecks.success) {
      updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Cannot receive checks result"), state: "error", items: [] });
      throw new Error("DNS checks failed");
    }
    var data = dnsChecks.data;
    var allGood = Boolean(data.dns_on_router) && Boolean(data.dhcp_config_status) && Boolean(data.bootstrap_dns_status) && Boolean(data.dns_status);
    var atLeastOneGood = Boolean(data.dns_on_router) || Boolean(data.dhcp_config_status) || Boolean(data.bootstrap_dns_status) || Boolean(data.dns_status);
    var meta = getMeta({ atLeastOneGood: atLeastOneGood, allGood: allGood });
    var items = [];
    if (data.dns_type === "doh" || data.dns_type === "dot" || !data.bootstrap_dns_status) {
      items.push({ state: data.bootstrap_dns_status ? "success" : "error", key: _("Bootstrap DNS"), value: data.bootstrap_dns_server });
    }
    items.push({ state: data.dns_status ? "success" : "error", key: _("Main DNS"), value: data.dns_server + " [" + data.dns_type + "]" });
    items.push({ state: data.dns_on_router ? "success" : "error", key: _("DNS on router"), value: "" });
    items.push({ state: data.dhcp_config_status ? "success" : "error", key: _("DHCP has DNS server"), value: "" });
    updateCheckStore({ order: c.order, code: c.code, title: c.title, description: meta.description, state: meta.state, items: items });
  });
}

function runXrayCheck() {
  var c = CHECKS.XRAY;
  updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Checking, please wait"), state: "loading", items: [] });
  return shell.checkXray().then(function(xrayChecks) {
    if (!xrayChecks.success) {
      updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Cannot receive checks result"), state: "error", items: [] });
      throw new Error("Xray checks failed");
    }
    var data = xrayChecks.data;
    var allGood = Boolean(data.xray_installed) && Boolean(data.xray_service_exist) && Boolean(data.xray_process_running) && Boolean(data.xray_ports_listening);
    var atLeastOneGood = Boolean(data.xray_installed) || Boolean(data.xray_service_exist) || Boolean(data.xray_process_running) || Boolean(data.xray_ports_listening);
    var meta = getMeta({ atLeastOneGood: atLeastOneGood, allGood: allGood });
    updateCheckStore({
      order: c.order, code: c.code, title: c.title, description: meta.description, state: meta.state,
      items: [
        { state: data.xray_installed ? "success" : "error", key: _("Xray installed"), value: "" },
        { state: data.xray_service_exist ? "success" : "error", key: _("Xray service exist"), value: "" },
        { state: data.xray_process_running ? "success" : "error", key: _("Xray process running"), value: "" },
        { state: data.xray_ports_listening ? "success" : "error", key: _("Xray listening ports"), value: "" }
      ]
    });
  });
}

function runNftCheck() {
  var c = CHECKS.NFT;
  updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Checking, please wait"), state: "loading", items: [] });
  return shell.checkNftRules().then(function(nftChecks) {
    if (!nftChecks.success) {
      updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Cannot receive checks result"), state: "error", items: [] });
      throw new Error("Nftables checks failed");
    }
    var data = nftChecks.data;
    // Critical: structure exists and no conflicts
    var allGood = Boolean(data.table_exist) && Boolean(data.rules_mangle_exist) && Boolean(data.rules_mangle_output_exist) && Boolean(data.rules_proxy_exist) && !data.rules_other_mark_exist;
    var atLeastOneGood = Boolean(data.table_exist) || Boolean(data.rules_mangle_exist) || Boolean(data.rules_mangle_output_exist) || Boolean(data.rules_proxy_exist) || !data.rules_other_mark_exist;
    var meta = getMeta({ atLeastOneGood: atLeastOneGood, allGood: allGood });
    updateCheckStore({
      order: c.order, code: c.code, title: c.title, description: meta.description, state: meta.state,
      items: [
        { state: data.table_exist ? "success" : "error", key: _("Table exist"), value: "" },
        { state: data.rules_mangle_exist ? "success" : "error", key: _("Rules mangle (prerouting)"), value: "" },
        { state: data.rules_mangle_output_exist ? "success" : "error", key: _("Rules mangle (output)"), value: "" },
        { state: data.rules_proxy_exist ? "success" : "error", key: _("Rules tproxy"), value: "" },
        { state: data.rules_mangle_counters ? "success" : "success",
          key: data.rules_mangle_counters ? _("LAN traffic intercepted") : _("LAN traffic: no packets yet"),
          value: data.rules_mangle_counters ? "" : _("Normal if no LAN device has browsed yet") },
        { state: data.rules_mangle_output_counters ? "success" : "success",
          key: data.rules_mangle_output_counters ? _("Router traffic intercepted") : _("Router traffic: no packets yet"), value: "" },
        { state: data.rules_proxy_counters ? "success" : "success",
          key: data.rules_proxy_counters ? _("Tproxy forwarding active") : _("Tproxy forwarding: no packets yet"), value: "" },
        { state: !data.rules_other_mark_exist ? "success" : "warning",
          key: !data.rules_other_mark_exist ? _("No other marking rules found") : _("Additional marking rules found"), value: "" }
      ]
    });
  });
}

function runProxyCheck() {
  var c = CHECKS.PROXY;
  updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Checking, please wait"), state: "loading", items: [] });
  return shell.checkProxy().then(function(result) {
    if (!result.success) {
      updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Cannot receive checks result"), state: "error", items: [] });
      throw new Error("Proxy checks failed");
    }
    var data = result.data;
    var checks = {
      reachable: Boolean(data.proxy_reachable),
      ipDifferent: Boolean(data.ip_different)
    };
    var allGood = checks.reachable && checks.ipDifferent;
    var atLeastOneGood = checks.reachable || checks.ipDifferent;
    var meta = getMeta({ atLeastOneGood: atLeastOneGood, allGood: allGood });
    // Show timing and IPs in description since success items are filtered out
    var desc = meta.description;
    if (checks.reachable) {
      desc = data.proxy_time_ms + " ms — Proxy IP: " + data.proxy_ip;
      if (data.direct_ip) desc += " / Direct IP: " + data.direct_ip;
    }
    var items = [
      { state: checks.reachable ? "success" : "error",
        key: checks.reachable ? _("Proxy server reachable") : _("Proxy server not reachable"),
        value: checks.reachable ? data.proxy_time_ms + " ms" : "" },
      { state: checks.ipDifferent ? "success" : "warning",
        key: checks.ipDifferent ? _("Proxy IP differs from direct IP") : _("Proxy IP same as direct IP"),
        value: "" }
    ];
    updateCheckStore({ order: c.order, code: c.code, title: c.title, description: desc, state: meta.state, items: items });
  });
}

function runFakeIPCheck() {
  var c = CHECKS.FAKEIP;
  updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Checking, please wait"), state: "loading", items: [] });
  return shell.checkFakeIP().then(function(result) {
    if (!result.success) {
      updateCheckStore({ order: c.order, code: c.code, title: c.title, description: _("Cannot receive checks result"), state: "error", items: [] });
      return;
    }
    var data = result.data;
    var checks = {
      fakeip: Boolean(data.fakeip),
      proxyWorking: Boolean(data.IP) && data.IP.length > 0
    };
    var allGood = checks.fakeip && checks.proxyWorking;
    var atLeastOneGood = checks.fakeip || checks.proxyWorking;
    var meta = getMeta({ atLeastOneGood: atLeastOneGood, allGood: allGood });
    var items = [
      { state: checks.fakeip ? "success" : "error",
        key: checks.fakeip ? _("Router DNS resolves to FakeIP") : _("Router DNS does not resolve to FakeIP"),
        value: data.resolved ? _("Resolved") + ": " + data.resolved : "" },
      { state: checks.proxyWorking ? "success" : "error",
        key: checks.proxyWorking ? _("Proxy outbound is working") : _("Proxy outbound is not reachable"),
        value: data.IP ? _("Proxy IP") + ": " + data.IP : "" }
    ];
    updateCheckStore({ order: c.order, code: c.code, title: c.title, description: meta.description, state: meta.state, items: items });
  });
}

function runChecks() {
  store.set({
    diagnosticsRunAction: { loading: true },
    diagnosticsChecks: api.buildInitialDiagnosticChecks(_("Pending"))
  });
  function step(fn) {
    return fn().catch(function(e) { logger.error("[DIAGNOSTIC]", "runChecks - e", e); });
  }
  return step(runDnsCheck)
    .then(function() { return step(runXrayCheck); })
    .then(function() { return step(runNftCheck); })
    .then(function() { return step(runProxyCheck); })
    .then(function() { return step(runFakeIPCheck); })
    .then(function() { store.set({ diagnosticsRunAction: { loading: false } }); });
}

// Render widgets
function renderChecksWidget() {
  var diagnosticsChecks = store.get().diagnosticsChecks.sort(function(a, b) { return a.order - b.order; });
  var container = document.getElementById("pdk_diagnostic-page-checks");
  if (!container) return;
  var rendered = diagnosticsChecks.map(function(check) { return renderCheckSection(check); });
  api.preserveScrollForPage(function() { container.replaceChildren.apply(container, rendered); });
}

function renderRunActionWidget() {
  var loading = store.get().diagnosticsRunAction.loading;
  var container = document.getElementById("pdk_diagnostic-page-run-check");
  if (!container) return;
  var el = E("div", { class: "pdk_diagnostic-page__run_check_wrapper" }, [
    renderButton({ text: _("Run Diagnostic"), onClick: runChecks, icon: iconSearch, loading: loading, classNames: ["cbi-button-apply"] })
  ]);
  api.preserveScrollForPage(function() { container.replaceChildren(el); });
}

function renderWikiWidget() {
  var diagnosticsChecks = store.get().diagnosticsChecks;
  var allResults = diagnosticsChecks.map(function(c) { return c.state; });
  var kind = "default";
  if (allResults.indexOf("error") !== -1) kind = "error";
  else if (allResults.indexOf("warning") !== -1) kind = "warning";

  var iconWrap = E("span", { class: "pdk_diagnostic-page__right-bar__wiki__icon" });
  iconWrap.appendChild(iconBookOpenText());
  var className = "pdk_diagnostic-page__right-bar__wiki";
  if (kind === "error") className += " pdk_diagnostic-page__right-bar__wiki--error";
  if (kind === "warning") className += " pdk_diagnostic-page__right-bar__wiki--warning";

  var container = document.getElementById("pdk_diagnostic-page-wiki");
  if (!container) return;
  var el = E("div", { class: className }, [
    E("div", { class: "pdk_diagnostic-page__right-bar__wiki__content" }, [
      iconWrap,
      E("div", { class: "pdk_diagnostic-page__right-bar__wiki__texts" }, [
        E("b", {}, _("Troubleshooting")),
        E("div", {}, _("Do not panic, everything can be fixed, just..."))
      ])
    ]),
    renderButton({
      classNames: ["cbi-button-save"], text: _("Visit Wiki"),
      onClick: function() { window.open("https://podkop.net/docs/troubleshooting/?utm_source=podkop", "_blank", "noopener,noreferrer"); }
    })
  ]);
  api.preserveScrollForPage(function() { container.replaceChildren(el); });
}

function handleAction(actionName, method, delay) {
  var diagnosticsActions = store.get().diagnosticsActions;
  var update = {};
  update[actionName] = { loading: true };
  store.set({ diagnosticsActions: Object.assign({}, diagnosticsActions, update) });
  return method().catch(function(e) {
    logger.error("[DIAGNOSTIC]", "handle" + actionName + " - e", e);
  }).then(function() {
    function finish() {
      return api.fetchServicesInfo().then(function() {
        var da = store.get().diagnosticsActions;
        var u = {};
        u[actionName] = { loading: false };
        store.set({ diagnosticsActions: Object.assign({}, da, u) });
        store.reset(["diagnosticsChecks"]);
      });
    }
    if (delay) {
      return new Promise(function(resolve) { setTimeout(function() { finish().then(resolve); }, delay); });
    }
    return finish();
  });
}

function handleShowModal(actionName, method, title) {
  var diagnosticsActions = store.get().diagnosticsActions;
  var update = {};
  update[actionName] = { loading: true };
  store.set({ diagnosticsActions: Object.assign({}, diagnosticsActions, update) });
  return method().then(function(result) {
    if (result.success) {
      var text = typeof result.data === "object" ? JSON.stringify(result.data, null, 2) : result.data;
      ui.showModal(_(title), renderModal(text, actionName));
    } else {
      api.showToast(_("Failed to execute!"), "error");
    }
  }).catch(function(e) {
    logger.error("[DIAGNOSTIC]", actionName + " - e", e);
    api.showToast(_("Failed to execute!"), "error");
  }).then(function() {
    var da = store.get().diagnosticsActions;
    var u = {};
    u[actionName] = { loading: false };
    store.set({ diagnosticsActions: Object.assign({}, da, u) });
  });
}

function renderActionsWidget() {
  var diagnosticsActions = store.get().diagnosticsActions;
  var servicesInfoWidget = store.get().servicesInfoWidget;
  var podkopEnabled = Boolean(servicesInfoWidget.data.podkop);
  var xrayRunning = Boolean(servicesInfoWidget.data.xray);
  var anyLoading = servicesInfoWidget.loading || diagnosticsActions.restart.loading || diagnosticsActions.start.loading || diagnosticsActions.stop.loading;

  var buttons = [];
  buttons.push(renderButton({
    classNames: ["cbi-button-apply"], onClick: function() { handleAction("restart", shell.restart, 5000); },
    icon: iconRotateCcw, text: _("Restart podkop-xray"), loading: diagnosticsActions.restart.loading, disabled: anyLoading
  }));
  if (xrayRunning) {
    buttons.push(renderButton({
      classNames: ["cbi-button-remove"], onClick: function() { handleAction("stop", shell.stop); },
      icon: iconCircleStop, text: _("Stop podkop-xray"), loading: diagnosticsActions.stop.loading, disabled: anyLoading
    }));
  } else {
    buttons.push(renderButton({
      classNames: ["cbi-button-save"], onClick: function() { handleAction("start", shell.start, 5000); },
      icon: iconCirclePlay, text: _("Start podkop-xray"), loading: diagnosticsActions.start.loading, disabled: anyLoading
    }));
  }
  if (podkopEnabled) {
    buttons.push(renderButton({
      classNames: ["cbi-button-remove"], onClick: function() { handleAction("disable", shell.disable); },
      icon: iconPause, text: _("Disable autostart"), loading: diagnosticsActions.disable.loading, disabled: anyLoading
    }));
  } else {
    buttons.push(renderButton({
      classNames: ["cbi-button-save"], onClick: function() { handleAction("enable", shell.enable); },
      icon: iconPlay, text: _("Enable autostart"), loading: diagnosticsActions.enable.loading, disabled: anyLoading
    }));
  }
  buttons.push(renderButton({
    onClick: function() { handleShowModal("globalCheck", shell.globalCheck, "Global check"); },
    icon: iconCircleCheckBig, text: _("Get global check"), loading: diagnosticsActions.globalCheck.loading, disabled: anyLoading
  }));
  buttons.push(renderButton({
    onClick: function() { handleShowModal("viewLogs", shell.checkLogs, "View logs"); },
    icon: iconSquareChartGantt, text: _("View logs"), loading: diagnosticsActions.viewLogs.loading, disabled: anyLoading
  }));
  buttons.push(renderButton({
    onClick: function() { handleShowModal("showXrayConfig", shell.showXrayConfig, "Show xray config"); },
    icon: iconCog, text: _("Show xray config"), loading: diagnosticsActions.showXrayConfig.loading, disabled: anyLoading
  }));

  var container = document.getElementById("pdk_diagnostic-page-actions");
  if (!container) return;
  var el = E("div", { class: "pdk_diagnostic-page__right-bar__actions" }, [E("b", {}, _("Available actions"))].concat(buttons));
  api.preserveScrollForPage(function() { container.replaceChildren(el); });
}

// Format geofiles release tag "202604111002" → "2026-04-11 10:02"
function formatGeofilesRelease(tag) {
  if (!tag || tag.length !== 12) return tag || "";
  return tag.slice(0, 4) + "-" + tag.slice(4, 6) + "-" + tag.slice(6, 8) + " " + tag.slice(8, 10) + ":" + tag.slice(10, 12);
}

function renderSystemInfoWidget() {
  var info = store.get().diagnosticsSystemInfo;
  var container = document.getElementById("pdk_diagnostic-page-system-info");
  if (!container) return;

  var version = api.normalizeCompiledVersion(info.podkop_version || "");
  var podkopRow = { key: "Podkop-Xray", value: version };
  if (!info.loading && version !== "dev" && info.podkop_latest_version && info.podkop_latest_version !== "unknown") {
    if (version !== "v" + info.podkop_latest_version) {
      podkopRow.tag = { label: _("Outdated"), kind: "warning" };
    } else {
      podkopRow.tag = { label: _("Latest"), kind: "success" };
    }
  }

  var items = [
    podkopRow,
    { key: "Luci App", value: api.normalizeCompiledVersion(constants.PODKOP_XRAY_LUCI_APP_VERSION) },
    { key: "Xray", value: info.xray_version || "" },
    { key: "Geosite", value: formatGeofilesRelease(info.geofiles_release), tag: info.geosite_status === "missing" ? { label: _("Missing"), kind: "warning" } : null },
    { key: "GeoIP", value: formatGeofilesRelease(info.geofiles_release), tag: info.geoip_status === "missing" ? { label: _("Missing"), kind: "warning" } : null },
    { key: "OS", value: info.openwrt_version || "" },
    { key: "Device", value: info.device_model || "" }
  ];

  var rendered = items.map(function(item) {
    var tagClasses = ["pdk_diagnostic-page__right-bar__system-info__row__tag"];
    if (item.tag && item.tag.kind === "warning") tagClasses.push("pdk_diagnostic-page__right-bar__system-info__row__tag--warning");
    if (item.tag && item.tag.kind === "success") tagClasses.push("pdk_diagnostic-page__right-bar__system-info__row__tag--success");
    return E("div", { class: "pdk_diagnostic-page__right-bar__system-info__row" }, [
      E("b", {}, item.key),
      E("div", {}, [
        E("span", {}, item.value),
        E("span", { class: tagClasses.join(" ") }, item.tag ? item.tag.label : "")
      ])
    ]);
  });

  var el = E("div", { class: "pdk_diagnostic-page__right-bar__system-info" }, [
    E("b", { class: "pdk_diagnostic-page__right-bar__system-info__title" }, _("System information"))
  ].concat(rendered));
  api.preserveScrollForPage(function() { container.replaceChildren(el); });
}

function fetchSystemInfo() {
  return shell.getSystemInfo().then(function(systemInfo) {
    if (systemInfo.success) {
      store.set({ diagnosticsSystemInfo: Object.assign({ loading: false }, systemInfo.data) });
    } else {
      store.set({
        diagnosticsSystemInfo: {
          loading: false, podkop_version: _("unknown"), podkop_latest_version: _("unknown"),
          luci_app_version: _("unknown"), xray_version: _("unknown"),
          geofiles_release: _("unknown"), geosite_status: _("unknown"), geoip_status: _("unknown"),
          openwrt_version: _("unknown"), device_model: _("unknown")
        }
      });
    }
  });
}

// Store listener
function onStoreUpdate(next, prev, diff) {
  if (diff.diagnosticsChecks) { renderChecksWidget(); renderWikiWidget(); }
  if (diff.diagnosticsRunAction) { renderRunActionWidget(); }
  if (diff.diagnosticsActions || diff.servicesInfoWidget) { renderActionsWidget(); }
  if (diff.diagnosticsSystemInfo) { renderSystemInfoWidget(); }
}

function onPageMount() {
  onPageUnmount();
  store.subscribe(onStoreUpdate);
  renderChecksWidget();
  renderRunActionWidget();
  renderActionsWidget();
  renderSystemInfoWidget();
  renderWikiWidget();
  api.fetchServicesInfo();
  fetchSystemInfo();
}

function onPageUnmount() {
  store.unsubscribe(onStoreUpdate);
  store.reset(["diagnosticsActions", "diagnosticsSystemInfo", "diagnosticsChecks", "diagnosticsRunAction"]);
}

return view.extend({
  render: function() {
    api.injectStyles();

    var pageEl = E("div", { id: "diagnostic-status", class: "pdk_diagnostic-page" }, [
      E("div", { class: "pdk_diagnostic-page__left-bar" }, [
        E("div", { id: "pdk_diagnostic-page-run-check" }),
        E("div", { class: "pdk_diagnostic-page__checks", id: "pdk_diagnostic-page-checks" })
      ]),
      E("div", { class: "pdk_diagnostic-page__right-bar" }, [
        E("div", { id: "pdk_diagnostic-page-wiki" }),
        E("div", { id: "pdk_diagnostic-page-actions" }),
        E("div", { id: "pdk_diagnostic-page-system-info" })
      ])
    ]);

    // Initialize after DOM is attached
    requestAnimationFrame(function() { onPageMount(); });

    return E("div", { class: "cbi-map" }, [
      E("h2", {}, _("Podkop Xray - Diagnostics")),
      pageEl
    ]);
  },

  handleSaveApply: null,
  handleSave: null,
  handleReset: null
});
