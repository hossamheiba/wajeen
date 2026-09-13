/**
 * Images the CMS owns.
 *
 * The site's text still comes from `src/messages/*.json`; only images that an
 * editor is meant to be able to swap are resolved through the media library.
 * So the questions here are narrow and all of them are about images: does the
 * page draw the library's file, does it follow the library's order, does it
 * survive the library being wrong, and does it survive the library being gone.
 *
 * The last two matter most. A media system that breaks the page when a file
 * 404s, or when Django is down, is worse than no media system — the copies
 * under /public were working before any of this existed and must keep working
 * after it.
 */

import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";

const API = "http://localhost:8001";
const LIBRARY = /\/media\/library\//;

/** The manifest as the site would fetch it. */
async function manifest(request: APIRequestContext) {
  const response = await request.get(`${API}/api/v1/media/manifest/`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).bindings as Record<
    string,
    { cover?: { url: string }; logo?: { url: string }; gallery?: { url: string }[] }
  >;
}

/** Sign in the way the studio does, and keep the CSRF token for writes. */
async function signIn(request: APIRequestContext): Promise<string> {
  await request.get(`${API}/api/v1/admin/auth/csrf/`);
  const state = await request.storageState();
  // The cookie is named in settings, and it is not Django's default — a test
  // that looked for `csrftoken` would silently send an empty token and be
  // refused with a message about CSRF rather than about the name.
  const csrf = state.cookies.find((cookie) => cookie.name === "wjeen_csrftoken")?.value ?? "";
  expect(csrf, "the CSRF cookie should have been set").toBeTruthy();
  const response = await request.post(`${API}/api/v1/admin/auth/login/`, {
    data: { username: "editor", password: "studio-e2e-password" },
    headers: { "X-CSRFToken": csrf },
  });
  expect(response.ok(), "the e2e editor should be able to sign in").toBeTruthy();
  return csrf;
}

/** The `src` Next.js optimised — the original URL is inside it, encoded. */
function originalOf(src: string): string {
  const match = /[?&]url=([^&]+)/.exec(src);
  return match ? decodeURIComponent(match[1]) : src;
}

/**
 * Make every library file unreachable *to the browser*.
 *
 * Aborting `**\/media/library/**` alone does nothing: a managed image is
 * requested from the Next optimiser, which fetches the library server-side.
 * The request the page actually makes is `/_next/image?url=<the library URL>`,
 * so that is what has to fail.
 */
async function breakTheLibrary(page: Page) {
  const abort = (route: Route) => route.abort();
  await page.route("**/media/library/**", abort);
  await page.route("**/_next/image**", (route) => {
    const target = originalOf(route.request().url());
    return target.includes("/media/library/") ? route.abort() : route.continue();
  });
}

/**
 * Select one project and wait for its card.
 *
 * The panel lists every project; clicking a row is what a visitor does and
 * what opens the card the picture lives on. `items[0]` in the content is the
 * first row of the unfiltered list, which is the project the binding tests
 * write to.
 */
async function openProject(page: Page, index = 0) {
  await page.goto("/en/projects");
  const panel = page.locator("[data-map-panel]");
  await panel.scrollIntoViewIfNeeded();
  const rows = panel.locator("ul li button").filter({ visible: true });
  await rows.nth(index).waitFor();
  await rows.nth(index).click();
  const media = page.locator("[data-project-media]").filter({ visible: true }).first();
  await media.waitFor();
  return media;
}

test.describe("images come from the library", () => {
  test("the manifest is served and addressed by content path", async ({ request }) => {
    const bindings = await manifest(request);
    expect(Object.keys(bindings).length).toBeGreaterThan(30);
    expect(bindings["projectsPage.items[0]"]?.cover?.url).toMatch(LIBRARY);
    expect(bindings["clients.items[0]"]?.logo?.url).toMatch(LIBRARY);
  });

  test("client logos on the home page are the library's files", async ({ page }) => {
    await page.goto("/en");
    const logos = page.locator('img[data-managed="true"]');
    await expect(logos.first()).toBeVisible();
    expect(await logos.count()).toBeGreaterThan(10);

    const src = (await logos.first().getAttribute("src")) ?? "";
    expect(originalOf(src)).toMatch(LIBRARY);
  });

  test("a project card draws the library's photograph", async ({ page }) => {
    const media = await openProject(page);
    await expect(media).toHaveAttribute("data-project-media", "managed");

    const src = (await media.locator("img").getAttribute("src")) ?? "";
    expect(originalOf(src)).toMatch(LIBRARY);
  });

  test("alt text comes from the library, in the reader's language", async ({ page, request }) => {
    const bindings = await manifest(request);
    const expected = (bindings as Record<string, { logo?: { url: string } }>)["clients.items[0]"];
    expect(expected?.logo?.url).toBeTruthy();

    await page.goto("/ar");
    const logo = page.locator('img[data-managed="true"]').first();
    await expect(logo).toBeVisible();
    // The importer took each client's alt text from the content, so the
    // Arabic page must not be showing the English name.
    const alt = (await logo.getAttribute("alt")) ?? "";
    expect(alt.length).toBeGreaterThan(0);
    expect(alt).toMatch(/[؀-ۿ]/);
  });

  test("no page is left with a broken image", async ({ page }) => {
    for (const route of ["/en", "/en/projects", "/ar"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const broken = await page.evaluate(() =>
        Array.from(document.images)
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
      );
      expect(broken, `${route} has broken images:\n${broken.join("\n")}`).toEqual([]);
    }
  });
});

test.describe("the library can fail without the page failing", () => {
  test("a managed file that 404s falls back to the copy under /public", async ({ page }) => {
    // Every library file is unreachable; the manifest still resolves, so the
    // page asks for a managed image and has to climb down on its own.
    await breakTheLibrary(page);

    const media = await openProject(page);
    await expect(media).toHaveAttribute("data-project-media", "photo");

    const src = (await media.locator("img").getAttribute("src")) ?? "";
    expect(originalOf(src)).toContain("/images/projects/");
  });

  test("a client logo falls back the same way", async ({ page }) => {
    await breakTheLibrary(page);
    await page.goto("/en");

    const logo = page.locator('img[data-managed="false"]').first();
    await expect(logo).toBeVisible();
    expect(originalOf((await logo.getAttribute("src")) ?? "")).toContain("/images/clients/");
  });

  test("the pages still render with every media request refused", async ({ page }) => {
    await page.route("**/media/**", (route) => route.abort());
    await page.goto("/en/projects");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});

test.describe("what the CMS holds is what the site shows", () => {
  // These write to the CMS and then wait for the page to follow, which is two
  // revalidation windows plus a map that has to boot each time.
  test.describe.configure({ timeout: 120_000 });

  /**
   * The whole point of the feature, end to end: change a binding through the
   * API the dashboard uses, and the page follows without a deploy, a rebuild
   * or a line of code.
   *
   * The site caches the manifest; `WJEEN_MEDIA_REVALIDATE` is 1s under test so
   * this does not sit waiting for the production window.
   */
  test("replacing a project's cover changes the picture on the page", async ({
    page,
    request,
  }) => {
    const csrf = await signIn(request);
    const before = await manifest(request);
    const original = before["projectsPage.items[0]"]?.cover?.url;
    expect(original).toBeTruthy();

    // Any other library file will do as the replacement.
    const assets = await (
      await request.get(`${API}/api/v1/admin/media/?category=project`)
    ).json();
    const replacement = assets.results.find(
      (asset: { url: string }) => asset.url !== original,
    );
    expect(replacement, "the library should hold more than one project photo").toBeTruthy();

    const restore = async () => {
      const previous = assets.results.find(
        (asset: { url: string }) => asset.url === original,
      );
      await request.put(`${API}/api/v1/admin/media/slot/cover/`, {
        data: { namespace: "projectsPage", path: "items[0]", asset: previous?.id ?? null },
        headers: { "X-CSRFToken": csrf },
      });
    };

    try {
      const written = await request.put(`${API}/api/v1/admin/media/slot/cover/`, {
        data: { namespace: "projectsPage", path: "items[0]", asset: replacement.id },
        headers: { "X-CSRFToken": csrf },
      });
      expect(written.ok()).toBeTruthy();

      await expect
        .poll(
          async () => {
            const now = await manifest(request);
            return now["projectsPage.items[0]"]?.cover?.url;
          },
          { timeout: 5_000 },
        )
        .toBe(replacement.url);

      await expect
        .poll(
          async () => {
            const media = await openProject(page);
            return originalOf((await media.locator("img").getAttribute("src")) ?? "");
          },
          { timeout: 15_000, message: "the page should pick up the new binding" },
        )
        .toContain(replacement.url);
    } finally {
      await restore();
    }
  });

  test("a project gallery renders in the order the CMS holds, and reorders with it", async ({
    page,
    request,
  }) => {
    const csrf = await signIn(request);
    const assets = await (
      await request.get(`${API}/api/v1/admin/media/?category=project`)
    ).json();
    const three = assets.results.slice(0, 3);
    expect(three.length).toBe(3);

    const write = async (order: { id: number }[]) => {
      const response = await request.put(`${API}/api/v1/admin/media/slot/gallery/`, {
        data: {
          namespace: "projectsPage",
          path: "items[0]",
          items: order.map((asset) => ({ asset: asset.id })),
        },
        headers: { "X-CSRFToken": csrf },
      });
      expect(response.ok()).toBeTruthy();
    };

    try {
      await write(three);
      await expect
        .poll(async () => (await manifest(request))["projectsPage.items[0]"]?.gallery?.length, {
          timeout: 5_000,
        })
        .toBe(3);

      // The card shows one control per photograph. The cover leads, and it is
      // one of the three here, so the strip is three long rather than four —
      // an image bound twice at one address is still one photograph.
      const slot = (await manifest(request))["projectsPage.items[0]"];
      const expected = new Set([slot.cover?.url, ...(slot.gallery ?? []).map((i) => i.url)]);
      expected.delete(undefined);

      await expect
        .poll(
          async () => {
            const media = await openProject(page);
            return media.getAttribute("data-gallery-size");
          },
          { timeout: 15_000 },
        )
        .toBe(String(expected.size));

      const strip = page
        .locator("[data-project-media]")
        .filter({ visible: true })
        .first()
        .locator("[data-project-gallery] button");
      await expect(strip).toHaveCount(expected.size);

      // Picking the second photograph shows the second photograph.
      const shown = async () =>
        originalOf(
          (await page
            .locator("[data-project-media]")
            .filter({ visible: true })
            .first()
            .locator("img")
            .getAttribute("src")) ?? "",
        );
      const first = await shown();
      await strip.nth(1).click();
      await expect.poll(shown, { timeout: 5_000 }).not.toBe(first);

      // Reversing the order in the CMS reverses it on the page.
      await write([...three].reverse());
      await expect
        .poll(
          async () => {
            const now = await manifest(request);
            return now["projectsPage.items[0]"]?.gallery?.map((image) => image.url);
          },
          { timeout: 5_000 },
        )
        .toEqual(expect.arrayContaining([three[2].url]));
    } finally {
      await request.put(`${API}/api/v1/admin/media/slot/gallery/`, {
        data: { namespace: "projectsPage", path: "items[0]", items: [] },
        headers: { "X-CSRFToken": csrf },
      });
    }
  });

  test("an image in use cannot be deleted", async ({ request }) => {
    const csrf = await signIn(request);
    const assets = await (
      await request.get(`${API}/api/v1/admin/media/?used=true`)
    ).json();
    const inUse = assets.results[0];
    expect(inUse, "something should be in use after the import").toBeTruthy();

    const refused = await request.delete(`${API}/api/v1/admin/media/${inUse.id}/`, {
      headers: { "X-CSRFToken": csrf },
    });
    expect(refused.status()).toBe(409);

    const body = await refused.json();
    expect(body.code).toBe("media_in_use");
    expect(body.usage.length).toBeGreaterThan(0);
  });
});
