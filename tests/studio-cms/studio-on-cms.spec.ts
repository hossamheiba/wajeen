/**
 * The studio, on a site that reads its text from the CMS.
 *
 * The main suite drives the studio against a site serving bundled messages;
 * the content harness drives the CMS-sourced site with no studio in the build.
 * This is the configuration production actually ships — origin known at build,
 * studio present, `WJEEN_CONTENT_SOURCE=cms` — and the one place where an edit
 * can be followed from the editor's own form all the way to the public page.
 *
 * Isolated exactly like the content harness: database `wjeen_cms_studio_e2e`
 * on :8021, site on :3131, dropped and released when the run ends. It cannot
 * touch :3000, :8001, the development database or the studio suite's own.
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page } from "@playwright/test";

const CMS = "http://localhost:8021";
const ADMIN = `${CMS}/api/v1/admin`;
const SITE = "http://localhost:3131";
const EDITOR = { username: "content-e2e", password: "content-e2e-password" };

const stamp = Date.now();
const DRAFT_ONLY = `STUDIO-DRAFT-${stamp}`;
const PUBLISHED = `STUDIO-PUBLISHED-${stamp}`;

/** Selectors deliberately copied from tests/studio/flow.spec.ts. */
async function signIn(page: Page) {
  await page.goto("/en/studio/login");
  await page.getByLabel("Username").fill(EDITOR.username);
  await page.getByLabel("Password").fill(EDITOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), { timeout: 30_000 });
}

async function editSubtitle(page: Page, locale: string, value: string) {
  // The studio's own chrome stays in English; `Edit in ar` switches which
  // locale of the *content* the form is bound to. Going to /ar/studio would
  // translate the buttons too, which is a different thing to test and the main
  // suite already does.
  await page.goto("/en/studio/hero");
  await page.getByRole("button", { name: `Edit in ${locale}` }).click();
  await expect(page.getByLabel("Subtitle")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Subtitle").fill(value);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 30_000 });
}

/** The public page, read straight from the server. */
async function publicPage(path = "/en") {
  const anonymous = await playwrightRequest.newContext();
  const body = await (await anonymous.get(`${SITE}${path}`)).text();
  await anonymous.dispose();
  return body;
}

/** The revalidation window is two seconds; a publish still needs a moment. */
async function eventually(text: string, path = "/en", budgetMs = 60_000) {
  // Each locale is its own cache entry with its own window, so a value that has
  // reached /en has not necessarily reached /ar yet.
  const deadline = Date.now() + budgetMs;
  let last = "";
  while (Date.now() < deadline) {
    last = await publicPage(path);
    if (last.includes(text)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  expect(last, `"${text}" never reached ${path}`).toContain(text);
}

test.describe.configure({ mode: "serial" });

test("the studio exists in this build, and signs in", async ({ page }) => {
  // The same routes 404 in the content harness's build. That is the whole
  // difference between the two, and it is configuration, not code.
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 30_000 });
});

test("it loads content from the CMS into the editor", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/hero");
  const subtitle = page.getByLabel("Subtitle");
  await expect(subtitle).toBeVisible({ timeout: 30_000 });

  // What the form holds is what the public API serves — same source, one hop.
  const published = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, CMS);
  expect(await subtitle.inputValue()).toBe(published);
});

test("a draft saves, and stays out of the public site", async ({ page }) => {
  await signIn(page);
  await editSubtitle(page, "en", DRAFT_ONLY);

  // The editor sees it.
  const draft = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/admin/preview/en/`, { credentials: "include" });
    return (await response.json()).hero.subtitle;
  }, CMS);
  expect(draft).toBe(DRAFT_ONLY);

  // The public API and the public page do not.
  const live = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, CMS);
  expect(live).not.toBe(DRAFT_ONLY);
  expect(await publicPage()).not.toContain(DRAFT_ONLY);
});

test("publishing from the studio reaches the public page", async ({ page }) => {
  await signIn(page);
  // Both locales, because a publish refuses to ship one language ahead of the
  // other and the publish screen says so.
  await editSubtitle(page, "en", PUBLISHED);
  await editSubtitle(page, "ar", `${PUBLISHED}-AR`);

  await page.goto("/en/studio/publish");
  await expect(page.getByText("Both languages are complete")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Publish \d+ change/ }).click();
  await page.getByRole("button", { name: "Yes, publish now" }).click();
  await expect(page.getByText(/Published as version #\d+/)).toBeVisible({ timeout: 30_000 });

  // API first, then the page the visitor gets.
  const live = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/content/en/`);
    return (await response.json()).hero.subtitle;
  }, CMS);
  expect(live).toBe(PUBLISHED);

  await eventually(PUBLISHED);
  await eventually(`${PUBLISHED}-AR`, "/ar");
  expect(await publicPage("/en"), "the English page keeps English").not.toContain(
    `${PUBLISHED}-AR`,
  );
});

test("the revisions screen lists what was just published", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/versions");
  await expect(page.getByRole("button", { name: /^#2/ })).toBeVisible({ timeout: 30_000 });

  const versions = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/admin/versions/`, { credentials: "include" });
    return (await response.json()).versions;
  }, CMS);
  expect(versions.length).toBeGreaterThanOrEqual(2);
  expect(versions.filter((v: { is_current: boolean }) => v.is_current)).toHaveLength(1);
});

test("the preview frame renders inside the editor", async ({ page }) => {
  await signIn(page);
  await page.goto("/en/studio/hero");
  await expect(page.locator("iframe")).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2_000);
  expect(page.frames().length, "the preview iframe must be mounted").toBeGreaterThan(1);

  // And the preview route itself is still unlisted and unembeddable elsewhere.
  const response = await page.request.get(`${SITE}/en/__preview/hero`);
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
});

// ------------------------------------------------------------------ security

test("nothing privileged is reachable without a session", async () => {
  const anonymous = await playwrightRequest.newContext({ extraHTTPHeaders: { Origin: SITE } });

  for (const path of ["/content/", "/preview/en/", "/versions/"]) {
    expect((await anonymous.get(`${ADMIN}${path}`)).status(), path).toBe(401);
  }
  expect((await anonymous.post(`${ADMIN}/publish/`, { data: {} })).status()).toBe(401);

  // With a session but no CSRF token echoed back, a mutation is still refused.
  await anonymous.get(`${ADMIN}/auth/csrf/`);
  const { cookies } = await anonymous.storageState();
  const token = cookies.find((cookie) => cookie.name === "wjeen_csrftoken")?.value ?? "";
  expect((await anonymous.post(`${ADMIN}/auth/login/`, { data: EDITOR, headers: { "X-CSRFToken": token } })).status()).toBe(200);
  expect(
    (await anonymous.post(`${ADMIN}/publish/`, { data: {} })).status(),
    "CSRF must still be enforced on a mutating call",
  ).toBe(403);

  await anonymous.dispose();
});

test("an unauthenticated studio page carries no content of its own", async ({ page }) => {
  const markup = await (await page.request.get(`${SITE}/en/studio/hero`)).text();
  for (const trace of ["draft_data", "published_data", "hasDraft", "pendingDrafts", DRAFT_ONLY]) {
    expect(markup.toLowerCase(), `studio shell leaked ${trace}`).not.toContain(trace.toLowerCase());
  }
});

test("no secret reaches the browser bundle", async ({ page, request }) => {
  const scriptsOn = async (path: string) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    return page.evaluate(() =>
      [...document.querySelectorAll("script[src]")].map((node) => (node as HTMLScriptElement).src),
    );
  };
  const bodies = async (srcs: string[]) =>
    (await Promise.all(srcs.map(async (src) => (await request.get(src)).text()))).join("");

  const publicScripts = await scriptsOn("/en");
  const studioScripts = await scriptsOn("/en/studio/login");
  expect(publicScripts.length).toBeGreaterThan(0);
  expect(studioScripts.length).toBeGreaterThan(0);

  for (const src of [...publicScripts, ...studioScripts]) {
    const body = await (await request.get(src)).text();
    expect(body, `${src} carries the editor password`).not.toContain(EDITOR.password);
    expect(body, `${src} carries the inquiry token`).not.toContain("content-e2e-inquiry-token");
    expect(body, `${src} carries a mail provider key`).not.toMatch(/re_[A-Za-z0-9]{16,}/);
    expect(body, `${src} carries a Django secret`).not.toContain("DJANGO_SECRET_KEY");
  }

  // The origin is inlined for the studio's client — it has to be, that is what
  // the build-time variable is for — and it is a bare URL carrying nothing.
  const studioBundle = await bodies(studioScripts);
  expect(studioBundle, "the studio's client must know where the CMS is").toContain("localhost:8021");
  expect(studioBundle).not.toMatch(/localhost:8021[^"' )]*[?&](token|key|secret|password)/i);

  // And the public page never loads that chunk at all: the visitor's bundle
  // has no reason to know the CMS exists, and does not.
  const publicBundle = await bodies(publicScripts);
  expect(publicBundle, "the public bundle should not name the CMS").not.toContain("localhost:8021");
});

test("the public site still falls back when the CMS goes quiet", async ({ page }) => {
  // Not an outage — the outage instances live in the content harness, which is
  // the only place an origin can be repointed. What is checked here is that
  // this build serves the published tree and still carries the bundled
  // messages underneath it: no raw key can reach a visitor.
  const markup = await publicPage();
  for (const key of ["hero.subtitle", "nav.contact", "meta.description"]) {
    expect(markup, `raw key ${key} rendered`).not.toContain(key);
  }
  expect(markup).toContain(PUBLISHED);

  await page.goto("/ar", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
