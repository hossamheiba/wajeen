/**
 * The "About Us" sub-list.
 *
 * Its entries have no pages behind them yet, so they are shown rather than
 * linked. That is the thing worth testing: a visitor sees them, a keyboard
 * reaches the control, and nothing pretends to be a destination.
 */

import { expect, test } from "@playwright/test";

const ENTRIES = {
  en: ["Page 1", "Page 2", "Page 3"],
  ar: ["صفحة 1", "صفحة 2", "صفحة 3"],
};

test.describe("About sub-list — desktop", () => {
  test("opens on hover, the way a pointer expects", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("navigation").getByRole("link", { name: "About Us" }).hover();
    await expect(page.locator("#about-sublist-lg")).toBeVisible();
  });

  test("a press does not cancel what hover opened", async ({ page }) => {
    // The bug this guards: one shared flag meant moving the pointer onto the
    // control opened the panel and the click that followed closed it again.
    await page.goto("/en");
    const toggle = page.getByRole("button", { name: "About Us" });
    await toggle.hover();
    await expect(page.locator("#about-sublist-lg")).toBeVisible();
    await toggle.click();
    await expect(page.locator("#about-sublist-lg")).toBeVisible();
  });

  test("opens on click and lists three entries", async ({ page }) => {
    await page.goto("/en");
    const toggle = page.getByRole("button", { name: "About Us" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = page.locator("#about-sublist-lg");
    await expect(panel).toBeVisible();
    for (const entry of ENTRIES.en) {
      await expect(panel.getByText(entry, { exact: true })).toBeVisible();
    }
  });

  test("the entries are not links", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "About Us" }).click();
    await expect(page.locator("#about-sublist-lg a")).toHaveCount(0);
  });

  test("About Us itself still goes to the About page", async ({ page }) => {
    await page.goto("/en");
    // The footer links to /about too, so scope this to the header's nav.
    await page.getByRole("navigation").getByRole("link", { name: "About Us" }).click();
    await expect(page).toHaveURL(/\/en\/about$/);
  });

  test("Escape closes it and returns focus to the control", async ({ page }) => {
    await page.goto("/en");
    const toggle = page.getByRole("button", { name: "About Us" });
    await toggle.click();
    await expect(page.locator("#about-sublist-lg")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#about-sublist-lg")).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test("it is reachable and operable from the keyboard alone", async ({ page }) => {
    await page.goto("/en");
    const toggle = page.getByRole("button", { name: "About Us" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#about-sublist-lg")).toBeVisible();
  });

  test("arabic shows the arabic entries", async ({ page }) => {
    await page.goto("/ar");
    await page.getByRole("button", { name: "من نحن" }).click();
    const panel = page.locator("#about-sublist-lg");
    for (const entry of ENTRIES.ar) {
      await expect(panel.getByText(entry, { exact: true })).toBeVisible();
    }
  });
});

test.describe("About sub-list — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("expands inside the drop panel", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /Open menu|Close menu/ }).click();

    const toggle = page.getByRole("button", { name: "About Us" });
    await toggle.click();

    const panel = page.locator("#about-sublist-sm");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Page 1", { exact: true })).toBeVisible();
    await expect(panel.locator("a")).toHaveCount(0);
  });
});
