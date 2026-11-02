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

test.describe("the leadership portraits' frame", () => {
  // The frame is drawn around a head that may reach the crown of the arch, so
  // the keystone must not sit on the photograph. Measured, not eyeballed: the
  // diamond is centred on the outline, and its 2px white ring is a box-shadow
  // that a bounding box does not include — on a square turned 45 degrees it
  // reaches 2 x sqrt(2) further than the box does, so that is added back.
  const RING = 2 * Math.SQRT2;
  const CLEAR = 3; // px of air required between ring and photograph

  for (const locale of ["en", "ar"]) {
    test(`everyone has the outline and the keystone, and neither touches the photograph (${locale})`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/leaders`);
      const rows = page.locator("#leadership h3").locator("xpath=ancestor::div[contains(@class,'group')][1]");
      const people = await rows.count();
      expect(people, "the page lists the leadership").toBeGreaterThan(1);

      // One outline and one keystone per person: nobody is drawn bare. A
      // person once was, on request; the request was withdrawn, and this is
      // what stops a leftover exception from surviving unnoticed.
      await expect(page.locator("#leadership [data-portrait-outline]")).toHaveCount(people);
      await expect(page.locator("#leadership [data-portrait-keystone]")).toHaveCount(people);

      const gap = (row: ReturnType<typeof rows.nth>) =>
        row.evaluate((element, ring) => {
          const photo = element.querySelector(".aspect-\\[4\\/5\\]")!.getBoundingClientRect();
          const key = element.querySelector("[data-portrait-keystone]")!.getBoundingClientRect();
          return photo.top - (key.bottom + ring);
        }, RING);

      for (let index = 0; index < people; index += 1) {
        const row = rows.nth(index);
        await row.scrollIntoViewIfNeeded();

        await page.mouse.move(0, 0);
        await page.waitForTimeout(650); // the outline's own 500ms transition
        expect(await gap(row), `row ${index + 1} at rest`).toBeGreaterThanOrEqual(CLEAR);

        await row.hover();
        await page.waitForTimeout(650);
        expect(await gap(row), `row ${index + 1} on hover`).toBeGreaterThanOrEqual(CLEAR);
      }
    });
  }
});

test.describe("the leadership columns", () => {
  // `divide-x` draws its line on the inline-end side of every column but the
  // last, which already flips by itself in right-to-left. Adding
  // `divide-x-reverse` for Arabic moved the lines to the wrong side: one stood
  // on the outer edge, next to the section's own border, and the gap between
  // the second and third columns had none. A screenshot of three people does
  // not show that unless somebody looks at the hairlines, so this measures them.
  for (const locale of ["en", "ar"]) {
    test(`three side by side, with a line between neighbours and none on the outer edges (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}/leaders`);
      const columns = await page
        .locator("#leadership h3")
        .locator("xpath=ancestor::div[contains(@class,'group')][1]")
        .evaluateAll((nodes) =>
          nodes
            .map((node) => {
              const box = node.getBoundingClientRect();
              const style = getComputedStyle(node);
              return {
                x: box.x,
                y: Math.round(box.y),
                left: parseFloat(style.borderLeftWidth),
                right: parseFloat(style.borderRightWidth),
              };
            })
            .sort((a, b) => a.y - b.y || a.x - b.x),
        );

      // The first row — the e2e content has more than three people, so the
      // test looks at one row, which is what the page shows to a visitor too.
      const row = columns.filter((column) => column.y === columns[0].y);
      expect(row.length, "three people stand in a row").toBe(3);

      expect(row[0].left, "no line on the outer left edge").toBe(0);
      expect(row[2].right, "no line on the outer right edge").toBe(0);
      for (let i = 0; i < 2; i += 1) {
        const between = row[i].right + row[i + 1].left;
        expect(between, `a line between column ${i + 1} and ${i + 2}`).toBeGreaterThan(0);
      }
    });
  }
});
