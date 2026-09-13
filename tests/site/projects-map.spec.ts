/**
 * The projects page map.
 *
 * The map is a WebGL scene, so what a person sees is pixels. The scene
 * exposes one read-only seam for this suite — `canvas.projectLocation(id)`,
 * where a location's marker is on screen — and lists what it has placed in
 * `data-locations`. Everything else is driven the way a visitor drives it:
 * real clicks on painted markers, real drags, the list, the keyboard.
 *
 * Without WebGL the page falls back to the flat `SaudiReach` map, and that
 * path is covered here too.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
const CANVAS = "canvas[data-locations]";

interface Point {
  x: number;
  y: number;
}

/** The scene is built and its seam is in place. */
async function waitForScene(page: Page) {
  await page.waitForFunction(
    (selector) =>
      typeof Reflect.get(document.querySelector(selector) ?? {}, "projectLocation") === "function",
    CANVAS,
  );
}

async function openMap(page: Page, locale = "en") {
  await page.goto(`/${locale}/projects`);
  const canvas = page.locator(CANVAS);
  await canvas.scrollIntoViewIfNeeded();
  await waitForScene(page);
  await settle(page);
  return { root: page.locator("section", { has: canvas }), canvas };
}

/** The placed locations, as the scene has them. */
async function locations(page: Page) {
  const raw = (await page.locator(CANVAS).getAttribute("data-locations")) ?? "";
  return raw
    .split(" ")
    .filter(Boolean)
    .map((pair) => {
      const [id, count] = pair.split(":");
      return { id, count: Number(count) };
    });
}

/** A marker's dot, in page coordinates. */
async function markerAt(page: Page, id: string): Promise<Point> {
  const canvas = page.locator(CANVAS);
  const box = (await canvas.boundingBox())!;
  const p = await canvas.evaluate(
    (el, id) => (Reflect.get(el, "projectLocation") as (id: string) => Point)(id),
    id,
  );
  return { x: box.x + p.x, y: box.y + p.y };
}

/** A marker's dot relative to the canvas, which a scroll does not move. */
async function onCanvas(page: Page, id: string): Promise<Point> {
  const box = (await page.locator(CANVAS).boundingBox())!;
  const p = await markerAt(page, id);
  return { x: p.x - box.x, y: p.y - box.y };
}

/** Resolves after `count` animation frames have been painted. */
async function frames(page: Page, count: number) {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let k = 0;
        const tick = () => (++k >= n ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    count,
  );
}

/**
 * Wait until the camera has stopped. The scene says when its flight and
 * trail are over; then a marker must hold still across several frames. A
 * look over a fixed time is not enough: on a software renderer under load a
 * short wait can fall between two frames and see nothing move while the
 * camera is still on its way.
 */
async function settle(page: Page) {
  await expect
    .poll(
      () =>
        page.locator(CANVAS).evaluate((el) => {
          const state = (
            Reflect.get(el, "inspectMap") as () => {
              flying: boolean;
              trail: unknown;
            }
          )();
          return !state.flying && !state.trail;
        }),
      { timeout: 45_000 },
    )
    .toBe(true);
  const [first] = await locations(page);
  await expect
    .poll(
      async () => {
        const a = await markerAt(page, first.id);
        await frames(page, 3);
        const b = await markerAt(page, first.id);
        return Math.hypot(a.x - b.x, a.y - b.y);
      },
      { timeout: 45_000 },
    )
    .toBeLessThan(0.3);
}

/** Centre of the part of the stage the floating panel leaves free. */
async function freeCentre(page: Page, rtl: boolean) {
  const stage = (await page.locator(CANVAS).boundingBox())!;
  const panel = (await page.locator("[data-map-panel]").boundingBox())!;
  const inset = panel.width + 32;
  const x = rtl ? stage.x + inset + (stage.width - inset) / 2 : stage.x + (stage.width - inset) / 2;
  return { x, y: stage.y + stage.height / 2 };
}

const selectedLabel = (page: Page) => page.locator('[data-map-label="selected"]');
const hoverLabel = (page: Page) => page.locator('[data-map-label="hover"]');

async function labelCentreX(label: Locator) {
  const box = (await label.boundingBox())!;
  return box.x + box.width / 2;
}

const rows = (root: Locator) => root.locator("ul li button").filter({ visible: true });
const cardTitle = (root: Locator) => root.locator("h3").filter({ visible: true }).first();
const resetButton = (page: Page, locale = "en") =>
  page.getByRole("button", {
    name: locale === "ar" ? "عرض المملكة كاملة" : "Show the whole Kingdom",
  });

// ------------------------------------------------------------------- scene

test.describe("projects map", () => {
  // The scene renders in software under test (SwiftShader), which a busy
  // machine slows a good deal.
  test.describe.configure({ timeout: 120_000 });

  test("33 projects are placed on the map and all 44 are listed", async ({ page }) => {
    const { root } = await openMap(page);
    const placed = await locations(page);
    // Projects share places — Ras Tanura alone holds six — so 33 placed
    // projects make 13 markers.
    expect(placed).toHaveLength(13);
    expect(placed.reduce((sum, l) => sum + l.count, 0)).toBe(33);
    await expect(rows(root)).toHaveCount(44);
    await expect(root.getByText("33 on the map")).toBeVisible();
  });

  test("the eleven without a location are listed honestly, not placed", async ({ page }) => {
    // The profile names no city for these — EWPS stations, the villas at
    // Rahima, the Corporate Data Centre — so they carry no marker.
    const { root } = await openMap(page);
    await expect(root.getByText("Not on the map").filter({ visible: true })).toHaveCount(11);
  });

  for (const locale of ["en", "ar"]) {
    test(`the whole Kingdom sits clear of the panel (${locale})`, async ({ page }) => {
      await openMap(page, locale);
      const panel = (await page.locator("[data-map-panel]").boundingBox())!;
      const stage = (await page.locator(CANVAS).boundingBox())!;
      for (const { id } of await locations(page)) {
        const p = await markerAt(page, id);
        if (locale === "ar") expect(p.x, id).toBeGreaterThan(panel.x + panel.width + 8);
        else expect(p.x, id).toBeLessThan(panel.x - 8);
        expect(p.y, id).toBeGreaterThan(stage.y);
        expect(p.y, id).toBeLessThan(stage.y + stage.height);
      }
    });
  }

  test.describe("with reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    /**
     * Every project, by mouse, on the painted marker. Thirteen share four
     * spots; a repeat click on a spot steps to the next project there.
     */
    for (const locale of ["en", "ar"]) {
      test(`every project can be reached with a mouse (${locale})`, async ({ page }) => {
        test.slow();
        const { root } = await openMap(page, locale);
        const current = root.locator('ul li button[aria-current="true"]').filter({ visible: true });
        const currentTitle = async () =>
          (await current.count()) ? (await current.first().innerText()).split("\n")[0].trim() : "";

        const reached = new Set<string>();
        let previous = "";
        for (const { id, count } of await locations(page)) {
          await resetButton(page, locale).click();
          for (let k = 0; k < count; k++) {
            const p = await markerAt(page, id);
            await page.mouse.click(p.x, p.y);
            // Every click here lands on a project other than the last: a new
            // spot, or the next one stacked at this spot.
            await expect.poll(currentTitle).not.toBe(previous);
            previous = await currentTitle();
            reached.add(previous);
          }
        }
        expect(reached.size).toBe(33);
      });
    }

    test("there is no way in, and a flight is instant", async ({ page }) => {
      await page.goto("/en/projects");
      await waitForScene(page);
      const waiting = await onCanvas(page, "riyadh");
      await page.locator(CANVAS).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const arrived = await onCanvas(page, "riyadh");
      expect(Math.hypot(arrived.x - waiting.x, arrived.y - waiting.y)).toBeLessThan(2);

      const root = page.locator("section", { has: page.locator(CANVAS) });
      await rows(root).filter({ hasText: "Yanbu" }).first().click();
      await page.waitForTimeout(60);
      const centre = await freeCentre(page, false);
      expect(Math.abs((await labelCentreX(selectedLabel(page))) - centre.x)).toBeLessThan(24);
    });
  });

  test("the camera comes down into the map the first time it is seen", async ({ page }) => {
    await page.goto("/en/projects");
    await waitForScene(page);
    // Before the map is on screen the camera waits high above and farther
    // back, so the country looks smaller: coast to coast is shorter.
    const across = async () => {
      const west = await onCanvas(page, "yanbu");
      const east = await onCanvas(page, "dhahran");
      return Math.hypot(west.x - east.x, west.y - east.y);
    };
    const waiting = await across();
    await page.locator(CANVAS).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const onTheWay = await across();
    await settle(page);
    const arrived = await across();
    expect(waiting).toBeLessThan(arrived * 0.8);
    expect(onTheWay, "moving, not jumping").toBeGreaterThan(waiting);
    expect(onTheWay, "moving, not jumping").toBeLessThan(arrived);
  });

  test("choosing a project flies the camera to it, smoothly", async ({ page }) => {
    const { root } = await openMap(page);
    const centre = await freeCentre(page, false);

    // Watch the label ride with its marker, frame by frame, from the click
    // until the camera has been still for a while.
    const path = page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const label = document.querySelector('[data-map-label="selected"]')!;
          const xs: number[] = [];
          let still = 0;
          const sample = () => {
            const r = label.getBoundingClientRect();
            const x = r.left + r.width / 2;
            still = xs.length && Math.abs(x - xs[xs.length - 1]) < 0.2 ? still + 1 : 0;
            xs.push(x);
            if (still > 20 || xs.length > 2000) resolve(xs);
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }),
    );
    await rows(root).filter({ hasText: "Yanbu" }).first().click();
    const xs = await path;

    const end = xs[xs.length - 1];
    expect(Math.abs(end - centre.x), "arrives in the middle of the free space").toBeLessThan(24);
    // Yanbu starts far out on the west coast. A jump would go there in one
    // or two frames; a flight passes through many places on the way.
    const start = xs.find((x) => Math.abs(x - end) > 100);
    expect(start, "starts far from where it ends").toBeDefined();
    const between = new Set(
      xs.filter((x) => Math.abs(x - end) > 5 && Math.abs(x - start!) > 5).map(Math.round),
    );
    expect(between.size, "passes through the space between").toBeGreaterThan(10);
  });

  test("list, marker, card and label stay in step", async ({ page }) => {
    const { root } = await openMap(page);
    const list = rows(root);
    for (let i = 0, checked = 0; checked < 5; i++) {
      const text = await list.nth(i).innerText();
      if (text.includes("Not on the map")) continue;
      const title = text.split("\n")[0].trim();

      await list.nth(i).click();
      await expect(cardTitle(root)).toHaveText(title);
      await expect(list.nth(i)).toHaveAttribute("aria-current", "true");
      await expect(selectedLabel(page)).toHaveText(title);
      // The name arrives at the end of the location trail.
      await expect(selectedLabel(page)).toHaveCSS("opacity", "1", { timeout: 15_000 });
      checked++;
    }
  });

  test("a marker click selects in the list and the card", async ({ page }) => {
    const { root } = await openMap(page);
    const p = await markerAt(page, "riyadh");
    await page.mouse.click(p.x, p.y);
    // A marker picks the first project recorded at that place.
    await expect(cardTitle(root)).toContainText("Interposing Relay Panel");
    await expect(
      rows(root).filter({ hasText: "Interposing Relay Panel" }).first(),
    ).toHaveAttribute("aria-current", "true");
  });

  test("an unplaced project clears the map and returns to the overview", async ({ page }) => {
    const { root } = await openMap(page);
    const home = await onCanvas(page, "riyadh");
    await rows(root).filter({ hasText: "Building Trade Service at Riyadh Refinery" }).first().click();
    await settle(page);
    await rows(root).filter({ hasText: "Not on the map" }).first().click();
    await expect(selectedLabel(page)).toHaveCSS("opacity", "0");
    await settle(page);
    const back = await onCanvas(page, "riyadh");
    expect(Math.hypot(back.x - home.x, back.y - home.y)).toBeLessThan(3);
  });

  test("hovering a shared spot names it and counts what is there", async ({ page }) => {
    await openMap(page);
    const shared = (await locations(page)).find((l) => l.count > 2)!;
    const p = await markerAt(page, shared.id);
    await page.mouse.move(p.x, p.y);
    await expect(hoverLabel(page)).toHaveCSS("opacity", "1");
    await expect(hoverLabel(page)).toContainText(`${shared.count} projects here`);
  });

  test("the keyboard selects through the list", async ({ page }) => {
    const { root } = await openMap(page);
    const row = rows(root).filter({ hasText: "Juaymah" }).first();
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(row).toHaveAttribute("aria-current", "true");
    await expect(selectedLabel(page)).toHaveCSS("opacity", "1", { timeout: 15_000 });
  });

  test("a drag moves the map with the pointer and keeps the selection", async ({ page }) => {
    const { root } = await openMap(page);
    await rows(root).filter({ hasText: "Building Trade Service at Riyadh Refinery" }).first().click();
    await settle(page);
    const title = await cardTitle(root).innerText();

    const start = await markerAt(page, "riyadh");
    const from = { x: start.x, y: start.y + 30 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(from.x - i * 12, from.y + i * 4);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(150);
    const held = await markerAt(page, "riyadh");
    await page.mouse.up();

    // The ground under the pointer stays under it.
    expect(Math.abs(held.x - start.x - -144)).toBeLessThan(16);
    expect(Math.abs(held.y - start.y - 48)).toBeLessThan(24);
    await expect(cardTitle(root)).toHaveText(title);
  });

  test("zoom: buttons and Ctrl + wheel, and a plain wheel still scrolls the page", async ({
    page,
  }) => {
    await openMap(page);
    const spread = async () => {
      const a = await markerAt(page, "riyadh");
      const b = await markerAt(page, "yanbu");
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const home = await spread();

    await page.getByRole("button", { name: "Zoom in" }).click();
    await settle(page);
    const zoomed = await spread();
    expect(zoomed).toBeGreaterThan(home * 1.15);

    await page.getByRole("button", { name: "Zoom out" }).click();
    await settle(page);
    expect(await spread()).toBeLessThan(zoomed);

    const box = (await page.locator(CANVAS).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    const scrollBefore = await page.evaluate(() => scrollY);
    const beforeWheel = await spread();
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -240);
    await page.keyboard.up("Control");
    await settle(page);
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    expect(await spread()).toBeGreaterThan(beforeWheel);

    await page.mouse.wheel(0, 240);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore + 50);
  });

  test("the overview button returns the camera and keeps the selection", async ({ page }) => {
    const { root } = await openMap(page);
    const home = await onCanvas(page, "riyadh");
    await rows(root).filter({ hasText: "Yanbu" }).first().click();
    await settle(page);
    const title = await cardTitle(root).innerText();

    await resetButton(page).click();
    await settle(page);
    const back = await onCanvas(page, "riyadh");
    expect(Math.hypot(back.x - home.x, back.y - home.y)).toBeLessThan(3);
    await expect(cardTitle(root)).toHaveText(title);
  });

  test("filters narrow both the list and the map together", async ({ page }) => {
    const { root } = await openMap(page);
    await root.getByRole("button", { name: /^Industrial/ }).click();
    const listed = await rows(root).count();
    const placed = (await locations(page)).reduce((sum, l) => sum + l.count, 0);
    expect(listed).toBeLessThan(32);
    expect(placed).toBeGreaterThan(0);
    expect(placed).toBeLessThanOrEqual(listed);
  });

  test("the chosen filter is the one that looks chosen", async ({ page }) => {
    // The section is light, so the chosen pill is the filled navy one and the
    // others are outlines — never the same fill as the ground they sit on.
    const { root } = await openMap(page);
    const all = root.getByRole("button", { name: /^All$/ });
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveCSS("background-color", "rgb(15, 21, 95)");
    const other = root.getByRole("button", { name: /^Industrial/ });
    await expect(other).toHaveAttribute("aria-pressed", "false");
    await expect(other).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  });

  test("the section sits on the site's light ground", async ({ page }) => {
    const { root } = await openMap(page);
    await expect(root).toHaveCSS("background-color", "rgb(247, 248, 252)");
  });

  test("no interaction moves the layout", async ({ page }) => {
    const { root } = await openMap(page);
    await page.evaluate(() => {
      const w = window as unknown as { cls: number };
      w.cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) w.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: false });
    });
    for (const { id } of (await locations(page)).slice(0, 4)) {
      await resetButton(page).click();
      await settle(page);
      const p = await markerAt(page, id);
      await page.mouse.click(p.x, p.y);
    }
    await rows(root).nth(3).click();
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => (window as unknown as { cls: number }).cls);
    expect(cls).toBeLessThan(0.01);
  });

  test("the scene stops drawing when it is off screen", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { draws: number };
      w.draws = 0;
      for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
        const draw = proto.drawElements;
        proto.drawElements = function (...args: Parameters<typeof draw>) {
          w.draws++;
          return draw.apply(this, args);
        };
      }
    });
    await openMap(page);
    const drawsOver = async (ms: number) => {
      const a = await page.evaluate(() => (window as unknown as { draws: number }).draws);
      await page.waitForTimeout(ms);
      return (await page.evaluate(() => (window as unknown as { draws: number }).draws)) - a;
    };
    expect(await drawsOver(800)).toBeGreaterThan(0);

    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    expect(await drawsOver(800)).toBe(0);
  });

  test("three.js is downloaded on the projects page only", async ({ page }) => {
    const threeLoaded = async (path: string) => {
      const bodies: Promise<string>[] = [];
      const onResponse = (r: import("@playwright/test").Response) => {
        if (r.request().resourceType() === "script") bodies.push(r.text().catch(() => ""));
      };
      page.on("response", onResponse);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(800);
      page.off("response", onResponse);
      return (await Promise.all(bodies)).some((b) => b.includes("WebGLRenderer"));
    };
    expect(await threeLoaded("/en")).toBe(false);
    expect(await threeLoaded("/en/projects")).toBe(true);
  });

  for (const locale of ["en", "ar"]) {
    test(`no accessibility violations (${locale})`, async ({ page }) => {
      await openMap(page, locale);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const summary = violations.map((v) => `${v.id} × ${v.nodes.length}: ${v.nodes[0]?.target}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
});

// --------------------------------------------------------- premium layer

interface MapState {
  selectedRegion: string | null;
  lifts: Record<string, number>;
  ground: Record<string, number>;
  trail: { locationId: string; stages: string[]; t: number } | null;
  flying: boolean;
}

async function mapState(page: Page): Promise<MapState> {
  return page.locator(CANVAS).evaluate((el) => (Reflect.get(el, "inspectMap") as () => MapState)());
}

const exploreButton = (page: Page, locale = "en") =>
  page.getByRole("button", { name: locale === "ar" ? "استكشف المشاريع" : "Explore projects" });

test.describe("projects map — depth, trail, context and tour", () => {
  test.describe.configure({ timeout: 120_000 });

  test("a chosen region stands above a pointed-at one, which stands above the rest", async ({
    page,
  }) => {
    const { root } = await openMap(page);
    // At rest the provinces sit level with one another; the ground's own
    // relief is what varies.
    let { lifts } = await mapState(page);
    expect(lifts["eastern-province"]).toBeLessThan(0.001);
    expect(lifts["northern-borders"]).toBeLessThan(0.001);

    await rows(root).filter({ hasText: "Building Trade Service at Riyadh Refinery" }).first().click();
    await expect.poll(async () => (await mapState(page)).lifts.ryiadh).toBeGreaterThan(0.15);

    // Pointing at a project elsewhere raises its region, less than the choice.
    await rows(root).filter({ hasText: "Jeddah" }).first().hover();
    await expect.poll(async () => (await mapState(page)).lifts.mecca).toBeGreaterThan(0.05);
    ({ lifts } = await mapState(page));
    expect(lifts.mecca).toBeLessThan(lifts.ryiadh);
    expect(lifts["northern-borders"]).toBeLessThan(0.001);
    expect((await mapState(page)).selectedRegion).toBe("ryiadh");
  });

  test("the ground has relief, and every marker stands on it", async ({ page }) => {
    await openMap(page);
    const { ground } = await mapState(page);
    const placed = await locations(page);
    expect(Object.keys(ground).sort()).toEqual(placed.map((l) => l.id).sort());
    const heights = Object.values(ground);
    // Not one flat slab: the ground under the markers varies…
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.05);
    // …low at the water's edge, higher inland…
    expect(ground.jubail).toBeLessThan(0.02);
    expect(ground.riyadh).toBeGreaterThan(0.06);
    // …and never more than a gentle relief: below a chosen province's lift.
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(0.16);
    }
  });

  test("the location trail plays once, then leaves nothing behind", async ({ page }) => {
    const { root } = await openMap(page);
    await rows(root).filter({ hasText: "Building Trade Service at Riyadh Refinery" }).first().click();
    const first = (await mapState(page)).trail;
    // A new region gets the whole gesture: its border, the crossing, the ring.
    expect(first?.stages).toEqual(["border", "connector", "ring"]);
    await expect.poll(async () => (await mapState(page)).trail, { timeout: 8_000 }).toBeNull();

    // The same region again only needs the crossing and the ring.
    await rows(root).filter({ hasText: "Juaymah" }).first().click();
    await expect.poll(async () => (await mapState(page)).trail, { timeout: 8_000 }).toBeNull();
    await rows(root).filter({ hasText: "Tanajib" }).first().click();
    expect((await mapState(page)).trail?.stages).toEqual(["connector", "ring"]);
    await expect.poll(async () => (await mapState(page)).trail, { timeout: 8_000 }).toBeNull();

    // Choosing the place already chosen replays nothing.
    await rows(root).filter({ hasText: "Tanajib" }).first().click();
    expect((await mapState(page)).trail).toBeNull();
  });

  test.describe("with reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("there is no trail, and the name is there at once", async ({ page }) => {
      const { root } = await openMap(page);
      await rows(root).filter({ hasText: "Building Trade Service at Riyadh Refinery" }).first().click();
      expect((await mapState(page)).trail).toBeNull();
      await expect(selectedLabel(page)).toHaveCSS("opacity", "1", { timeout: 3_000 });
      expect((await mapState(page)).trail).toBeNull();
    });
  });

  for (const locale of ["en", "ar"]) {
    test(`the context line reads Kingdom, region, city (${locale})`, async ({ page }) => {
      const { root } = await openMap(page, locale);
      const line = page.locator("[data-map-context]");
      await expect(line).toHaveText(locale === "ar" ? "المملكة العربية السعودية" : "Saudi Arabia");
      await rows(root)
        .filter({ hasText: locale === "ar" ? "الجعيمة" : "Juaymah" })
        .first()
        .click();
      // The separators are spaced by layout, not by characters.
      await expect(line).toHaveText(
        locale === "ar"
          ? /^المملكة العربية السعودية\s*›\s*المنطقة الشرقية\s*›\s*الجعيمة لتجزئة سوائل الغاز$/
          : /^Saudi Arabia\s*›\s*Eastern Province\s*›\s*Juaymah NGL$/i,
      );
      // An unplaced project has no place to name.
      await rows(root)
        .filter({ hasText: locale === "ar" ? "غير محدَّد على الخريطة" : "Not on the map" })
        .first()
        .click();
      await expect(line).toHaveText(locale === "ar" ? "المملكة العربية السعودية" : "Saudi Arabia");
    });
  }

  test("the map controls are one labelled group, usable from the keyboard", async ({ page }) => {
    await openMap(page);
    const group = page.getByRole("group", { name: "Map controls" });
    await expect(group.getByRole("button")).toHaveCount(3);
    const spread = async () => {
      const a = await markerAt(page, "riyadh");
      const b = await markerAt(page, "yanbu");
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const before = await spread();
    await page.getByRole("button", { name: "Zoom in" }).focus();
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeFocused();
    await page.keyboard.press("Enter");
    await settle(page);
    expect(await spread()).toBeGreaterThan(before * 1.15);
  });

  /**
   * The tour's timing runs on a fake clock. With motion the scene paints
   * every frame, and a fake clock jumping seconds ahead would replay
   * hundreds of software-rendered frames at once; with reduced motion the
   * scene paints only when something changes. The tour itself is the same
   * either way — it runs, advances and stops identically.
   */
  test.describe("the tour", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("Explore steps through the projects and stops when asked", async ({ page }) => {
      const { root } = await openMap(page);
      await page.clock.install();
      await page.clock.pauseAt(Date.now() + 1_000);

      await exploreButton(page).focus();
      await page.keyboard.press("Enter");
      const stop = page.getByRole("button", { name: /^Stop — 1 \/ 33$/ });
      await expect(stop).toBeVisible();
      const current = root.locator('ul li button[aria-current="true"]').filter({ visible: true });
      await expect(current).toHaveCount(1);
      const first = await current.innerText();

      // The first stop is a new place: it holds for its whole dwell, then the
      // tour moves on by itself.
      await page.clock.runFor(4_000);
      await expect(current).toHaveText(first, { useInnerText: true });
      await expect(page.getByRole("button", { name: /^Stop — 1 \/ 33$/ })).toBeVisible();
      await page.clock.runFor(300);
      await expect(current).not.toHaveText(first, { useInnerText: true });
      await expect(page.getByRole("button", { name: /^Stop — 2 \/ 33$/ })).toBeVisible();

      await page.getByRole("button", { name: /^Stop —/ }).click();
      await expect(exploreButton(page)).toBeVisible();
      const held = await current.innerText();
      await page.clock.runFor(12_000);
      await expect(current).toHaveText(held, { useInnerText: true });
    });

    test("anything the visitor does takes over from the tour", async ({ page }) => {
      const { root } = await openMap(page);
      await page.clock.install();
      await page.clock.pauseAt(Date.now() + 1_000);
      const current = root.locator('ul li button[aria-current="true"]').filter({ visible: true });

      // A drag on the map.
      await exploreButton(page).click();
      const box = (await page.locator(CANVAS).boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.3 + 30, box.y + box.height * 0.6 + 10);
      await page.mouse.up();
      await expect(exploreButton(page)).toBeVisible();
      let held = await current.innerText();
      await page.clock.runFor(9_000);
      await expect(current).toHaveText(held, { useInnerText: true });

      // A choice from the list.
      await exploreButton(page).click();
      await rows(root).filter({ hasText: "Khurais" }).first().click();
      await expect(exploreButton(page)).toBeVisible();
      await expect(current).toContainText("Khurais");
      await page.clock.runFor(9_000);
      await expect(current).toContainText("Khurais");

      // Escape.
      await exploreButton(page).click();
      await page.keyboard.press("Escape");
      await expect(exploreButton(page)).toBeVisible();
      held = await current.innerText();
      await page.clock.runFor(9_000);
      await expect(current).toHaveText(held, { useInnerText: true });

      // A zoom.
      await exploreButton(page).click();
      await page.getByRole("button", { name: "Zoom out" }).click();
      await expect(exploreButton(page)).toBeVisible();
    });
  });

  test("Explore is offered only where the panel sits beside the map", async ({ browser }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await openMap(page);
      await expect(exploreButton(page)).toHaveCount(0);
      await context.close();
    }
  });
});

// --------------------------------------------------------------- pictures

const media = (page: Page) => page.locator("[data-project-media]").filter({ visible: true });

/**
 * A card's picture may now come from either of two places, and both are right:
 * `managed` is the media library's file, `photo` is the copy bundled under
 * /public that the content names. Which one appears depends on whether the CMS
 * has a binding for this project, so these tests assert "a real photograph" and
 * leave the source to the environment — the media spec is where the two are
 * told apart.
 */
const A_PHOTOGRAPH = /^(managed|photo)$/;

test.describe("projects map — project pictures", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const locale of ["en", "ar"]) {
    test(`a project shows its own photograph, or the brand panel — never a broken image (${locale})`, async ({
      page,
    }) => {
      const { root } = await openMap(page, locale);
      const withPhoto =
        locale === "ar" ? "أعمال المباني بمصفاة الرياض" : "Building Trade Service at Riyadh Refinery";
      const withoutPhoto = locale === "ar" ? "EWPS 11" : "EWPS 11";

      const photoRow = rows(root).filter({ hasText: withPhoto }).first();
      await photoRow.click();
      await expect(media(page)).toHaveAttribute("data-project-media", A_PHOTOGRAPH);
      const img = media(page).locator("img").first();
      await expect(img).toBeVisible();
      // Its own file — either the library's binding for this project or the
      // bundled copy the content names, never another project's picture.
      const source = decodeURIComponent((await img.getAttribute("src")) ?? "");
      expect(source).toMatch(/rrd-warehouse|\/media\/library\//);
      // And it is described, whichever source it came from.
      expect(((await img.getAttribute("alt")) ?? "").length).toBeGreaterThan(0);
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
        .toBe(true);
      const photoBox = (await media(page).boundingBox())!;

      await rows(root).filter({ hasText: withoutPhoto }).first().click();
      await expect(media(page)).toHaveAttribute("data-project-media", "fallback");
      // Decorative: the panel names nothing, the card's text does.
      await expect(media(page).getByRole("img")).toHaveCount(0);
      const panelBox = (await media(page).boundingBox())!;
      // Same frame either way, so no card is taller for having a picture.
      expect(Math.abs(panelBox.height - photoBox.height)).toBeLessThan(1);
      expect(Math.abs(panelBox.width - photoBox.width)).toBeLessThan(1);
    });
  }

  test("no project photograph is fetched until a project is chosen", async ({ page }) => {
    const photos: string[] = [];
    page.on("request", (request) => {
      if (/images%2Fprojects|\/images\/projects\//.test(request.url())) photos.push(request.url());
    });
    const { root } = await openMap(page);
    await page.waitForTimeout(1_000);
    expect(photos).toEqual([]);

    await rows(root).filter({ hasText: "Building Trade Service at Riyadh Refinery" }).first().click();
    // With the media library bound, the picture is fetched from there instead,
    // so the bundled path may stay untouched — what matters is that nothing
    // was fetched *before* a project was chosen, which is asserted above.
    const managed = await media(page).getAttribute("data-project-media");
    if (managed === "photo") {
      await expect.poll(() => photos.length).toBeGreaterThan(0);
      expect(photos.every((url) => url.includes("rrd-warehouse"))).toBe(true);
    } else {
      expect(photos).toEqual([]);
    }
  });

  test("on a phone the photograph heads the sheet, at a steady 16:9", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await openMap(page);
    const p = await markerAt(page, "tanajib");
    await page.touchscreen.tap(p.x, p.y);
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    const frame = sheet.locator("[data-project-media]");
    await expect(frame).toHaveAttribute("data-project-media", A_PHOTOGRAPH);
    await expect(frame.locator("img").first()).toHaveAttribute("alt", /Tool House/);
    const box = (await frame.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    // The close button stays usable over the picture.
    await expect(sheet.getByRole("button", { name: "Close" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await context.close();
  });
});

// ---------------------------------------------------------------- touch

test.describe("projects map — small screens", () => {
  for (const [name, viewport] of [
    ["phone", { width: 390, height: 844 }],
    ["small phone", { width: 375, height: 780 }],
    ["tablet", { width: 768, height: 1024 }],
    ["small laptop", { width: 1024, height: 768 }],
  ] as const) {
    for (const locale of ["en", "ar"]) {
      test(`${name} ${locale}: a tap opens the sheet, nothing overflows`, async ({ browser }) => {
        const context = await browser.newContext({ viewport, hasTouch: true });
        const page = await context.newPage();
        await openMap(page, locale);

        const overflow = await page.evaluate(() => {
          const r = document.scrollingElement!;
          return r.scrollWidth - r.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(1);

        const p = await markerAt(page, "riyadh");
        await page.touchscreen.tap(p.x, p.y);
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByRole("dialog")).toContainText(
          locale === "ar" ? "مصفاة الرياض" : "Riyadh Refinery",
        );

        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await context.close();
      });
    }
  }

  test("phone: a sideways swipe pans the map, a pinch zooms it", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await openMap(page);
    const cdp = await context.newCDPSession(page);
    const box = (await page.locator(CANVAS).boundingBox())!;
    const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: Point[]) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })),
      });

    const before = await markerAt(page, "riyadh");
    await touch("touchStart", [c]);
    for (let i = 1; i <= 8; i++) {
      await touch("touchMove", [{ x: c.x - i * 10, y: c.y }]);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(120);
    await touch("touchEnd", []);
    await settle(page);
    const panned = await markerAt(page, "riyadh");
    expect(panned.x - before.x).toBeLessThan(-40);

    const spread = async () => {
      const a = await markerAt(page, "riyadh");
      const b = await markerAt(page, "yanbu");
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const wide = await spread();
    await touch("touchStart", [
      { x: c.x - 30, y: c.y },
      { x: c.x + 30, y: c.y },
    ]);
    for (let i = 1; i <= 10; i++) {
      await touch("touchMove", [
        { x: c.x - 30 - i * 8, y: c.y },
        { x: c.x + 30 + i * 8, y: c.y },
      ]);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd", []);
    await settle(page);
    expect(await spread()).toBeGreaterThan(wide * 1.3);
    await context.close();
  });
});

// -------------------------------------------------------------- fallback

test.describe("projects map — without WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type.startsWith("webgl") || type === "experimental-webgl") return null;
        return (getContext as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof getContext;
    });
  });

  async function openFlat(page: Page) {
    await page.goto("/en/projects");
    const root = page.locator("section", { has: page.locator('svg g[role="button"]') }).last();
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    return root;
  }

  test("falls back to the flat map, and never fetches three.js", async ({ page }) => {
    const scripts: Promise<string>[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") scripts.push(r.text().catch(() => ""));
    });
    const root = await openFlat(page);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(root.locator('svg g[role="button"]')).toHaveCount(33);
    await expect(root.locator("ul li button")).toHaveCount(44);
    expect((await Promise.all(scripts)).some((b) => b.includes("WebGLRenderer"))).toBe(false);
  });

  test("every project can still be reached with a mouse", async ({ page }) => {
    // Under `SaudiReach`'s CSS tilt the browser's hit-test disagrees with its
    // painting; the fallback picks by painted geometry instead.
    const root = await openFlat(page);
    const markers = root.locator('svg g[role="button"]');
    const count = await markers.count();
    const spots: Point[] = [];
    for (let i = 0; i < count; i++) {
      const box = (await markers.nth(i).boundingBox())!;
      const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      if (!spots.some((s) => Math.hypot(s.x - c.x, s.y - c.y) < 3)) spots.push(c);
    }
    const reached = new Set<number>();
    for (const spot of spots) {
      for (let k = 0; k < 6; k++) {
        await page.mouse.click(spot.x, spot.y);
        const index = await markers.evaluateAll((gs) =>
          gs.findIndex((g) => g.getAttribute("aria-current") === "true"),
        );
        if (index >= 0) reached.add(index);
      }
    }
    expect(reached.size).toBe(count);
  });
});

// ------------------------------------------------------------ regressions

test.describe("regressions", () => {
  test("the home page map is still there and unchanged in count", async ({ page }) => {
    await page.goto("/en");
    const presence = page.locator("#presence");
    await presence.scrollIntoViewIfNeeded();
    await expect(presence.locator('svg g[role="button"]')).toHaveCount(33);
  });

  test("the map is the page's way through the projects: no grid repeats them", async ({ page }) => {
    const { root } = await openMap(page);
    // The old card grid and its filter row are gone from the page…
    await expect(page.locator(".bento-hover")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Filter projects by sector" })).toHaveCount(1);
    // …and every project is still one click away in the map's own list.
    await expect(rows(root)).toHaveCount(44);
  });

  test.fixme("SaudiReach does not hide focusable markers from assistive tech", async ({ page }) => {
    // `SaudiReach` marks its SVG `aria-hidden="true"` while its 25 markers
    // take focus. It is a fault in that file — which this work was not
    // permitted to change — on the home page and in the projects fallback.
    // Un-`fixme` once it is fixed there.
    await page.goto("/en");
    const hidden = await page
      .locator('#presence svg[aria-hidden="true"]')
      .first()
      .evaluate((svg) => svg.querySelectorAll('[tabindex="0"]').length);
    expect(hidden).toBe(0);
  });
});
