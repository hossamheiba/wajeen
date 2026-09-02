/**
 * The studio, driven through a real browser against a real API.
 *
 * Cookies, CSRF and CORS only mean anything over real HTTP, and the preview is
 * only proof of anything when it is the site's own component rendering in a
 * real iframe. Everything here runs against `localhost:3100` talking to
 * `localhost:8001` — a different origin on the same site, exactly the shape
 * `www.wjeen.com` ↔ `api.wjeen.com` has in production.
 */

import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:8001";
const EDITOR = { username: "editor", password: "studio-e2e-password" };

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, next?: string) {
  await page.goto(`/en/studio/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Username").fill(EDITOR.username);
  await page.getByLabel("Password").fill(EDITOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Wait for the login round-trip to finish. Navigating away before the
  // cookie lands would cancel the request and leave the next page signed out.
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), {
    timeout: 30_000,
  });
}

/** Puts a block back the way the seed left it, so tests stay independent. */
async function discardAllDrafts(page: Page) {
  const list = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/admin/content/`, { credentials: "include" });
    return response.ok ? await response.json() : { blocks: [] };
  }, API);

  for (const block of list.blocks.filter((b: { has_draft: boolean }) => b.has_draft)) {
    await page.evaluate(
      async ({ api, block }) => {
        const csrf = await (
          await fetch(`${api}/api/v1/admin/auth/csrf/`, { credentials: "include" })
        ).json();
        await fetch(`${api}/api/v1/admin/content/${block.namespace}/${block.locale}/`, {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRFToken": csrf.csrfToken, "If-Match": String(block.version) },
        });
      },
      { api: API, block },
    );
  }
}

// ---------------------------------------------------------------- gate 9, 11

test("Gate 9 — an unauthenticated studio page carries no draft or admin data", async ({
  page,
}) => {
  const response = await page.goto("/en/studio/hero", { waitUntil: "domcontentloaded" });
  const html = (await response!.text()).toLowerCase();

  // Nothing that only an authenticated request could have produced: no draft,
  // no block metadata, no session material.
  for (const probe of [
    "draft_data",
    "published_data",
    "hasdraft",
    "pendingdrafts",
    "currentrevision",
    "wjeen_access",
    "wjeen_refresh",
    "csrftoken",
  ]) {
    expect(html, probe).not.toContain(probe);
  }
});

test("Gate 9 — what the studio page does inherit is already-public content", async ({
  page,
}) => {
  /**
   * A known and deliberate limitation, tested rather than hidden.
   *
   * `[locale]/layout.tsx` wraps the whole locale tree in a
   * `NextIntlClientProvider` with no `messages` prop, so next-intl serialises
   * the full published message tree into every page under it — the studio
   * included. Those are the same bytes the public pages already ship.
   *
   * Removing them would mean changing either `src/i18n/request.ts` or the
   * public site's data flow, both frozen for 3C, or moving the studio out of
   * the `[locale]` tree, which is a bigger change than 3C approved.
   */
  const studio = await (await page.goto("/en/studio/hero"))!.text();
  const publicPage = await (await page.goto("/en/about"))!.text();

  const probe = "General contracting";
  expect(publicPage, "the probe must be public content").toContain(probe);
  expect(studio, "studio inherits the published tree").toContain(probe);
});

test("Gate 9 — the studio is marked noindex by the proxy", async ({ page }) => {
  const response = await page.goto("/en/studio");
  expect(response!.headers()["x-robots-tag"]).toContain("noindex");
  expect(response!.headers()["x-frame-options"]).toBe("DENY");
});

test("an unauthenticated visit is sent to the login screen", async ({ page }) => {
  await page.goto("/en/studio");
  await expect(page).toHaveURL(/\/en\/studio\/login\?next=/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("Gate 11 — login, cookie, authenticated request, end to end", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/en\/studio$/);
  await expect(page.getByRole("heading", { name: "Sections" })).toBeVisible();

  // The session cookie exists, belongs to the API host, and JS cannot read it.
  // The cookie is scoped to the admin path, so ask for that exact URL --
  // which is itself the point: it is never attached to the public read.
  const cookies = await page.context().cookies(`${API}/api/v1/admin/content/`);
  const access = cookies.find((cookie) => cookie.name === "wjeen_access");
  expect(access).toBeDefined();
  expect(access!.httpOnly).toBe(true);
  expect(access!.sameSite).toBe("Strict");
  expect(access!.path).toBe("/api/v1/admin");
  expect(await page.evaluate(() => document.cookie)).not.toContain("wjeen_access");

  // And it really is absent from the public content read.
  const publicScoped = await page.context().cookies(`${API}/api/v1/content/en/`);
  expect(publicScoped.map((cookie) => cookie.name)).not.toContain("wjeen_access");
});

test("bad credentials are refused", async ({ page }) => {
  await page.goto("/en/studio/login");
  await page.getByLabel("Username").fill("editor");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("not accepted");
});

test("a non-staff account cannot sign in", async ({ page }) => {
  await page.goto("/en/studio/login");
  await page.getByLabel("Username").fill("visitor");
  await page.getByLabel("Password").fill(EDITOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("not accepted");
});

// ---------------------------------------------------------------- gate 13

test("Gate 13 — ?next= cannot bounce the browser off-site", async ({ page }) => {
  await signIn(page, "https://evil.example/steal");
  await expect(page).toHaveURL(/localhost:3100\/en\/studio$/);
});

test("?next= does carry a genuine studio path", async ({ page }) => {
  await signIn(page, "/en/studio/versions");
  await expect(page).toHaveURL(/\/en\/studio\/versions$/);
});

// ---------------------------------------------------------------- gates 1-4

test("Gates 1-4 — all 44 entries are listed and every one opens", async ({ page }) => {
  await signIn(page);
  const links = page.locator('main a[href*="/studio/"]');
  await expect(links).toHaveCount(44);

  const hrefs = await links.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href")!),
  );
  expect(new Set(hrefs).size).toBe(44);

  // The four plain namespaces are present and marked as having no preview.
  for (const plain of ["nav", "footer", "meta", "notFound"]) {
    expect(hrefs).toContain(`/en/studio/${plain}`);
  }
  await expect(page.getByText("no preview")).toHaveCount(4);
});

// ---------------------------------------------------------------- editing

test("editing drives the real section in the preview iframe", async ({ page }) => {
  await signIn(page);
  await discardAllDrafts(page);
  await page.goto("/en/studio/hero");

  const subtitle = page.getByLabel("Subtitle");
  await expect(subtitle).toBeVisible();

  // Assert against whatever the block actually holds rather than a literal, so
  // the test does not depend on what an earlier test published.
  const current = await subtitle.inputValue();
  const frame = page.frameLocator('iframe[title="Hero preview"]');
  await expect(frame.getByText(current.slice(0, 40), { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });

  await subtitle.fill("Edited live in the studio");
  await expect(frame.getByText("Edited live in the studio").first()).toBeVisible();
});

test("a nested namespace is edited relative to its root", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/pillarGridValues");
  // careersPage.values → the row is careersPage, the path is values.
  await expect(page.getByText("careersPage → values")).toBeVisible();
});

test("the four entity arrays are read-only", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/projectsGrid");
  await expect(page.getByText("Managed as database entities")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add item" })).toHaveCount(0);
});

test("a plain namespace edits without a preview", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/nav");
  await expect(page.getByText("not a rendered section")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("saving a draft leaves published content alone, and discarding restores it", async ({
  page,
}) => {
  await signIn(page);
  await discardAllDrafts(page);
  await page.goto("/en/studio/hero");

  const published = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, API);

  await page.getByLabel("Subtitle").fill("A draft, not published");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();

  // Gate 15: the public read is untouched by a draft.
  const stillPublished = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, API);
  expect(stillPublished).toBe(published);

  await page.getByRole("button", { name: "Discard draft" }).click();
  await expect(page.getByText("Published content is unchanged")).toBeVisible();

  const afterDiscard = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, API);
  expect(afterDiscard).toBe(published);
});

test("Gate 14 — a stale block version surfaces as a conflict, not a silent overwrite", async ({
  page,
}) => {
  await signIn(page);
  await discardAllDrafts(page);
  await page.goto("/en/studio/hero");
  await expect(page.getByLabel("Subtitle")).toBeVisible();

  // Someone else edits the same block while this form is open.
  await page.evaluate(async (api) => {
    const csrf = await (
      await fetch(`${api}/api/v1/admin/auth/csrf/`, { credentials: "include" })
    ).json();
    const block = await (
      await fetch(`${api}/api/v1/admin/content/hero/en/`, { credentials: "include" })
    ).json();
    await fetch(`${api}/api/v1/admin/content/hero/en/`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf.csrfToken,
        "If-Match": String(block.version),
      },
      body: JSON.stringify({ path: "", patch: { subtitle: "written by someone else" } }),
    });
  }, API);

  await page.getByLabel("Subtitle").fill("my edit, made against a stale version");
  await page.getByRole("button", { name: "Save draft" }).click();

  await expect(page.locator('[role="alert"]').filter({ hasText: "Someone else" }))
    .toContainText("Someone else changed this block");
  await expect(
    page.getByRole("button", { name: /Reload the latest/ }),
  ).toBeVisible();
});

// ---------------------------------------------------------------- gate 12

test("Gate 12 — a 401 triggers exactly one refresh and one retry", async ({ page }) => {
  await signIn(page);

  const refreshes: string[] = [];
  const retries: string[] = [];
  let forced = false;

  await page.route(`${API}/api/v1/admin/**`, async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/refresh/")) {
      refreshes.push(url);
      // Let the real refresh happen so the retry can succeed.
      await route.continue();
      return;
    }
    if (url.includes("/content/") && !forced) {
      forced = true;
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "expired" }),
      });
      return;
    }
    if (url.includes("/content/") && forced) retries.push(url);
    await route.continue();
  });

  await page.goto("/en/studio");
  await expect(page.getByRole("heading", { name: "Sections" })).toBeVisible({ timeout: 30_000 });

  expect(refreshes).toHaveLength(1);
  expect(retries.length).toBeGreaterThanOrEqual(1);
});

test("a session that cannot be refreshed lands on the login screen", async ({ page }) => {
  await signIn(page);
  await page.context().clearCookies();
  await page.goto("/en/studio/versions");
  await expect(page).toHaveURL(/\/en\/studio\/login\?next=/);
});

// ---------------------------------------------------------------- publish

test("publish promotes drafts, clears them, and appends a revision", async ({ page }) => {
  await signIn(page);
  await discardAllDrafts(page);

  // Both locales, so parity holds and the backend accepts the publish.
  for (const [locale, value] of [
    ["en", "Published from the studio"],
    ["ar", "نُشر من الاستوديو"],
  ] as const) {
    await page.goto(`/en/studio/hero`);
    await page.getByRole("button", { name: `Edit in ${locale}` }).click();
    await expect(page.getByLabel("Subtitle")).toBeVisible();
    await page.getByLabel("Subtitle").fill(value);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
  }

  await page.goto("/en/studio/publish");
  await expect(page.getByText("Locale parity holds")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Publish 2 drafts/ }).click();
  await expect(page.getByText(/Published as revision v\d+/)).toBeVisible({ timeout: 30_000 });

  const live = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, API);
  expect(live).toBe("Published from the studio");

  await page.goto("/en/studio");
  await expect(page.getByText("0 drafts")).toBeVisible();
});

test("rollback appends a revision and restores the earlier content", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/versions");

  await page.getByRole("button", { name: /^v1/ }).click();
  await expect(page.getByText(/Restoring v1/)).toBeVisible();
  await page.getByRole("button", { name: /Restore v1 as a new revision/ }).click();
  await expect(page.getByText(/Restored v1 as new revision/)).toBeVisible({ timeout: 30_000 });

  const live = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, API);
  expect(live).toContain("General contracting");

  // History grew forward: v1 is still there and is no longer current.
  await expect(page.getByText("rollback").first()).toBeVisible();
});

// ---------------------------------------------------------------- gate 8

test.describe("Gate 8 — preview protocol v1", () => {
  test("the iframe announces itself and the studio answers without a keystroke", async ({
    page,
  }) => {
    await signIn(page);
    await discardAllDrafts(page);
    await page.goto("/en/studio/hero");

    // Nothing is typed here. The content only reaches the frame because it
    // announced `ready` and the studio replied with an `update`.
    const current = await page.getByLabel("Subtitle").inputValue();
    const frame = page.frameLocator('iframe[title="Hero preview"]');
    await expect(frame.getByText(current.slice(0, 40), { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("a message for the wrong namespace is refused and reported back", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/hero");
    await expect(page.getByLabel("Subtitle")).toBeVisible();

    await page.evaluate(() => {
      const frame = document.querySelector("iframe") as HTMLIFrameElement;
      frame.contentWindow!.postMessage(
        {
          type: "wjeen:preview:update",
          v: 1,
          locale: "en",
          namespace: "somethingElse",
          data: {},
        },
        window.location.origin,
      );
    });

    await expect(page.getByText(/This frame renders "hero", received "somethingElse"/)).toBeVisible();
  });

  test("a message from a different protocol version is ignored", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/studio/hero");
    const subtitle = page.getByLabel("Subtitle");
    await expect(subtitle).toBeVisible();
    const before = await subtitle.inputValue();

    await page.evaluate(() => {
      const frame = document.querySelector("iframe") as HTMLIFrameElement;
      frame.contentWindow!.postMessage(
        {
          type: "wjeen:preview:update",
          v: 99,
          locale: "en",
          namespace: "hero",
          data: { subtitle: "from a future studio" },
        },
        window.location.origin,
      );
    });

    // Neither applied nor reported: an unknown version is simply not ours.
    await expect(page.getByText(/This frame renders/)).toHaveCount(0);
    const frame = page.frameLocator('iframe[title="Hero preview"]');
    await expect(frame.getByText("from a future studio")).toHaveCount(0);
    expect(await subtitle.inputValue()).toBe(before);
  });

  test("the preview route only serves the 40 previewable sections", async ({ page }) => {
    // `nav` is a studio entry but not a section, so it must not resolve here.
    const response = await page.goto("/en/__preview/nav");
    expect(response!.status()).toBe(404);
  });

  test("a previewable section resolves on its own", async ({ page }) => {
    const response = await page.goto("/en/__preview/pillarGridValues");
    expect(response!.status()).toBe(200);
  });
});
