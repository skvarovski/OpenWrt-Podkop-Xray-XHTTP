"use strict";
// E2E: luci-app-podkop-xray Diagnostics page.
// Covers the bugs fixed in this branch:
//   * Run Diagnostic must run ALL 5 checks (no chain abort on a failing check).
//   * System information must show the Podkop-Xray version and geo-files dates.
const { test, expect } = require("@playwright/test");

const DIAG_PATH = "/cgi-bin/luci/admin/services/podkop-xray/diagnostics";

// A check row is terminal once it carries a success/warning/error state class.
// Non-terminal = loading (in progress) or skipped (never started).
const NON_TERMINAL = ".pdk_diagnostic_alert--loading, .pdk_diagnostic_alert--skipped";
const CHECK_TITLES = ["DNS", "Xray", "Nftables", "Proxy", "FakeIP"];

async function openDiagnostics(page) {
  await page.goto(DIAG_PATH);
  await expect(page.getByRole("heading", { name: /Diagnostics/i })).toBeVisible();
  await expect(page.locator(".pdk_diagnostic_alert")).toHaveCount(5);
}

async function runDiagnostic(page) {
  await page.getByRole("button", { name: "Run Diagnostic" }).click();
  // Poll until every check reached a terminal state.
  await expect(page.locator(NON_TERMINAL)).toHaveCount(0, { timeout: 75000 });
}

test.describe("Diagnostics page", () => {
  test.beforeEach(async ({ page }) => {
    await openDiagnostics(page);
  });

  test("renders all five check rows", async ({ page }) => {
    for (const title of CHECK_TITLES) {
      await expect(
        page.locator(".pdk_diagnostic_alert__title", { hasText: title })
      ).toHaveCount(1);
    }
  });

  test("Run Diagnostic completes all five checks (no chain abort)", async ({ page }) => {
    await runDiagnostic(page);

    // Regression guard: before the fix a failing check threw and aborted the
    // chain, leaving later checks stuck on "skipped". All five must be terminal.
    await expect(page.locator(".pdk_diagnostic_alert")).toHaveCount(5);
    await expect(page.locator(NON_TERMINAL)).toHaveCount(0);
    await expect(
      page.locator(
        ".pdk_diagnostic_alert--success, .pdk_diagnostic_alert--warning, .pdk_diagnostic_alert--error"
      )
    ).toHaveCount(5);
  });

  test("System information shows version and geo-files dates", async ({ page }) => {
    const info = page.locator(".pdk_diagnostic-page__right-bar__system-info");
    await expect(info).toBeVisible();

    const rowValue = (key) =>
      info
        .locator(".pdk_diagnostic-page__right-bar__system-info__row", { hasText: key })
        .locator("span")
        .first();

    // Values populate asynchronously via get_system_info; assertions retry
    // until the "loading" placeholder is replaced.

    // Backend key is podkop_version (was podkop_xray_version — mismatch fixed).
    // Expect a non-empty value that is not the "loading" placeholder.
    await expect(rowValue("Podkop-Xray")).toHaveText(/^(?!loading$).+$/);

    // geofiles_release renders as "YYYY-MM-DD HH:MM" (mtime fallback ensures
    // a date even when the GitHub release-tag file is absent).
    const dateRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    await expect(rowValue("Geosite")).toHaveText(dateRe);
    await expect(rowValue("GeoIP")).toHaveText(dateRe);
  });
});
