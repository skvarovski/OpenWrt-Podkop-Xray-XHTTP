"use strict";
const { defineConfig } = require("@playwright/test");

// Router under test. Override via env: ROUTER_URL, LUCI_USER, LUCI_PASS.
const ROUTER_URL = process.env.ROUTER_URL || "http://192.168.90.5";

module.exports = defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: [["list"]],
  globalSetup: "./global-setup.js",
  use: {
    baseURL: ROUTER_URL,
    channel: "chrome",
    headless: true,
    ignoreHTTPSErrors: true,
    storageState: "auth.json",
    actionTimeout: 15000,
    trace: "retain-on-failure",
  },
});
