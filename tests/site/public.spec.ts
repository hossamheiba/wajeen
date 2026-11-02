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

test.describe("the leadership portraits", () => {
  // The brief, as numbers: the photographs are large, they stand side by side,
  // and nothing sits between them but a gutter. "Large" is a share of the
  // section's width, not a pixel count, so it holds at every viewport.
  const cards = (page: import("@playwright/test").Page) =>
    page
      .locator("#leadership h3")
      .locator("xpath=ancestor::div[contains(@class,'group')][1]");

  const boxes = (page: import("@playwright/test").Page) =>
    cards(page).evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const box = node.getBoundingClientRect();
          const name = node.querySelector("h3")!.getBoundingClientRect();
          return {
            x: box.x,
            y: Math.round(box.y),
            width: box.width,
            height: box.height,
            nameInside:
              name.top >= box.top && name.bottom <= box.bottom && name.left >= box.left && name.right <= box.right,
          };
        })
        .sort((a, b) => a.y - b.y || a.x - b.x),
    );

  for (const locale of ["en", "ar"]) {
    test(`three large portraits stand side by side with only a gutter between them (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);

      const all = await boxes(page);
      const row = all.filter((box) => box.y === all[0].y);
      expect(row.length, "three people stand in a row").toBe(3);

      // The first row's portraits are the same size, so the row reads as one.
      for (const box of row) {
        expect(Math.abs(box.width - row[0].width), "equal widths").toBeLessThan(1.5);
        expect(Math.abs(box.height - row[0].height), "equal heights").toBeLessThan(1.5);
      }

      // Large: together they take at least nine tenths of the section's width.
      const section = await page.locator("#leadership .container-page").first().boundingBox();
      const covered = row.reduce((sum, box) => sum + box.width, 0);
      expect(covered / section!.width, "the portraits fill the width").toBeGreaterThan(0.9);
      expect(row[0].width, "each is a big photograph").toBeGreaterThan(380);

      // Adjacent: a gutter of a few pixels, never an overlap and never a gap.
      for (let i = 0; i < 2; i += 1) {
        const gap = row[i + 1].x - (row[i].x + row[i].width);
        expect(gap, `gutter ${i + 1}`).toBeGreaterThanOrEqual(0);
        expect(gap, `gutter ${i + 1}`).toBeLessThanOrEqual(32);
      }

      // The name is set into the photograph, not under it.
      for (const box of row) expect(box.nameInside, "name sits on the photograph").toBe(true);
    });

    test(`on a phone they stack, full width, with no sideways scroll (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/leaders`);
      const all = await boxes(page);
      expect(new Set(all.map((box) => box.x)).size, "one column").toBe(1);
      // Full width of the page's own gutters: 390px less 24px each side.
      expect(all[0].width, "full width of the content column").toBeGreaterThan(330);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, "no horizontal scroll").toBe(false);
    });
  }
});
