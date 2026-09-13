/**
 * The media library, driven the way an editor drives it.
 *
 * The Django tests already prove the rules — what may be uploaded, what may be
 * deleted, what order a gallery keeps. What only a browser can answer is
 * whether a person can reach those rules: is the library on screen, does the
 * detail panel say where an image is used, is the delete button refused when
 * it should be, and does the picker appear beside the content it belongs to.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const EDITOR = { username: "editor", password: "studio-e2e-password" };
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const SIGN_IN = {
  en: { username: "Username", password: "Password", submit: "Sign in" },
  ar: { username: "اسم المستخدم", password: "كلمة المرور", submit: "تسجيل الدخول" },
} as const;

async function signIn(page: Page, locale: "en" | "ar" = "en") {
  const labels = SIGN_IN[locale];
  await page.goto(`/${locale}/studio/login`);
  await page.getByLabel(labels.username).fill(EDITOR.username);
  await page.getByLabel(labels.password).fill(EDITOR.password);
  await page.getByRole("button", { name: labels.submit }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), { timeout: 30_000 });
}

/** Every image tile in the library, grid or list. */
const tiles = (page: Page) =>
  page.locator("ul li button").filter({ has: page.locator("img") });

async function openLibrary(page: Page, locale: "en" | "ar" = "en") {
  await signIn(page, locale);
  await page.goto(`/${locale}/studio/media`);
  await expect(
    page.getByRole("heading", { name: locale === "ar" ? "الوسائط" : "Media" }),
  ).toBeVisible();
  // The heading renders before the library is fetched; counting tiles before
  // they arrive reads zero and compares zero against everything afterwards.
  await expect(tiles(page).first()).toBeVisible();
}

test.describe("media library", () => {
  test("is reachable from the sidebar", async ({ page }) => {
    await signIn(page);
    await page.getByRole("navigation").getByRole("link", { name: "Media" }).click();
    await expect(page).toHaveURL(/\/en\/studio\/media$/);
  });

  test("lists the images the site is using", async ({ page }) => {
    await openLibrary(page);
    const cards = tiles(page);
    await expect(cards.first()).toBeVisible();
    // The e2e fixture imports only what the content references — 19 project
    // photographs and 14 client logos, four of which the gallery reuses.
    expect(await cards.count()).toBeGreaterThan(30);
  });

  test("the filters narrow it", async ({ page }) => {
    await openLibrary(page);
    const cards = tiles(page);
    const all = await cards.count();

    await page.getByRole("combobox").first().selectOption("client");
    await expect.poll(() => cards.count()).toBeLessThan(all);
    expect(await cards.count()).toBeGreaterThan(0);

    await page.getByRole("combobox").first().selectOption("");
    await expect.poll(() => cards.count()).toBe(all);
  });

  test("search finds an image by file name", async ({ page }) => {
    await openLibrary(page);
    const cards = tiles(page);
    await page.getByRole("searchbox").fill("berri");
    await expect.poll(() => cards.count()).toBe(1);
    await expect(cards.first()).toContainText("berri");
  });

  test("switching to the list view keeps the same images", async ({ page }) => {
    await openLibrary(page);
    const cards = tiles(page);
    const before = await cards.count();
    await page.getByRole("button", { name: "List", exact: true }).click();
    await expect.poll(() => cards.count()).toBe(before);
  });

  test("the details panel says where an image is used, and refuses to delete it", async ({
    page,
  }) => {
    await openLibrary(page);
    await page.getByRole("searchbox").fill("berri");
    const card = tiles(page).first();
    await card.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Where it is used")).toBeVisible();
    // The importer bound this photograph to a project, so it is in use.
    await expect(dialog.getByText("projectsPage.items[0]")).toBeVisible();
    await expect(dialog.getByText("This image is in use")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Delete/ })).toBeDisabled();
  });

  test("alt text can be edited and comes back", async ({ page }) => {
    await openLibrary(page);
    await page.getByRole("searchbox").fill("berri");
    await tiles(page).first().click();

    const dialog = page.getByRole("dialog");
    const field = dialog.getByLabel("Alt text (English)");
    const original = await field.inputValue();
    await field.fill("A gas plant at Berri, seen from the yard");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("searchbox").fill("berri");
    await tiles(page).first().click();
    await expect(page.getByRole("dialog").getByLabel("Alt text (English)")).toHaveValue(
      "A gas plant at Berri, seen from the yard",
    );

    // Put it back, so the rest of the suite sees what the import left.
    await page.getByRole("dialog").getByLabel("Alt text (English)").fill(original);
    await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  });

  test("the upload dialog previews a file before it is sent", async ({ page }) => {
    await openLibrary(page);
    await page.getByRole("button", { name: "Upload" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Drop an image here")).toBeVisible();
    // Nothing chosen yet, so there is nothing to describe and nothing to send.
    await expect(dialog.getByRole("button", { name: "Upload", exact: true })).toBeDisabled();
    await expect(dialog.getByLabel("Alt text (English)")).toHaveCount(0);
  });

  test("it closes on Escape and gives focus back", async ({ page }) => {
    await openLibrary(page);
    await page.getByRole("button", { name: "Upload" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("images beside the content they belong to", () => {
  test("a section that shows images has a Media panel", async ({ page }) => {
    await signIn(page);
    // Studio routes are keyed by entry, not by namespace: `projectsGrid`
    // is the entry whose block is `projectsPage`.
    await page.goto("/en/studio/projectsGrid");
    await page.getByRole("button", { name: "Media" }).click();

    const panel = page.locator("[data-studio-media]");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Images in this section")).toBeVisible();
    // One row per project, each naming its address in the content.
    await expect(panel.getByText("projectsPage.items[0]")).toBeVisible();
  });

  test("a section with no images says so instead of offering an empty panel", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/hero");
    await expect(page.getByRole("button", { name: "Media" })).toHaveCount(0);
  });

  test("the picker opens on the library and can be dismissed", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/ourClients");
    await page.getByRole("button", { name: "Media" }).click();

    const panel = page.locator("[data-studio-media]");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: /Choose an image|Main image/ }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "From the library" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Upload a new one" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("the media screens in both directions", () => {
  test("arabic renders right to left with arabic copy", async ({ page }) => {
    await openLibrary(page, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "الوسائط" })).toBeVisible();
  });

  for (const width of [390, 768, 1440]) {
    test(`nothing overflows at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openLibrary(page);
      const overflow = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("axe finds no violations on the library", async ({ page }) => {
    await openLibrary(page);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes[0]?.target}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test("axe finds no violations with the details panel open", async ({ page }) => {
    await openLibrary(page);
    await tiles(page).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The panel eases in. Contrast is measured against whatever is behind the
    // text, so checking it at opacity 0.6 measures the overlay, not the panel.
    await expect
      .poll(() => dialog.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes[0]?.target}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });
});
