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
  // What the section is, as numbers: the chairman alone in the middle, the two who
  // answer to him side by side beneath and balanced about the same centre, modest
  // portraits with a slight radius, the name below each photograph with a divider
  // between, nothing written on a photograph — and one line joining them.
  const people = (page: import("@playwright/test").Page) =>
    page.locator("#leadership figure").evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const figure = node.getBoundingClientRect();
          const frame = node.querySelector("div.relative") as HTMLElement;
          const photo = frame.getBoundingClientRect();
          const caption = node.querySelector("figcaption")!.getBoundingClientRect();
          const name = node.querySelector("h3")!;
          const divider = node.querySelector("figcaption [aria-hidden='true']")!.getBoundingClientRect();
          return {
            cx: figure.x + figure.width / 2,
            y: Math.round(figure.y),
            photoWidth: photo.width,
            photoBottom: photo.bottom,
            photoTop: photo.top,
            captionTop: caption.top,
            nameTop: name.getBoundingClientRect().top,
            nameFontPx: parseFloat(getComputedStyle(name).fontSize),
            dividerTop: divider.top,
            dividerBottom: divider.bottom,
            radius: parseFloat(getComputedStyle(frame.firstElementChild as HTMLElement).borderTopLeftRadius),
          };
        })
        .sort((a, b) => a.y - b.y || a.cx - b.cx),
    );

  for (const locale of ["en", "ar"]) {
    test(`the chairman is alone in the middle, the two beneath him balanced (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      const all = await people(page);
      const [chair, a, b] = all;

      expect(Math.abs(chair.cx - 720), "the chairman is in the middle").toBeLessThan(3);
      expect(a.y, "the two are beneath him").toBeGreaterThan(chair.y + 400);
      expect(Math.abs(a.y - b.y), "on one row").toBeLessThan(2);
      expect(Math.abs((a.cx + b.cx) / 2 - 720), "balanced about the same centre").toBeLessThan(3);
      expect(Math.abs(a.photoWidth - b.photoWidth), "equal in size").toBeLessThan(1.5);
      expect(chair.photoWidth, "the chairman's portrait is the larger").toBeGreaterThan(a.photoWidth);
      expect(chair.photoWidth, "modest portraits").toBeLessThanOrEqual(320);
      expect(a.photoWidth, "modest portraits").toBeLessThanOrEqual(260);

      for (const entry of [chair, a, b]) {
        expect(entry.nameTop, "name below the photograph").toBeGreaterThanOrEqual(entry.photoBottom);
        expect(entry.dividerTop, "divider below the photograph").toBeGreaterThanOrEqual(entry.photoBottom);
        expect(entry.dividerBottom, "divider above the name").toBeLessThanOrEqual(entry.nameTop);
        expect(entry.nameFontPx, "a quiet name").toBeLessThanOrEqual(20);
        expect(entry.radius, "a slight radius").toBeGreaterThanOrEqual(4);
        expect(entry.radius, "a slight radius").toBeLessThanOrEqual(16);
      }
    });

    test(`the line joins the chairman to the two beneath him (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      // The portraits rise into place as they enter; measure once they have.
      await page.waitForTimeout(1400);
      const [chair, a, b] = await people(page);
      const thread = await page.locator("[data-leadership-thread]").boundingBox();
      expect(thread, "the line is there").not.toBeNull();
      expect(thread!.y, "it starts below the chairman's name").toBeGreaterThanOrEqual(chair.captionTop);
      expect(Math.abs(thread!.y + thread!.height - a.photoTop), "and ends at the tops of the portraits").toBeLessThan(3);
      expect(Math.abs(thread!.width - (b.cx - a.cx)), "spanning exactly the two centres").toBeLessThan(3);
    });

    test(`people beyond three continue in rows of two under the first two (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/leaders`);
      await page.locator("#leadership").scrollIntoViewIfNeeded();
      const all = await people(page);
      // The e2e content lists more than three people.
      expect(all.length).toBeGreaterThan(3);
      expect(Math.abs(all[3].cx - all[1].cx), "the fourth stands under the first of the two").toBeLessThan(2);
      expect(all[3].y, "...in a row below").toBeGreaterThan(all[1].y + 200);
    });

    test(`on a phone the chairman comes first and the rest follow in one column (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/leaders`);
      const all = await people(page);
      expect(all.every((entry) => Math.abs(entry.cx - 195) < 2), "one centred column").toBe(true);
      expect(all.map((entry) => entry.y), "in order, top to bottom").toEqual([...all.map((e) => e.y)].sort((x, y) => x - y));
      for (const entry of all) expect(entry.photoWidth, "clear photographs").toBeGreaterThan(240);
      expect(await page.locator("[data-leadership-thread]").isVisible(), "the fork gives way to a straight line").toBe(false);
      expect(await page.locator("[data-leadership-rise]").first().isVisible()).toBe(true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, "no horizontal scroll").toBe(false);
    });
  }

  test("the section is light: no navy ground behind the people", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    const grounds = await page
      .locator("#leadership, #leadership > div, #leadership figure, #leadership figcaption")
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).backgroundColor));
    expect(grounds[0], "the section is the site's off-white").toBe("rgb(247, 248, 252)");
    for (const ground of grounds.slice(1)) expect(ground, "nothing dark behind a person").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  });

  test("the line is drawn by the scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    await page.waitForLoadState("networkidle");
    const drawn = () =>
      page.locator("[data-thread]").evaluateAll((nodes) => nodes.map((n) => parseFloat(n.getAttribute("stroke-dasharray") ?? "0")));
    expect(Math.max(...(await drawn())), "nothing drawn before it is reached").toBe(0);
    await page.locator("[data-leadership-thread]").evaluate((n) => {
      window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - 120);
    });
    await expect.poll(async () => Math.min(...(await drawn())), { timeout: 4000 }).toBeGreaterThan(0.95);
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
    // Every line is already drawn, and no light travels along it.
    const dashes = await page.locator("[data-thread]").evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).strokeDasharray));
    expect(dashes.every((d) => d === "none"), "lines fully drawn").toBe(true);
    const travelling = await page
      .locator("[data-leadership-thread] [data-head], [data-leadership-thread] [data-orb]")
      .evaluateAll((nodes) => nodes.filter((n) => getComputedStyle(n).display !== "none").length);
    expect(travelling, "no moving light").toBe(0);
    expect(errors.filter((e) => /hydrat/i.test(e)), "no hydration failure").toEqual([]);
    await context.close();
  });
});
