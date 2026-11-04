/**
 * The public site's own gates.
 *
 * These never existed as committed tests — QA-PLAN.md recorded axe and
 * Lighthouse as commands somebody ran by hand. Stage 3C adds a proxy and a new
 * route tree beside the site, so "the public pages still behave" needs to be
 * something a machine can answer, not a memory.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["", "/leaders", "/story", "/values", "/business", "/careers", "/contact"];
const PAGES = ["en", "ar"].flatMap((locale) =>
  ROUTES.map((route) => ({ locale, path: `/${locale}${route}` })),
);

const VIEWPORTS = [
  { name: "small phone", width: 360, height: 740 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

// wcag22aa is included on purpose: it is what brings `target-size` in.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

test.describe("Gate 5 — accessibility", () => {
  for (const { path } of PAGES) {
    test(`axe finds no violations on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

      const summary = violations.map(
        (violation) =>
          `${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes[0]?.target}`,
      );
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
});

test.describe("Gate 6 — RTL / LTR", () => {
  test("english renders left to right", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("arabic renders right to left", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("every arabic page keeps its direction", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(`/ar${route}`);
      await expect(page.locator("html"), `/ar${route}`).toHaveAttribute("dir", "rtl");
    }
  });

  test("the studio follows the document direction", async ({ page }) => {
    // No hardcoded direction any more: Arabic editors get an Arabic layout.
    await page.goto("/ar/studio/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.goto("/en/studio/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});

test.describe("Gate 7 — no horizontal scroll", () => {
  for (const viewport of VIEWPORTS) {
    test(`nothing overflows at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const { path } of PAGES) {
        await page.goto(path, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => {
          const root = document.scrollingElement ?? document.documentElement;
          return { scroll: root.scrollWidth, client: root.clientWidth };
        });
        // One pixel of slack for sub-pixel layout rounding.
        expect(
          overflow.scroll,
          `${path} overflows by ${overflow.scroll - overflow.client}px`,
        ).toBeLessThanOrEqual(overflow.client + 1);
      }
    });
  }
});

test.describe("Gate 4 — the public site still reads local JSON", () => {
  test("pages render real content with the CMS API unreachable", async ({ page }) => {
    // Anything the site tried to fetch from Django would fail here. It should
    // not try: src/i18n/request.ts still imports the repository messages.
    await page.route("http://localhost:8001/**", (route) => route.abort());

    await page.goto("/en/story");
    // The section's own heading, which is the page's h1 since the client
    // removed the banner title that repeated the About header.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Founded in 2008, Building Across the Kingdom",
    );

    await page.goto("/ar/story");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("no page quotes a price", async ({ page }) => {
    // Contract values were taken off the site deliberately. Years, counts,
    // areas, phone numbers and registration numbers are not prices and stay.
    const money = /SAR\s*[\d,.]|ريال|\bمليون\b|\$\s*[\d,]/;
    for (const locale of ["en", "ar"]) {
      for (const route of ROUTES) {
        await page.goto(`/${locale}${route}`);
        const text = await page.locator("body").innerText();
        const hit = text.split("\n").find((line) => money.test(line));
        expect(hit, `${locale}${route} still quotes a price: ${hit}`).toBeUndefined();
      }
    }
  });

  test("the public pages are not marked noindex", async ({ page }) => {
    const response = await page.goto("/en/story");
    expect(response!.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
  });

  test("the preview route is noindex and frameable only by us", async ({ page }) => {
    const response = await page.goto("/en/__preview/hero");
    expect(response!.headers()["x-robots-tag"]).toContain("noindex");
    expect(response!.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  });
});

test.describe("the leadership", () => {
  // What the section is, as numbers: a slider of tall portraits of one size, side by
  // side; no text on a photograph; and a white panel with the name and role that
  // slides up from beneath each portrait when it is pointed at (and is simply shown
  // where there is nothing to point with).
  const cards = (page: import("@playwright/test").Page) =>
    page.locator("#leadership li").evaluateAll((nodes) =>
      nodes.map((node) => {
        const card = node.getBoundingClientRect();
        const panel = node.querySelector("figcaption")!.getBoundingClientRect();
        return {
          x: Math.round(card.x),
          right: Math.round(card.right),
          y: Math.round(card.y),
          width: card.width,
          height: card.height,
          bottom: card.bottom,
          panelTop: panel.top,
          panelBottom: panel.bottom,
          panelHeight: panel.height,
        };
      }),
    );
  const track = (page: import("@playwright/test").Page) =>
    page.locator("#leadership ul").evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { x: Math.round(box.x), right: Math.round(box.right), width: box.width, scrollLeft: node.scrollLeft };
    });

  for (const locale of ["en", "ar"]) {
    test(`portraits of one size stand side by side, the first at the start edge (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      const all = await cards(page);
      const row = await track(page);
      // The e2e content lists more people than fit, so the slider is in play.
      expect(all.length).toBeGreaterThan(4);
      expect(new Set(all.map((c) => c.y)).size, "one row").toBe(1);
      for (const c of all.slice(0, 4)) {
        expect(Math.abs(c.width - all[0].width), "one width").toBeLessThan(1.5);
        expect(Math.abs(c.width / row.width - 0.28), "a little over a quarter of the row").toBeLessThan(0.012);
        expect(Math.abs(c.height / c.width - 408 / 299), "the reference's proportions").toBeLessThan(0.02);
      }
      const edge = locale === "ar" ? all[0].right - row.right : all[0].x - row.x;
      expect(Math.abs(edge), "the first portrait is flush with the start edge").toBeLessThan(2);
      expect(locale === "ar" ? all[1].x < all[0].x : all[1].x > all[0].x, "the next follows it along the row").toBe(true);
    });

    test(`the arrows move the slider by one portrait (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      // The arrows point the way the page reads, so "onward" is the left in Arabic.
      const onward = page.getByRole("button", { name: locale === "ar" ? "←" : "→" });
      const back = page.getByRole("button", { name: locale === "ar" ? "→" : "←" });
      await expect(onward).toBeEnabled();
      await expect(back, "nothing before the first").toBeDisabled();
      const before = (await cards(page))[0].x;
      await onward.click();
      await expect
        .poll(async () => Math.abs((await cards(page))[0].x - before), { timeout: 3000 })
        .toBeGreaterThan(280);
      await expect(back).toBeEnabled();
    });
  }

  test("the name and role wait below the portrait and rise over its foot on pointing", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const before = (await cards(page))[0];
    expect(before.panelTop, "at rest the panel is clipped away below the picture").toBeGreaterThanOrEqual(before.bottom - 1);

    await page.locator("#leadership li").first().hover();
    await page.waitForTimeout(700);
    const after = (await cards(page))[0];
    expect(Math.abs(after.panelBottom - after.bottom), "it comes to rest on the portrait's bottom edge").toBeLessThan(1.5);
    expect(after.panelHeight, "tall enough for a name and a role").toBeGreaterThan(70);
    expect(after.panelTop, "and lies over the picture's foot").toBeLessThan(after.bottom - 70);
    // Its neighbour has not moved.
    expect((await cards(page))[1].panelTop).toBeGreaterThanOrEqual(after.bottom - 1);
  });

  test("keyboard focus raises it too", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    await page.locator("#leadership li figure").nth(1).focus();
    await page.waitForTimeout(700);
    const second = (await cards(page))[1];
    expect(second.panelTop).toBeLessThan(second.bottom - 70);
  });

  test("where there is nothing to point with, the panel is always shown", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/en/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const first = (await cards(page))[0];
    expect(Math.abs(first.panelBottom - first.bottom)).toBeLessThan(1.5);
    expect(first.panelHeight).toBeGreaterThan(60);
    await context.close();
  });

  test("on a phone a portrait nearly fills the row and the next one peeks in", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/en/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    const all = await cards(page);
    const row = await track(page);
    expect(Math.abs(all[0].width / row.width - 0.86), "about six sevenths of the row").toBeLessThan(0.02);
    expect(all[1].x, "the second begins inside the screen").toBeLessThan(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), "no horizontal page scroll").toBe(false);
    await context.close();
  });

  test("only the heading sits above the portraits", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar/leaders");
    await expect(page.locator("#leadership h1 ~ p"), "no paragraph after the heading").toHaveCount(0);
    await expect(page.locator("#leadership")).not.toContainText("يقود وجين فريق");
    await expect(page.locator("#leadership")).not.toContainText("فريق القيادة");
  });

  test("the section is light, and its heading is not heavy", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    const section = await page.locator("#leadership").evaluate((n) => getComputedStyle(n).backgroundColor);
    expect(section, "the site's off-white").toBe("rgb(247, 248, 252)");
    const weight = await page.locator("#leadership h1").evaluate((n) => getComputedStyle(n).fontWeight);
    expect(weight, "a regular weight").toBe("400");
  });

  test("Arabic is not letter-spaced or uppercased", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar/leaders");
    const styles = await page
      .locator("#leadership strong, #leadership figcaption span, #leadership h1, #leadership h2, #leadership p")
      .evaluateAll((nodes) => nodes.map((n) => ({ spacing: getComputedStyle(n).letterSpacing, transform: getComputedStyle(n).textTransform })));
    for (const style of styles) {
      expect(["normal", "0px"]).toContain(style.spacing);
      expect(style.transform).toBe("none");
    }
  });

  test("a reader who asked for less motion has the finished page at once, and the page is not rebuilt", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto("/en/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    const opacity = await page.locator("#leadership li").first().evaluate((n) => getComputedStyle(n).opacity);
    expect(opacity, "visible without waiting for an animation").toBe("1");
    expect(errors.filter((e) => /hydrat/i.test(e)), "no hydration failure").toEqual([]);
    await context.close();
  });
});
