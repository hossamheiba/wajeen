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

  test("it hangs below the capsule instead of being clipped inside it", async ({
    page,
  }) => {
    /**
     * The bug this guards. The panel was rendered inside the capsule, and the
     * capsule is `overflow-hidden` — it has to be, because that is what clips
     * the links while its width animates. So the panel was cut away entirely
     * and nothing appeared, while a visibility assertion still passed: a
     * bounding box does not know about an ancestor's overflow.
     */
    await page.goto("/en");
    await page.getByRole("navigation").getByRole("link", { name: "About Us" }).hover();

    const panel = page.locator("#about-sublist-lg");
    await expect(panel).toBeVisible();

    const panelBox = (await panel.boundingBox())!;
    const capsuleBox = (await page.locator("header nav").boundingBox())!;

    expect(panelBox.height, "the panel has real height").toBeGreaterThan(60);
    expect(
      panelBox.y,
      "the panel must start below the capsule, not inside it",
    ).toBeGreaterThan(capsuleBox.y + capsuleBox.height - 8);

    // And it is genuinely painted, not merely laid out somewhere.
    const painted = await panel.evaluate((el) => {
      const seen = document.elementFromPoint(
        el.getBoundingClientRect().left + 20,
        el.getBoundingClientRect().top + 20,
      );
      return el.contains(seen);
    });
    expect(painted, "something else is covering the panel").toBe(true);
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

  /**
   * The panel hangs from the item's *inline start* — its left edge in English,
   * its right edge in Arabic. Pinning `left` in both directions was the bug:
   * in Arabic the panel ran away from the item instead of lining up under it,
   * and nothing in the suite noticed because "visible" says nothing about
   * "in the right place".
   */
  for (const [locale, label] of [
    ["en", "About Us"],
    ["ar", "من نحن"],
  ] as const) {
    for (const width of [1280, 1440, 1680]) {
      test(`lines up under About in ${locale} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}`);

        const link = page.getByRole("navigation").getByRole("link", { name: label });
        await link.hover();

        const panel = page.locator("#about-sublist-lg");
        await expect(panel).toBeVisible();

        const panelBox = (await panel.boundingBox())!;
        const linkBox = (await link.boundingBox())!;
        const rtl = locale === "ar";

        const panelStart = rtl ? panelBox.x + panelBox.width : panelBox.x;
        const linkStart = rtl ? linkBox.x + linkBox.width : linkBox.x;

        expect(
          Math.abs(panelStart - linkStart),
          `panel should hang from the item's ${rtl ? "right" : "left"} edge`,
        ).toBeLessThanOrEqual(24);

        // And it must not run off the side of the screen doing it.
        expect(panelBox.x, "panel starts off-screen").toBeGreaterThanOrEqual(-1);
        expect(
          panelBox.x + panelBox.width,
          "panel runs past the viewport",
        ).toBeLessThanOrEqual(width + 1);
      });
    }
  }

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
