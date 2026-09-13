/**
 * The opening.
 *
 * It is no longer the home page's own flourish: it plays on every route and
 * every navigation, for three seconds. Four things matter more than how it
 * looks — it is there on arrival, it plays again when you move, it never
 * blocks a click or a link, and it disappears entirely for anyone who asked
 * for less motion.
 */

import { expect, test } from "@playwright/test";

const intro = "#site-intro";
/** 3s of animation plus room for a loaded machine. */
const RUN = 8000;

/**
 * These tests are slow by construction: every assertion that the curtain has
 * gone costs three seconds of real animation, and some of them walk the whole
 * route table. The default 30s per test is not enough for that, and shortening
 * the intro to suit the suite would be testing something other than the site.
 */
test.describe.configure({ timeout: 180_000 });

/** Every route the public site serves, in both languages. */
const ROUTES = ["", "/leaders", "/story", "/values", "/business", "/projects", "/careers", "/contact"];

test.describe("site intro — every page", () => {
  for (const locale of ["en", "ar"]) {
    test(`covers ${locale} on arrival and lifts away`, async ({ page }) => {
      for (const route of ROUTES) {
        const path = `/${locale}${route}`;
        await page.goto(path);

        // Exactly one. It lives in the layout, so a page cannot add a second.
        await expect(page.locator(intro), path).toHaveCount(1);
        // The mark is the site's own logo, not a copy made for the intro.
        await expect(page.locator(`${intro} img`), path).toBeVisible();
        // Gone within its own running time, and out of the paint tree with it.
        await expect(page.locator(intro), path).toBeHidden({ timeout: RUN });
      }
    });
  }

  test("it runs for three seconds", async ({ page }) => {
    await page.goto("/en/story");
    const timing = await page.locator(intro).evaluate((el) => {
      const curtain = getComputedStyle(el);
      const mark = getComputedStyle(el.firstElementChild!);
      return {
        curtain: curtain.animationDuration,
        mark: mark.animationDuration,
        iterations: curtain.animationIterationCount,
        fill: curtain.animationFillMode,
      };
    });
    expect(timing.curtain).toBe("3s");
    expect(timing.mark).toBe("3s");
    // Once, and it stays where it ended: nothing here can loop forever.
    expect(timing.iterations).toBe("1");
    expect(timing.fill).toBe("forwards");
  });
});

test.describe("site intro — navigation", () => {
  test("plays again on a header link", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.getByRole("navigation").getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/en\/projects$/);
    await expect(page.locator(`${intro} img`)).toBeVisible();
    await expect(page.locator(intro)).toHaveCount(1);
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });
  });

  test("plays again on a footer link", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.locator("footer").getByRole("link", { name: "Our Values" }).first().click();
    await expect(page).toHaveURL(/\/en\/values$/);
    await expect(page.locator(`${intro} img`)).toBeVisible();
  });

  test("plays again on browser back and forward", async ({ page }) => {
    await page.goto("/en/story");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.getByRole("navigation").getByRole("link", { name: "Contact Us" }).click();
    await expect(page).toHaveURL(/\/en\/contact$/);
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/story$/);
    await expect(page.locator(`${intro} img`)).toBeVisible();
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.goForward();
    await expect(page).toHaveURL(/\/en\/contact$/);
    await expect(page.locator(`${intro} img`)).toBeVisible();
  });

  test("plays again when the language changes", async ({ page }) => {
    await page.goto("/en/story");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.getByRole("button", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar\/story$/);
    await expect(page.locator(`${intro} img`)).toBeVisible();
    await expect(page.locator(intro)).toHaveCount(1);
  });

  test("a reload shows it again — nothing remembers it", async ({ page }) => {
    await page.goto("/en/values");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });
    await page.reload();
    await expect(page.locator(`${intro} img`)).toBeVisible();
  });

  /**
   * The bug this guards: keying the curtain on anything that changes inside a
   * page — state, a re-render, a filter — would replay it while the visitor is
   * standing still. It keys on the pathname and nothing else.
   */
  test("using the page does not start it over", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.getByRole("button", { name: "About Us" }).click();
    await expect(page.locator("#about-sublist-lg")).toBeVisible();
    await page.mouse.wheel(0, 1200);

    await expect(page.locator(intro)).toBeHidden();
  });
});

test.describe("site intro — it never gets in the way", () => {
  test("never swallows a click", async ({ page }) => {
    await page.goto("/en");
    const state = await page.locator(intro).evaluate((el) => ({
      pointerEvents: getComputedStyle(el).pointerEvents,
      ariaHidden: el.getAttribute("aria-hidden"),
      markPointerEvents: getComputedStyle(el.firstElementChild!).pointerEvents,
    }));
    expect(state.pointerEvents).toBe("none");
    expect(state.markPointerEvents).toBe("none");
    expect(state.ariaHidden).toBe("true");
  });

  test("a link still works while it is playing", async ({ page }) => {
    // No wait: the curtain is up over the header at this moment.
    await page.goto("/en");
    await expect(page.locator(`${intro} img`)).toBeVisible();
    await page.getByRole("navigation").getByRole("link", { name: "Careers" }).click();
    await expect(page).toHaveURL(/\/en\/careers$/);
  });

  test("white ground, navy mark", async ({ page }) => {
    await page.goto("/en/leaders");
    const background = await page
      .locator(intro)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe("rgb(255, 255, 255)");

    // The standard logo file, not the reversed one.
    const src = await page.locator(`${intro} img`).getAttribute("src");
    expect(src).not.toContain("white");
  });

  test("it is not shown to anyone who asked for less motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator(intro)).toBeHidden();

    // And navigation is simply instant for them, not broken.
    await page.getByRole("navigation").getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/en\/projects$/);
    await expect(page.locator(intro)).toBeHidden();
    await context.close();
  });

  test("the studio never shows it", async ({ page }) => {
    await page.goto("/en/studio/login");
    await expect(page.locator(intro)).toHaveCount(0);
  });

  test("the preview route never shows it", async ({ page }) => {
    await page.goto("/en/__preview/hero");
    await expect(page.locator(intro)).toHaveCount(0);
  });

  test("nothing is logged on the way through", async ({ page }) => {
    const noise: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") noise.push(m.text());
    });
    page.on("pageerror", (e) => noise.push(String(e)));

    await page.goto("/en");
    await page.getByRole("navigation").getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/en\/projects$/);
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    // Hydration mismatches and React key warnings both land here.
    const relevant = noise.filter((line) => !/WebGL|THREE|Download the React DevTools/i.test(line));
    expect(relevant, relevant.join("\n")).toEqual([]);
  });
});

test.describe("site intro — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("it plays on a phone, in both directions", async ({ page }) => {
    for (const path of ["/en", "/ar/projects"]) {
      await page.goto(path);
      await expect(page.locator(`${intro} img`), path).toBeVisible();
      await expect(page.locator(intro), path).toBeHidden({ timeout: RUN });
    }
  });

  test("plays again from the mobile menu", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(intro)).toBeHidden({ timeout: RUN });

    await page.getByRole("button", { name: /Open menu|Close menu/ }).click();
    // The drop panel is its own list beneath the capsule, not part of the nav
    // landmark — scope to the panel rather than to `navigation`.
    await page.locator("#site-menu").getByRole("link", { name: "Contact Us" }).click();
    await expect(page).toHaveURL(/\/en\/contact$/);
    await expect(page.locator(`${intro} img`)).toBeVisible();
  });
});
