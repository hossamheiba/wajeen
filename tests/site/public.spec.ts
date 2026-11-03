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

test.describe("the leadership panels", () => {
  // What the section is, as numbers: people stand side by side as tall panels,
  // the name sits below the photograph with a divider between, and nothing is
  // written on a photograph.
  const figures = (page: import("@playwright/test").Page) =>
    page.locator("#leadership figure").evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const figure = node.getBoundingClientRect();
          const caption = node.querySelector("figcaption")!.getBoundingClientRect();
          const name = node.querySelector("h3")!;
          const divider = node.querySelector("figcaption [aria-hidden='true']")!.getBoundingClientRect();
          return {
            x: Math.round(figure.x),
            y: Math.round(figure.y),
            width: figure.width,
            photoBottom: caption.top,
            nameTop: name.getBoundingClientRect().top,
            nameFontPx: parseFloat(getComputedStyle(name).fontSize),
            dividerTop: divider.top,
            dividerBottom: divider.bottom,
          };
        })
        .sort((a, b) => a.y - b.y || a.x - b.x),
    );

  for (const locale of ["en", "ar"]) {
    test(`three panels stand in a row, equal, with the name below a divider (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      const all = await figures(page);
      const row = all.filter((entry) => Math.abs(entry.y - all[0].y) < 2);
      expect(row.length, "three people stand in a row").toBe(3);

      for (const entry of row) {
        expect(Math.abs(entry.width - row[0].width), "equal widths at rest").toBeLessThan(1.5);
        expect(entry.width, "each is a big panel").toBeGreaterThan(380);
        expect(entry.nameTop, "name below the photograph").toBeGreaterThanOrEqual(entry.photoBottom);
        expect(entry.dividerTop, "divider below the photograph").toBeGreaterThanOrEqual(entry.photoBottom);
        expect(entry.dividerBottom, "divider above the name").toBeLessThanOrEqual(entry.nameTop);
        expect(entry.nameFontPx, "a quiet name").toBeLessThanOrEqual(20);
      }

      // Together they fill the section's width, with a gutter of a few pixels.
      const section = await page.locator("#leadership .container-page").first().boundingBox();
      const covered = row.reduce((sum, entry) => sum + entry.width, 0);
      expect(covered / section!.width, "the panels fill the width").toBeGreaterThan(0.9);
      for (let i = 0; i < 2; i += 1) {
        const [a, b] = [row[i], row[i + 1]].sort((p, q) => p.x - q.x);
        const gap = b.x - (a.x + a.width);
        expect(gap, `gutter ${i + 1}`).toBeGreaterThanOrEqual(0);
        expect(gap, `gutter ${i + 1}`).toBeLessThanOrEqual(32);
      }
    });

    test(`people beyond three continue on the same columns (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      const all = await figures(page);
      // The e2e content lists more than three people.
      expect(all.length).toBeGreaterThan(3);
      expect(all[3].x, "the fourth stands under the first").toBe(all[0].x);
      expect(all[3].y, "...in a row below").toBeGreaterThan(all[0].y + 200);
      // A short last row keeps each panel at a third of the width.
      const last = all.filter((entry) => entry.y === all[all.length - 1].y);
      if (last.length < 3) expect(Math.abs(last[0].width - all[0].width)).toBeLessThan(2);
    });

    test(`on a phone they stack at full width with no sideways scroll (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/leaders`);
      const all = await figures(page);
      expect(new Set(all.map((entry) => entry.x)).size, "one column").toBe(1);
      expect(all[0].width, "the page's own gutters either side of 390px").toBeGreaterThan(330);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, "no horizontal scroll").toBe(false);
    });
  }

  test("pointing at a panel widens it and its neighbours give way", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    const panels = page.locator("#leadership figure");
    await panels.first().scrollIntoViewIfNeeded();
    const before = await panels.evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width));
    await panels.nth(1).hover();
    await page.waitForTimeout(1100);
    const after = await panels.evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width));
    expect(after[1], "the pointed-at panel grows").toBeGreaterThan(before[1] + 40);
    expect(after[0], "its neighbour gives way").toBeLessThan(before[0]);
  });

  test("Arabic is not letter-spaced or uppercased", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar/leaders");
    const styles = await page
      .locator("#leadership figcaption h3, #leadership figcaption p, #leadership header p, #leadership h1, #leadership h2")
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
    const opacity = await page.locator("#leadership figure").first().evaluate((n) => getComputedStyle(n).opacity);
    expect(opacity, "visible without waiting for an animation").toBe("1");
    expect(errors.filter((e) => /hydrat/i.test(e)), "no hydration failure").toEqual([]);
    await context.close();
  });
});
