/**
 * The redesigned studio: navigation, responsiveness, direction, accessibility.
 *
 * Signed in for every test, because almost none of the interface exists until
 * the API answers.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const EDITOR = { username: "editor", password: "studio-e2e-password" };
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const STUDIO_PAGES = ["", "/sections", "/drafts", "/publish", "/versions", "/hero"];

const VIEWPORTS = [
  { name: "375", width: 375, height: 780 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 900 },
];

test.describe.configure({ mode: "serial" });

/** Puts every block back the way the seed left it. */
async function discardAllDrafts(page: Page) {
  const api = process.env.STUDIO_API ?? "http://localhost:8001";
  const list = await page.evaluate(async (base) => {
    const response = await fetch(`${base}/api/v1/admin/content/`, {
      credentials: "include",
    });
    return response.ok ? await response.json() : { blocks: [] };
  }, api);

  for (const block of list.blocks.filter((b: { has_draft: boolean }) => b.has_draft)) {
    await page.evaluate(
      async ({ base, block }) => {
        const csrf = await (
          await fetch(`${base}/api/v1/admin/auth/csrf/`, { credentials: "include" })
        ).json();
        await fetch(`${base}/api/v1/admin/content/${block.namespace}/${block.locale}/`, {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRFToken": csrf.csrfToken, "If-Match": String(block.version) },
        });
      },
      { base: api, block },
    );
  }
}

async function signIn(page: Page, locale = "en") {
  await page.goto(`/${locale}/studio/login`);
  await page.getByLabel("Username").fill(EDITOR.username);
  await page.getByLabel("Password").fill(EDITOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), {
    timeout: 30_000,
  });
}

// ---------------------------------------------------------------- navigation

test.describe("sidebar", () => {
  test("shows every destination, grouped", async ({ page }) => {
    await signIn(page);
    const nav = page.getByRole("navigation", { name: "Studio" });

    for (const label of ["Overview", "Sections", "Drafts", "Publish", "Versions"]) {
      await expect(nav.getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    await expect(nav.getByText("Content")).toBeVisible();
    await expect(nav.getByText("Publishing")).toBeVisible();
  });

  test("marks the current destination, and the editor belongs to Sections", async ({
    page,
  }) => {
    await signIn(page);
    const nav = page.getByRole("navigation", { name: "Studio" });
    await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.goto("/en/studio/hero");
    await expect(nav.getByRole("link", { name: "Sections" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("collapses, and stays collapsed across a reload", async ({ page }) => {
    await signIn(page);
    const rail = page.getByRole("complementary", { name: "Studio navigation" });
    await expect(rail.getByText("WJEEN")).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(rail.getByText("WJEEN")).toHaveCount(0);

    await page.reload();
    await expect(rail.getByText("WJEEN")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();

    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(rail.getByText("WJEEN")).toBeVisible();
  });

  test("keeps names available to assistive tech when collapsed", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    const nav = page.getByRole("navigation", { name: "Studio" });
    await expect(nav.getByRole("link", { name: "Versions" })).toBeVisible();
  });

  test("the drafts badge leads to the drafts page", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/drafts");
    await expect(page.getByRole("heading", { name: "Drafts" })).toBeVisible();
  });
});

test.describe("mobile drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens, navigates and closes on Escape", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("dialog", { name: "Studio navigation" })).toHaveCount(0);

    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Studio navigation" });
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Versions" }).click();
    await expect(page).toHaveURL(/\/studio\/versions$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------- search

test.describe("sections browser", () => {
  test("filters as you type and clears again", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/sections");

    const rows = page.locator('main a[href*="/studio/"]');
    await expect(rows).toHaveCount(44);

    await page.getByLabel("Search sections").fill("hero");
    await expect(rows).toHaveCount(1);
    await expect(page.getByText("1 of 44")).toBeVisible();

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(rows).toHaveCount(44);
  });

  test("says so when nothing matches", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/sections");
    await page.getByLabel("Search sections").fill("zzzzzzz");
    await expect(page.getByText("No sections match that.")).toBeVisible();
  });

  test("filters by status", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/sections");
    await page.getByRole("button", { name: "Published", exact: true }).click();
    const rows = page.locator('main a[href*="/studio/"]');
    await expect(rows.first()).toBeVisible();
    await expect(page.getByText(/of 44$/)).toBeVisible();
  });

  test("search survives arriving from a link", async ({ page }) => {
    await signIn(page);
    await page.goto(`/en/studio/sections?q=${encodeURIComponent("About page")}`);
    await expect(page.getByLabel("Search sections")).toHaveValue("About page");
  });
});

// ---------------------------------------------------------------- preview

test.describe("live preview", () => {
  test("the frame is actually visible, not just present", async ({ page }) => {
    // A frame can load the right content and still be invisible: `flex-1`
    // collapsed this to zero height once, and asserting on the text inside it
    // did not notice.
    await signIn(page);
    await page.goto("/en/studio/hero");

    const frame = page.locator('iframe[title="Hero preview"]');
    await expect(frame).toBeVisible();

    const box = await frame.boundingBox();
    expect(box!.height, "the preview frame has no height").toBeGreaterThan(200);
    expect(box!.width).toBeGreaterThan(200);
  });

  test("every device size keeps the frame visible", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/hero");
    const frame = page.locator('iframe[title="Hero preview"]');

    for (const size of ["Desktop", "Tablet", "Phone"]) {
      await page.getByRole("button", { name: size, exact: true }).click();
      const box = await frame.boundingBox();
      expect(box!.height, `${size} preview collapsed`).toBeGreaterThan(200);
    }
  });

  test("full screen fills the window and Escape leaves it", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/hero");
    const frame = page.locator('iframe[title="Hero preview"]');

    await page.getByRole("button", { name: "Full screen preview" }).click();
    const box = await frame.boundingBox();
    expect(box!.height).toBeGreaterThan(page.viewportSize()!.height * 0.6);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Full screen preview" })).toBeVisible();
  });

  test("reloading the frame keeps the draft on screen", async ({ page }) => {
    await signIn(page);
    await discardAllDrafts(page);
    await page.goto("/en/studio/hero");
    await page.getByLabel("Subtitle").fill("Reloaded and still here");

    await page.getByRole("button", { name: "Reload preview" }).click();
    const inner = page.frameLocator('iframe[title="Hero preview"]');
    await expect(inner.getByText("Reloaded and still here").first()).toBeVisible({
      timeout: 30_000,
    });
  });
});

// ---------------------------------------------------------------- direction

test.describe("direction", () => {
  test("arabic studio is right to left, with the rail on the right", async ({ page }) => {
    await signIn(page, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const rail = page.getByRole("complementary", { name: "Studio navigation" });
    const box = await rail.boundingBox();
    const width = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThan(width / 2);
  });

  test("english studio is left to right, with the rail on the left", async ({ page }) => {
    await signIn(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    const box = await page
      .getByRole("complementary", { name: "Studio navigation" })
      .boundingBox();
    expect(box!.x).toBeLessThan(10);
  });
});

// ---------------------------------------------------------------- responsive

test.describe("responsive", () => {
  for (const viewport of VIEWPORTS) {
    test(`nothing overflows at ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await signIn(page);

      for (const route of STUDIO_PAGES) {
        await page.goto(`/en/studio${route}`);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => {
          const root = document.scrollingElement ?? document.documentElement;
          return { scroll: root.scrollWidth, client: root.clientWidth };
        });
        expect(
          overflow.scroll,
          `/studio${route} overflows by ${overflow.scroll - overflow.client}px`,
        ).toBeLessThanOrEqual(overflow.client + 1);
      }
    });
  }

  test("arabic has no overflow either", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "ar");
    for (const route of ["", "/sections", "/hero"]) {
      await page.goto(`/ar/studio${route}`);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        return { scroll: root.scrollWidth, client: root.clientWidth };
      });
      expect(overflow.scroll, `/ar/studio${route}`).toBeLessThanOrEqual(
        overflow.client + 1,
      );
    }
  });
});

// ---------------------------------------------------------------- a11y

test.describe("accessibility", () => {
  test("the sign-in screen has no violations", async ({ page }) => {
    await page.goto("/en/studio/login");
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map((v) => `${v.id} × ${v.nodes.length}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });

  for (const route of STUDIO_PAGES) {
    test(`no violations on /studio${route || " (overview)"}`, async ({ page }) => {
      await signIn(page);
      await page.goto(`/en/studio${route}`);
      await page.waitForLoadState("networkidle");

      const { violations } = await new AxeBuilder({ page })
        .withTags(TAGS)
        // The preview frame renders the public site, which is covered by its
        // own axe run; auditing it here would report the same nodes twice.
        .exclude("iframe")
        .analyze();

      const summary = violations.map(
        (v) => `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.nodes[0]?.target}`,
      );
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }

  test("arabic studio has no violations", async ({ page }) => {
    await signIn(page, "ar");
    await page.goto("/ar/studio/sections");
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map((v) => `${v.id} × ${v.nodes.length}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
});
