"use strict";
// Logs into LuCI once and persists the session cookie to auth.json,
// so every spec starts already authenticated.
const { chromium } = require("@playwright/test");

const ROUTER_URL = process.env.ROUTER_URL || "http://192.168.90.5";
const LUCI_PASS = process.env.LUCI_PASS || "12345678";

module.exports = async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto(`${ROUTER_URL}/cgi-bin/luci/`);

  // LuCI login form: a single password field + submit. Username (root)
  // is pre-filled. Target by input type so it works in any UI language.
  const pass = page.locator('input[type="password"]');
  await pass.waitFor({ state: "visible" });
  await pass.fill(LUCI_PASS);
  await pass.press("Enter");

  // After login LuCI redirects to the overview page.
  await page.waitForURL(/cgi-bin\/luci/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");

  await page.context().storageState({ path: "auth.json" });
  await browser.close();
};
