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
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
    // The importer bound this photograph to a project, so it is in use — and
    // the panel says where in words, not as the address the binding is keyed by.
    await expect(dialog.getByText("Projects Map · row 1")).toBeVisible();
    await expect(dialog.getByText("projectsPage.items[0]")).toHaveCount(0);
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
    // Studio routes are keyed by entry, not by namespace: `projectsMap`
    // is the entry whose block is `projectsPage`.
    await page.goto("/en/studio/projectsMap");
    await page.getByRole("button", { name: "Media" }).click();

    const panel = page.locator("[data-studio-media]");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Images in this section")).toBeVisible();
    // One row per project, named the way an editor knows it — the address it
    // is keyed by belongs in the code, not on the screen.
    await expect(panel.getByText("Berri Gas Plant", { exact: false }).first()).toBeVisible();
    await expect(panel.getByText("projectsPage.items[0]")).toHaveCount(0);
  });

  test("a section with no images says so instead of offering an empty panel", async ({ page }) => {
    await signIn(page);
    // The hero used to be the example here; its backdrops are editable now,
    // so the example moved to a section that genuinely draws no picture.
    await page.goto("/en/studio/ticker");
    await expect(page.getByRole("button", { name: "Media" })).toHaveCount(0);
  });

  test("the preview shows the picture that was just picked", async ({ page }) => {
    // The preview route is `force-static`, so it cannot fetch a manifest: the
    // studio has to send the bindings down the same channel as the text. Until
    // it did, the frame drew the photograph that shipped with the build no
    // matter what the editor chose, and the only way to see a change was to
    // look at the live site.
    await signIn(page);
    await page.goto("/en/studio/hero");

    const frame = page.frameLocator("iframe[data-studio-preview], iframe");
    const backdrop = frame.locator("img[data-managed]").first();
    await expect(backdrop).toBeVisible({ timeout: 15_000 });
    await expect(backdrop).toHaveAttribute("data-managed", "true");
    await expect(backdrop).toHaveAttribute("src", /_next%2Fimage|_next\/image|\/media\//);
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

/**
 * The one hazard in letting these lists be edited: a binding's address is the
 * row's position, so a row that moves must take its pictures with it. This is
 * that promise, driven the way an editor drives it — the arrow in the list,
 * not the media panel — and read back from the manifest the site fetches.
 */
test.describe("a row takes its picture with it", () => {
  const API_BASE = "http://localhost:8001";

  const covers = async (page: Page, count: number) => {
    const response = await page.request.get(`${API_BASE}/api/v1/media/manifest/`);
    const { bindings } = (await response.json()) as {
      bindings: Record<string, { cover?: { url: string } }>;
    };
    return Array.from(
      { length: count },
      (_, index) => bindings[`projectsPage.items[${index}]`]?.cover?.url ?? null,
    );
  };

  test("moving a project up moves its photograph up", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/projectsMap");
    await page.locator("details").evaluateAll((all) =>
      all.forEach((one) => ((one as HTMLDetailsElement).open = true)),
    );

    const before = await covers(page, 4);
    await page.locator('button[aria-label="Move Item 2 up"]').first().click();

    // The binding write is immediate — bindings are not part of the draft —
    // so the manifest is the place to see it.
    await expect
      .poll(async () => (await covers(page, 4)).slice(0, 2).join("|"), { timeout: 20_000 })
      .toBe([before[1], before[0]].join("|"));

    // And back, so the suite leaves the library as it found it.
    await page.locator('button[aria-label="Move Item 1 down"]').first().click();
    await expect
      .poll(async () => (await covers(page, 4)).join("|"), { timeout: 20_000 })
      .toBe(before.join("|"));
  });
});

// -------------------------------------------------------- the people who lead

test.describe("the people who lead the company", () => {
  // Serial: every test here binds, moves or clears the same portrait, and the
  // last one hands the library back exactly as it found it.
  test.describe.configure({ mode: "serial" });

  const API_BASE = "http://localhost:8001";
  const ROOT = join(__dirname, "..", "..");
  const names = (locale: "en" | "ar"): string[] =>
    JSON.parse(readFileSync(join(ROOT, "src", "messages", `${locale}.json`), "utf8"))
      .aboutPage.leadership.members.map((member: { name: string }) => member.name);

  const portrait = async (page: Page, index: number) => {
    const response = await page.request.get(`${API_BASE}/api/v1/media/manifest/`);
    const { bindings } = (await response.json()) as {
      bindings: Record<string, { cover?: { url: string } }>;
    };
    return bindings[`aboutPage.leadership.members[${index}]`]?.cover?.url ?? null;
  };

  // A failure between "pick" and "clear" must not leave a portrait bound for
  // whoever runs next, so the library is emptied of them whatever happened.
  test.afterAll(async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const token = async () =>
      ((await (await api.get(`${API_BASE}/api/v1/admin/auth/csrf/`)).json()) as { csrfToken: string })
        .csrfToken;
    await api.post(`${API_BASE}/api/v1/admin/auth/login/`, {
      data: EDITOR,
      headers: { "X-CSRFToken": await token() },
    });
    const csrf = await token();
    for (let index = 0; index < names("en").length; index += 1) {
      await api.delete(
        `${API_BASE}/api/v1/admin/media/slot/cover/?namespace=aboutPage&path=${encodeURIComponent(
          `leadership.members[${index}]`,
        )}`,
        { headers: { "X-CSRFToken": csrf } },
      );
    }
    await api.dispose();
  });

  /** The row of the media panel that belongs to one person. */
  const rowOf = (page: Page, name: string) =>
    page.locator("[data-studio-media] li").filter({ has: page.getByText(name, { exact: true }) });

  async function openPanel(page: Page, locale: "en" | "ar" = "en") {
    await signIn(page, locale);
    await page.goto(`/${locale}/studio/leadership`);
    await page.getByRole("button", { name: locale === "ar" ? "الوسائط" : "Media" }).click();
    await expect(page.locator("[data-studio-media]")).toBeVisible();
  }

  test("each person has a row under their own name, and no other screen shows them", async ({ page }) => {
    await openPanel(page);
    const panel = page.locator("[data-studio-media]");
    for (const name of names("en")) {
      await expect(panel.getByText(name, { exact: true })).toBeVisible();
    }
    // Named the way an editor knows them, never by the address they are keyed on.
    await expect(panel.getByText("members[0]")).toHaveCount(0);
    // A person has no photograph shipped with the site, and the row says what
    // the page does instead of calling an empty frame "bundled".
    await expect(rowOf(page, names("en")[0]).getByText("No portrait yet")).toBeVisible();
    await expect(rowOf(page, names("en")[0]).getByText(/first letter of the name/)).toBeVisible();

    // The record is shared with the story, the values and the governance
    // screens. None of them may grow the people's rows.
    for (const other of ["aboutStory", "values", "governance"]) {
      await page.goto(`/en/studio/${other}`);
      await expect(page.getByRole("heading").first()).toBeVisible();
      const open = page.getByRole("button", { name: "Media" });
      if (await open.count()) {
        await open.click();
        await expect(page.locator("[data-studio-media]").getByText(names("en")[0], { exact: true })).toHaveCount(0);
      }
    }
  });

  test("a portrait picked beside the name shows in the preview and on the page", async ({ page }) => {
    await openPanel(page);
    const first = names("en")[0];

    await rowOf(page, first).getByRole("button", { name: "Choose a portrait" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("ul li button").filter({ has: page.locator("img") }).first().click();
    await expect(dialog).toBeHidden();

    // Saved on the click: a binding is not part of the draft.
    await expect(rowOf(page, first).getByText("From the library")).toBeVisible();
    await expect.poll(() => portrait(page, 0), { timeout: 20_000 }).not.toBeNull();

    // The preview frame has no way to fetch a manifest of its own; this is the
    // studio handing it one. The alt text is the person's name.
    const inFrame = page.frameLocator("iframe").locator(`img[alt="${first}"]`);
    await expect(inFrame).toBeVisible({ timeout: 20_000 });
    await expect(inFrame).toHaveAttribute("data-managed", "true");

    // And the public page, once the site's one-second window turns over.
    await expect
      .poll(
        async () => {
          const html = await (await page.request.get("/en/leaders")).text();
          const tag = html.match(new RegExp(`<img[^>]*alt="${first}"[^>]*>`))?.[0] ?? "";
          return tag.includes('data-managed="true"');
        },
        { timeout: 30_000 },
      )
      .toBe(true);

    // The others have none, and still read as a finished row.
    expect(await portrait(page, 1)).toBeNull();
    const html = await (await page.request.get("/en/leaders")).text();
    expect(html).not.toMatch(new RegExp(`<img[^>]*alt="${names("en")[1]}"`));
    expect(html, "a person without a portrait is named in the page").toContain(names("en")[1]);
  });

  test("moving a person moves their portrait, and clearing leaves the library as found", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/leadership");
    await page.locator("details").evaluateAll((all) =>
      all.forEach((one) => ((one as HTMLDetailsElement).open = true)),
    );

    const before = await portrait(page, 0);
    expect(before, "the previous test bound the first portrait").not.toBeNull();

    // The path the move writes under is the one the page reads from. A list
    // inside a shared record is stored as `leadership.members[n]`, not
    // `members[n]` -- the second spelling would move nothing, silently.
    //
    // And a picture can land on a row *past* the last one that holds a picture,
    // from either side of the swap: here there is one portrait among six
    // people, so both directions of the first move land beyond it. Written for
    // lists where every row has a picture, the move cleared the source and
    // wrote nothing at the destination -- the portrait vanished.
    const both = async () => `${await portrait(page, 0)}|${await portrait(page, 1)}`;
    const step = async (label: string, expected: string) => {
      await page.locator(`button[aria-label="${label}"]`).first().click();
      await expect.poll(both, { timeout: 20_000, message: label }).toBe(expected);
    };

    await step("Move Item 2 up", `null|${before}`); // the empty row swaps above it
    await step("Move Item 2 up", `${before}|null`); // and it is carried back
    await step("Move Item 1 down", `null|${before}`); // the picture swaps down
    await step("Move Item 2 up", `${before}|null`); // and up again

    // Hand the library back. Opened in place: the row order above is unsaved
    // local state, and navigating away from it would be a different test.
    await page.getByRole("button", { name: "Media" }).click();
    await rowOf(page, names("en")[0]).getByRole("button", { name: "Remove image" }).click();
    await expect.poll(() => portrait(page, 0), { timeout: 20_000 }).toBeNull();
  });

  test("the rows read right to left in Arabic, with the people's Arabic names", async ({ page }) => {
    await openPanel(page, "ar");
    const panel = page.locator("[data-studio-media]");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    for (const name of names("ar")) {
      await expect(panel.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(
      rowOf(page, names("ar")[0]).getByText("لا توجد صورة شخصية بعد"),
    ).toBeVisible();
  });
});

