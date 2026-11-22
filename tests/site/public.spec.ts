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
      "Experience That Earns Trust. Capability That Delivers.",
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
  // What the section is, as numbers: portraits of one size in a single column,
  // one above the next, with each person's name and role written beside the
  // portrait (beneath it on a phone), always visible — nothing waits for a
  // hover, and nothing is written on a photograph. The pair is centred on the
  // page, and the portraits all stand on one vertical line.
  const rows = (page: import("@playwright/test").Page) =>
    page.locator("#leadership li").evaluateAll((nodes) =>
      nodes.map((node) => {
        const photo = node.querySelector("figure")!.getBoundingClientRect();
        const words = node.querySelector("strong")!.parentElement!.getBoundingClientRect();
        const strong = node.querySelector("strong")!.getBoundingClientRect();
        return {
          photo: { x: photo.x, right: photo.right, top: photo.top, bottom: photo.bottom, width: photo.width, height: photo.height },
          words: { x: words.x, right: words.right, top: words.top, bottom: words.bottom },
          strong: { width: strong.width, height: strong.height },
          // The pair, as one block.
          left: Math.min(photo.x, words.x),
          right: Math.max(photo.right, words.right),
          visible: getComputedStyle(node.querySelector("strong")!).visibility === "visible",
        };
      }),
    );
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 640],
  ]) {
    for (const locale of ["en", "ar"]) {
      test(`portraits one above the next, name beside each, the pair centred (${locale}, ${width}px)`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(`/${locale}/leaders`);
        await page.locator("#leadership").scrollIntoViewIfNeeded();
        await page.waitForTimeout(1400);
        const all = await rows(page);
        expect(all.length).toBeGreaterThanOrEqual(3);
        const sideBySide = width >= 640;
        for (const row of all) {
          expect(Math.abs(row.photo.width - all[0].photo.width), "one width").toBeLessThan(1.5);
          expect(Math.abs(row.photo.height - all[0].photo.height), "one height").toBeLessThan(1.5);
          expect(Math.abs(row.photo.x - all[0].photo.x), "all portraits on one vertical line").toBeLessThan(1.5);
          expect(row.left, "inside the screen").toBeGreaterThanOrEqual(-1);
          expect(row.right).toBeLessThanOrEqual(width + 1);
          expect(row.visible, "the name is shown without any hover").toBe(true);
          expect(row.strong.width).toBeGreaterThan(20);
          if (sideBySide) {
            expect(Math.abs((row.left + row.right) / 2 - width / 2), "the pair is in the middle of the screen").toBeLessThan(2);
            // Beside, not over: the words stand clear of the photograph.
            const clear = locale === "ar" ? row.words.right <= row.photo.x + 1 : row.words.x >= row.photo.right - 1;
            expect(clear, "the words sit beside the portrait").toBe(true);
            expect(row.words.top, "at the portrait's height").toBeLessThan(row.photo.bottom);
          } else {
            expect(row.words.top, "on a phone the words sit under the portrait").toBeGreaterThanOrEqual(row.photo.bottom - 1);
            expect(Math.abs((row.photo.x + row.photo.right) / 2 - width / 2), "centred").toBeLessThan(2);
          }
        }
        // Placed by layout, not by where an entrance animation has got to.
        const places = await page.locator("#leadership li").evaluateAll((nodes) =>
          nodes.map((n) => ({ top: (n as HTMLElement).offsetTop, height: (n as HTMLElement).offsetHeight })),
        );
        for (let k = 1; k < places.length; k++) {
          expect(places[k].top, "beneath the one before").toBeGreaterThanOrEqual(places[k - 1].top + places[k - 1].height);
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          "no horizontal page scroll",
        ).toBe(false);
      });
    }
  }

  test("the portrait sits on the start side and the words on the other (Arabic: right, then left)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const first = (await rows(page))[0];
    expect(first.photo.x, "the portrait is the right-hand item").toBeGreaterThan(first.words.x);
  });

  test("there is no hover panel any more: nothing is clipped, nothing moves on pointing", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/leaders");
    await page.locator("#leadership").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await expect(page.locator("#leadership figcaption")).toHaveCount(0);
    const before = (await rows(page))[0];
    await page.locator("#leadership li").first().hover();
    await page.waitForTimeout(600);
    const after = (await rows(page))[0];
    // Compared against each other, not against the page: pointing may scroll.
    expect(after.words.top - after.photo.top).toBeCloseTo(before.words.top - before.photo.top, 0);
    expect(after.photo.bottom - after.photo.top).toBeCloseTo(before.photo.bottom - before.photo.top, 0);
    await expect(page.locator("#leadership li strong").first()).toBeVisible();
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
      .locator("#leadership strong, #leadership li span, #leadership h1, #leadership h2, #leadership p")
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

// ------------------------------------------- the client's changes, 2026-11-22

test.describe("the home page after the 2026-11-22 changes", () => {
  test("the About Wjeen summary is gone", async ({ page }) => {
    for (const locale of ["en", "ar"]) {
      await page.goto(`/${locale}`);
      await expect(page.locator("#about"), locale).toHaveCount(0);
      // Its own heading, which is also gone from the site's message file.
      const text = await page.locator("main").innerText();
      expect(text, locale).not.toContain("A Saudi contractor built on a partnership");
      expect(text, locale).not.toContain("مقاول سعودي مبني على شراكة");
    }
  });

  test("the clients come last, directly above the closing call to action", async ({ page }) => {
    for (const locale of ["en", "ar"]) {
      await page.goto(`/${locale}`);
      const order = await page.evaluate(() => {
        const sections = [...document.querySelectorAll("main > section, main > div > section")];
        return sections.map((s) => s.id || "(no id)");
      });
      const at = order.indexOf("clients");
      expect(at, `${locale}: clients present in ${order.join(" > ")}`).toBeGreaterThan(-1);
      expect(order.at(-2), `${locale}: the clients are the section before the closing banner`).toBe("clients");
      // And nothing of the wall of clients is left above, near the numbers.
      expect(order.indexOf("stats"), locale).toBeLessThan(at);
    }
  });

  test("every figure in 'Wjeen in numbers' carries a plus before the number", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const locale of ["en", "ar"]) {
      await page.goto(`/${locale}`);
      await page.locator("#stats").scrollIntoViewIfNeeded();
      await page.waitForTimeout(2800); // the count-up
      const figures = await page
        .locator("#stats .text-4xl, #stats .lg\\:text-5xl")
        .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? "").trim()).filter(Boolean));
      expect(figures.length, locale).toBeGreaterThanOrEqual(4);
      for (const figure of figures) expect(figure, `${locale}: "${figure}"`).toMatch(/^\+\s*\d/);
    }
  });

  test("the numbered list leads and the sector's copy sits beside it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const locale of ["en", "ar"]) {
      await page.goto(`/${locale}`);
      const stage = page.locator("#services");
      await stage.scrollIntoViewIfNeeded();
      const listItem = stage.getByRole("button").filter({ hasText: /^01/ }).first();
      const sectorTitle = stage.locator("h3").first();
      await expect(listItem).toBeVisible();
      await expect(sectorTitle).toBeVisible();
      const a = (await listItem.boundingBox())!;
      const b = (await sectorTitle.boundingBox())!;
      // English reads left to right, so "first" is the left-hand item; Arabic mirrors it.
      if (locale === "en") expect(a.x, "list is first, on the left").toBeLessThan(b.x);
      else expect(a.x, "list is first, on the right").toBeGreaterThan(b.x);
    }
  });
});

test.describe("the story page after the 2026-11-22 changes", () => {
  for (const locale of ["en", "ar"]) {
    test(`"who we are" has no timeline and sits in the middle (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/story`);
      const section = page.locator("#story");
      await expect(section.locator("li")).toHaveCount(0);
      await expect(section).not.toContainText("1979");
      const heading = (await section.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(Math.abs(heading.x + heading.width / 2 - 720), "the heading is in the middle").toBeLessThan(4);
      const paragraphs = section.locator("p");
      expect(await paragraphs.count()).toBeGreaterThanOrEqual(2);
      const body = (await paragraphs.first().boundingBox())!;
      expect(Math.abs(body.x + body.width / 2 - 720), "and so is the copy").toBeLessThan(4);
    });
  }

  test("seven medallions: the four earned and three left empty, the short row centred", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const locale of ["en", "ar"]) {
      await page.goto(`/${locale}/story`);
      const medallions = page.locator("#awards .group");
      await medallions.first().scrollIntoViewIfNeeded();
      await medallions.last().scrollIntoViewIfNeeded(); // let every medallion finish its entrance
      await page.waitForTimeout(1800);
      await expect(medallions, locale).toHaveCount(7);
      const boxes = await medallions.evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { top: Math.round(r.top + scrollY), left: r.left, right: r.right, text: (n.textContent ?? "").trim() };
        }),
      );
      // The last three are empty, and sit on a second row under the first four.
      for (const empty of boxes.slice(4)) expect(empty.text, `${locale}: an empty medallion`).toBe("");
      expect(boxes[4].top, `${locale}: a second row`).toBeGreaterThan(boxes[0].top + 100);
      const tops = boxes.slice(4).map((b) => b.top);
      expect(Math.max(...tops) - Math.min(...tops), `${locale}: all three on one row`).toBeLessThan(8);
      const left = Math.min(...boxes.slice(4).map((b) => b.left));
      const right = Math.max(...boxes.slice(4).map((b) => b.right));
      expect(Math.abs((left + right) / 2 - 720), `${locale}: the short row is centred`).toBeLessThan(6);
    }
  });
});

test.describe("the business page after the 2026-11-22 changes", () => {
  test("Resources and the three safety figures are gone", async ({ page }) => {
    for (const locale of ["en", "ar"]) {
      await page.goto(`/${locale}/business`);
      await expect(page.locator("#resources"), locale).toHaveCount(0);
      const text = await page.locator("main").innerText();
      expect(text, locale).not.toMatch(/45,?001\b(?!:)/);
      expect(text, locale).not.toMatch(/(^|\s)14,?001\b(?!:)/);
      // The rest of the safety section is still there.
      await expect(page.locator("#hse"), locale).toHaveCount(1);
      await expect(page.locator("#hse h3").first(), locale).toBeVisible();
    }
  });
});

test.describe("the contact page after the 2026-11-22 changes", () => {
  test("four office cards: Al Khobar, Jeddah, Jubail and Ras Tanura", async ({ page }) => {
    for (const [locale, names] of [
      ["en", ["Al Khobar", "Jeddah", "Jubail", "Ras Tanura"]],
      ["ar", ["الخبر", "جدة", "الجبيل", "رأس تنورة"]],
    ] as const) {
      await page.goto(`/${locale}/contact`);
      const cards = page.locator("section:has(h2) article");
      await expect(cards, locale).toHaveCount(4);
      const titles = await cards.locator("h3").allInnerTexts();
      names.forEach((name, i) => expect(titles[i], `${locale} card ${i + 1}`).toContain(name));
    }
  });
});
