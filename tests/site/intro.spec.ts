/**
 * The opening.
 *
 * Three things matter more than how it looks: it runs every time the home page
 * is entered, it never blocks a click, and it disappears entirely for anyone
 * who asked for less motion.
 */

import { expect, test } from "@playwright/test";

test.describe("site intro", () => {
  test("covers the home page, then lifts away", async ({ page }) => {
    await page.goto("/en");
    const intro = page.locator("#site-intro");

    await expect(intro).toBeAttached();
    // The mark is the site's own logo, not a copy made for the intro.
    await expect(intro.locator("img")).toBeVisible();

    // Gone within its own running time, and out of the paint tree with it.
    await expect(intro).toBeHidden({ timeout: 4000 });
  });

  test("runs again on every visit to the home page", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("#site-intro")).toBeHidden({ timeout: 4000 });

    // A reload shows it again — nothing remembers it.
    await page.reload();
    await expect(page.locator("#site-intro").locator("img")).toBeVisible();

    // And so does coming back from another page.
    await page.goto("/en/about");
    await page.goto("/en");
    await expect(page.locator("#site-intro").locator("img")).toBeVisible();
  });

  test("only the home page has it", async ({ page }) => {
    for (const route of ["/en/about", "/en/projects", "/en/contact", "/ar/careers"]) {
      await page.goto(route);
      await expect(page.locator("#site-intro"), route).toHaveCount(0);
    }
  });

  test("white ground, navy mark", async ({ page }) => {
    await page.goto("/en");
    const background = await page
      .locator("#site-intro")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe("rgb(255, 255, 255)");

    // The standard logo file, not the reversed one.
    const src = await page.locator("#site-intro img").getAttribute("src");
    expect(src).not.toContain("white");
  });

  test("never swallows a click", async ({ page }) => {
    await page.goto("/en");
    const state = await page.locator("#site-intro").evaluate((el) => ({
      pointerEvents: getComputedStyle(el).pointerEvents,
      ariaHidden: el.getAttribute("aria-hidden"),
    }));
    expect(state.pointerEvents).toBe("none");
    expect(state.ariaHidden).toBe("true");
  });

  test("it is not shown to anyone who asked for less motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator("#site-intro")).toBeHidden();
    await context.close();
  });

  test("the studio never shows it", async ({ page }) => {
    await page.goto("/en/studio/login");
    await expect(page.locator("#site-intro")).toHaveCount(0);
  });
});
