"use strict";
// E2E: Diagnostics resilience — when xray is DOWN the Run Diagnostic chain must
// still run every check. Before the fix, runXrayCheck threw on a stopped xray
// and aborted the chain, leaving NFT/Proxy/FakeIP stuck on "skipped".
//
// This spec is intentionally invasive: it stops podkop-xray, runs the
// diagnostic, then restarts the service. It restores state in afterAll.
const { test, expect, chromium } = require("@playwright/test");

const DIAG_PATH = "/cgi-bin/luci/admin/services/podkop-xray/diagnostics";
const NON_TERMINAL = ".pdk_diagnostic_alert--loading, .pdk_diagnostic_alert--skipped";

const xrayRow = (page) =>
  page.locator(".pdk_diagnostic_alert", {
    has: page.locator(".pdk_diagnostic_alert__title", { hasText: "Xray" }),
  });

test.describe.serial("Diagnostics resilience with xray stopped", () => {
  test.afterAll(async () => {
    // Safety net: make sure podkop-xray is running again regardless of outcome.
    const browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      storageState: "auth.json",
    });
    try {
      await page.goto(DIAG_PATH);
      const restart = page.getByRole("button", { name: "Restart podkop-xray" });
      if (await restart.isVisible().catch(() => false)) {
        await restart.click();
        await expect(
          page.getByRole("button", { name: "Stop podkop-xray" })
        ).toBeVisible({ timeout: 60000 });
      }
    } finally {
      await browser.close();
    }
  });

  test("all five checks run even when xray is stopped", async ({ page }) => {
    await page.goto(DIAG_PATH);
    await expect(page.locator(".pdk_diagnostic_alert")).toHaveCount(5);

    // Stop the service; the action widget flips to "Start podkop-xray".
    await page.getByRole("button", { name: "Stop podkop-xray" }).click();
    await expect(
      page.getByRole("button", { name: "Start podkop-xray", exact: true })
    ).toBeVisible({ timeout: 60000 });

    // The stop action ends with an async store.reset(["diagnosticsChecks"]).
    // Wait for it to settle so it cannot wipe the run we are about to start.
    await page.waitForLoadState("networkidle");

    // Run diagnostic with xray down.
    await page.getByRole("button", { name: "Run Diagnostic" }).click();
    await expect(page.locator(NON_TERMINAL)).toHaveCount(0, { timeout: 75000 });

    // The whole point: every check reached a terminal state — the chain did
    // not abort on the failing Xray check.
    await expect(page.locator(".pdk_diagnostic_alert")).toHaveCount(5);
    // With the service stopped the Xray check is non-passing (warning or
    // error — xray_installed/service_exist stay 1, so meta is "warning").
    await expect(xrayRow(page)).toHaveClass(/pdk_diagnostic_alert--(error|warning)/);

    // Restore the service.
    await page.getByRole("button", { name: "Start podkop-xray", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Stop podkop-xray" })
    ).toBeVisible({ timeout: 60000 });
  });
});
