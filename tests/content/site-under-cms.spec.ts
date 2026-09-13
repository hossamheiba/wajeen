/**
 * Phase 2B — the whole site, running on the CMS.
 *
 * `cms-content.spec.ts` proves the pipeline: that a published value travels
 * from the studio to the page. This file asks the other question, the one that
 * decides whether the flag could ever be turned on: with every word of text
 * arriving over HTTP from Django instead of from the bundle, does the site
 * still *work* — every page, both languages, both directions, navigation,
 * forms, the map, images, metadata, the 404, phone and desktop, the studio and
 * the preview.
 *
 * Everything runs against :3112 — WJEEN_CONTENT_SOURCE=cms, CMS on :8011,
 * three second revalidation window. The database is that instance's own and is
 * dropped when the run ends; no development or production data is reachable
 * from here, and mail is emptied in tests/content/serve.sh so no submission can
 * reach a provider.
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import en from "../../src/messages/en.json";

const CMS = "http://localhost:8011";
const ADMIN = `${CMS}/api/v1/admin`;
const SITE = "http://localhost:3112";
const USER = { username: "content-e2e", password: "content-e2e-password" };

/** Routes the site actually publishes, from src/app/sitemap.ts. */
const ROUTES = ["", "/leaders", "/story", "/values", "/business", "/projects", "/contact", "/careers"];

/** One publish drives the whole file; every sentinel is checked somewhere. */
const stamp = Date.now();
const CMS_TEXT = {
  heroSubtitle: `CMS-HERO-${stamp}`,
  metaDescription: `CMS-META-${stamp}`,
  navContact: `CMS-NAV-${stamp}`,
  notFoundTitle: `CMS-404-${stamp}`,
  projectTitle: `CMS-PROJECT-${stamp}`,
  formName: `CMS-FORM-${stamp}`,
};

let cms: APIRequestContext;

async function csrf(context: APIRequestContext) {
  const { cookies } = await context.storageState();
  return cookies.find((cookie) => cookie.name === "wjeen_csrftoken")?.value ?? "";
}

async function signIn() {
  const context = await playwrightRequest.newContext({ extraHTTPHeaders: { Origin: SITE } });
  await context.get(`${ADMIN}/auth/csrf/`);
  const response = await context.post(`${ADMIN}/auth/login/`, {
    data: USER,
    headers: { "X-CSRFToken": await csrf(context) },
  });
  expect(response.status()).toBe(200);
  return context;
}

async function patch(namespace: string, locale: string, body: Record<string, unknown>) {
  const block = await (await cms.get(`${ADMIN}/content/${namespace}/${locale}/`)).json();
  const response = await cms.patch(`${ADMIN}/content/${namespace}/${locale}/`, {
    data: { path: "", patch: body },
    headers: { "X-CSRFToken": await csrf(cms), "If-Match": String(block.version) },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function publish(label: string) {
  const blocks = await (await cms.get(`${ADMIN}/content/`)).json();
  const response = await cms.post(`${ADMIN}/publish/`, {
    data: { label },
    headers: { "X-CSRFToken": await csrf(cms), "If-Match": String(blocks.currentRevision ?? 0) },
  });
  expect(response.status(), await response.text()).toBe(201);
}

/**
 * Reload until the page carries `expected`.
 *
 * The budget clears a whole failure cooldown, not just the three second
 * revalidation window: under this harness the CMS is Django's development
 * server with five site instances and a browser on the same machine, and a
 * response that crosses the reader's 1.5s timeout arms a 30s cooldown. That is
 * the design working, so the test waits it out rather than calling it a bug.
 */
async function open(page: Page, path: string, expected?: string) {
  await page.goto(`${SITE}${path}`, { waitUntil: "domcontentloaded" });
  if (expected) {
    await expect(async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      expect(await page.content()).toContain(expected);
    }).toPass({ timeout: 60_000 });
  }
}

/** next-intl prints a key it cannot resolve; nothing else ever prints one. */
function expectNoRawKeys(markup: string, where: string) {
  for (const key of ["hero.subtitle", "meta.description", "nav.contact", "notFound.title"]) {
    expect(markup, `${where} leaked the raw key ${key}`).not.toContain(key);
  }
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  cms = await signIn();

  // One publish, six namespaces, in both languages where the page shows both.
  await patch("hero", "en", { subtitle: CMS_TEXT.heroSubtitle });
  await patch("hero", "ar", { subtitle: `${CMS_TEXT.heroSubtitle}-AR` });
  await patch("meta", "en", { description: CMS_TEXT.metaDescription });
  await patch("nav", "en", { contact: CMS_TEXT.navContact });
  await patch("notFound", "en", { title: CMS_TEXT.notFoundTitle });
  await patch("contactPage", "en", { form: { name: CMS_TEXT.formName } });
  const projects = await (await cms.get(`${ADMIN}/content/projectsPage/en/`)).json();
  const items = [...(projects.effective.items as Record<string, unknown>[])];
  items[0] = { ...items[0], title: CMS_TEXT.projectTitle };
  await patch("projectsPage", "en", { items });

  await publish("phase 2b");
});

test.afterAll(async () => {
  await cms.dispose();
});

// ------------------------------------------------------------ 1, 2, 3. pages

test("every public page renders in both languages, from the CMS", async ({ page }) => {
  for (const locale of ["en", "ar"]) {
    for (const route of ROUTES) {
      const response = await page.goto(`${SITE}/${locale}${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `/${locale}${route}`).toBe(200);
      expectNoRawKeys(await page.content(), `/${locale}${route}`);
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  }
});

test("the home page shows the text that was published, in each language", async ({ page }) => {
  await open(page, "/en", CMS_TEXT.heroSubtitle);
  await open(page, "/ar", `${CMS_TEXT.heroSubtitle}-AR`);
  // The English sentinel must not appear on the Arabic page other than as the
  // stem of the Arabic one, so check the English page keeps its own.
  await open(page, "/en");
  expect(await page.content()).not.toContain(`${CMS_TEXT.heroSubtitle}-AR`);
});

test("direction follows the locale, not the source of the words", async ({ page }) => {
  await open(page, "/en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await open(page, "/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.locator("body").evaluate((node) => getComputedStyle(node).direction),
  ).toBe("rtl");
});

// ------------------------------------------------------------ 4. navigation

test("the header is built from CMS labels and still navigates", async ({ page }) => {
  await open(page, "/en", CMS_TEXT.navContact);
  const link = page.getByRole("link", { name: CMS_TEXT.navContact }).first();
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForURL(/\/en\/contact$/);
  await expect(page.locator("form")).toBeVisible();
});

// ------------------------------------------------------------------ 9. 404

test("an unknown route is a 404 carrying CMS copy", async ({ page }) => {
  await expect(async () => {
    const response = await page.goto(`${SITE}/en/no-such-page`, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(404);
    expect(await page.content()).toContain(CMS_TEXT.notFoundTitle);
  }).toPass({ timeout: 60_000 });
});

// -------------------------------------------------------- 8. metadata / SEO

test("metadata, canonicals, hreflang and JSON-LD all read the CMS", async ({ page }) => {
  await open(page, "/en", CMS_TEXT.metaDescription);

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    CMS_TEXT.metaDescription,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  expect(await page.locator('link[rel="alternate"][hreflang]').count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

  // The organisation block is built from meta + contactPage in the layout.
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(jsonLd ?? "{}").description).toBe(CMS_TEXT.metaDescription);
});

test("the Open Graph image and the robots files still serve", async ({ request }) => {
  for (const path of ["/en/opengraph-image-1t30ir", "/sitemap.xml", "/robots.txt"]) {
    expect((await request.get(`${SITE}${path}`)).status(), path).toBe(200);
  }
});

// ------------------------------------------------------------------ 6. maps

test("the projects map draws, and lists a project the CMS renamed", async ({ page }) => {
  await open(page, "/en/projects", CMS_TEXT.projectTitle);
  await expect(page.locator("canvas").first()).toBeVisible();
  // The panel is the map's reading half; the renamed project must be in it.
  await expect(page.getByText(CMS_TEXT.projectTitle).first()).toBeVisible();
  // Deliberately no camera assertions here: geometry is the main suite's job.
});

test("the home page map is still drawn", async ({ page }) => {
  await open(page, "/en");
  await expect(page.locator("svg").first()).toBeVisible();
});

// ---------------------------------------------------------------- 7. images

test("no image is broken on the pages that carry them", async ({ page }) => {
  for (const route of ["", "/projects", "/story"]) {
    await open(page, `/en${route}`);
    // Not `networkidle`: the projects page runs a three.js canvas that never
    // lets the network go quiet. Scroll to the end so lazy images start, give
    // them a bounded moment, then ask which ones finished badly.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3_000);
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    );
    expect(broken, `broken images on /en${route}`).toEqual([]);
  }
});

// ----------------------------------------------------------------- 5. forms

test("the contact form is labelled from the CMS and validates before sending", async ({ page }) => {
  await open(page, "/en/contact", CMS_TEXT.formName);
  await expect(page.getByText(CMS_TEXT.formName).first()).toBeVisible();

  // Empty submit must not produce a request.
  let attempts = 0;
  await page.route("**/api/contact", async (route) => {
    attempts += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"id":1}' });
  });
  await page.getByRole("button", { name: /send message/i }).click();
  await page.waitForTimeout(500);
  expect(attempts, "an empty form must not reach the API").toBe(0);
});

test("a real submission is stored by the isolated CMS, and sends no mail", async ({ request }) => {
  const response = await request.post(`${SITE}/api/contact`, {
    headers: { "X-Forwarded-For": `198.51.100.${(stamp % 90) + 1}` },
    data: {
      kind: "contact",
      idempotencyKey: crypto.randomUUID(),
      name: "Phase 2B",
      email: "phase2b@example.invalid",
      phone: "+966500000000",
      company: "",
      sendTo: "ceo",
      message: "Stored by the isolated CMS during the Phase 2B run.",
      companyName: "",
      city: "",
      serviceType: "",
      isAramcoVendor: false,
      aramcoVendorId: "",
    },
  });
  expect(response.status(), await response.text()).toBe(200);

  // It is in the isolated database, and its notification failed for the only
  // acceptable reason: this harness has no mail configuration at all.
  const inbox = await (await cms.get(`${ADMIN}/inquiries/?kind=contact`)).json();
  const rows = (inbox.results ?? inbox) as Array<Record<string, unknown>>;
  const mine = rows.find((row) => row.email === "phase2b@example.invalid");
  expect(mine, "the submission must be in the inbox").toBeTruthy();
  expect(mine?.notified, "nothing may have been delivered").toBeFalsy();
});

// ------------------------------------------------------- 10. phone + desktop

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`nothing overflows sideways at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const locale of ["en", "ar"]) {
      for (const route of ["", "/projects", "/contact"]) {
        await open(page, `/${locale}${route}`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `/${locale}${route} at ${viewport.width}px`).toBeLessThanOrEqual(1);
      }
    }
  });
}

// --------------------------------------------------------- 11, 12. studio

test("the studio is absent from a build with no CMS pointed at it", async ({ request }) => {
  // Not a gap in the site — a designed one. `STUDIO_CONFIGURED` in
  // src/lib/studio/api.ts 404s every studio route unless
  // NEXT_PUBLIC_CMS_API_URL had a value at BUILD time, so that a production
  // build ships no sign-in screen until the API really exists.
  //
  // This harness must leave that variable unset, because Next inlines it into
  // the server bundle too and the outage instances would then read the live
  // CMS (see tests/content/serve.sh). So the studio cannot be driven here, and
  // asserting what actually happens is worth more than pretending otherwise:
  // the main suite covers studio behaviour against a build that sets it.
  for (const path of ["/en/studio", "/en/studio/login", "/ar/studio/sections"]) {
    expect((await request.get(`${SITE}${path}`)).status(), path).toBe(404);
  }

  // And the public site is untouched by that absence.
  expect((await request.get(`${SITE}/en`)).status()).toBe(200);
});

test("the preview route renders and stays out of search results", async ({ page, request }) => {
  const response = await request.get(`${SITE}/en/__preview/hero`);
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");

  // The host's outer wrapper is hidden until the studio sends it a tree, so
  // visibility is the wrong question. The right one is whether the route
  // rendered the published content — the same source the public pages use.
  await page.goto(`${SITE}/en/__preview/hero`, { waitUntil: "domcontentloaded" });
  await expect(async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    expect(await page.content()).toContain(CMS_TEXT.heroSubtitle);
  }).toPass({ timeout: 60_000 });
});

// ------------------------------------------------------- security / isolation

test("a draft cannot be reached from the public side", async ({ request }) => {
  const secret = `CMS-DRAFT-${Date.now()}`;
  await patch("hero", "en", { subtitle: secret });

  // Published API and the page both keep the published value.
  const published = await (await request.get(`${CMS}/api/v1/content/en/`)).json();
  expect(published.hero.subtitle).toBe(CMS_TEXT.heroSubtitle);

  const page = await (await request.get(`${SITE}/en`)).text();
  expect(page).not.toContain(secret);

  // And the draft endpoint is not public.
  const anonymous = await playwrightRequest.newContext();
  expect((await anonymous.get(`${ADMIN}/preview/en/`)).status()).toBe(401);
  expect((await anonymous.get(`${ADMIN}/content/`)).status()).toBe(401);
  await anonymous.dispose();
});

test("the reader only ever talks to the public content endpoint", async () => {
  const source = readFileSync("src/lib/content.ts", "utf8");
  // Comments stripped first: the file *documents* that drafts live behind an
  // authenticated admin endpoint, and that sentence must not be mistaken for
  // the code reaching one.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  expect(code).toContain("/api/v1/content/");
  expect(code, "no admin path may appear in the public reader").not.toContain("/admin/");
  expect(code, "the reader must not carry credentials").not.toMatch(/token|password|secret/i);
  expect(code, "and must never ask for drafts").not.toMatch(/draft/i);
  expect(code, "and must not send cookies to the CMS").not.toMatch(/credentials\s*:/);
});

test("no secret reaches the browser bundle", async ({ page, request }) => {
  await page.goto(`${SITE}/en`, { waitUntil: "networkidle" });
  const scripts = await page.evaluate(() =>
    [...document.querySelectorAll("script[src]")].map((node) => (node as HTMLScriptElement).src),
  );
  expect(scripts.length).toBeGreaterThan(0);

  for (const src of scripts) {
    const body = await (await request.get(src)).text();
    expect(body, `${src} carries the inquiry token`).not.toContain("content-e2e-inquiry-token");
    expect(body, `${src} carries the CMS password`).not.toContain(USER.password);
    expect(body, `${src} carries a mail provider key`).not.toMatch(/re_[A-Za-z0-9]{16,}/);
    expect(body, `${src} carries a Django secret`).not.toContain("DJANGO_SECRET_KEY");
  }

  // The one public variable is a bare origin, and that is all it is.
  const html = await (await request.get(`${SITE}/en`)).text();
  const origins = html.match(/http:\/\/localhost:8011[^"' ]*/g) ?? [];
  for (const origin of origins) {
    expect(origin).not.toMatch(/token|password|key|secret/i);
  }
});

test("authentication and CSRF are exactly as they were", async () => {
  const anonymous = await playwrightRequest.newContext({ extraHTTPHeaders: { Origin: SITE } });

  // No session at all.
  expect((await anonymous.post(`${ADMIN}/publish/`, { data: {} })).status()).toBe(401);

  // A session, but no CSRF token echoed back.
  await anonymous.get(`${ADMIN}/auth/csrf/`);
  const login = await anonymous.post(`${ADMIN}/auth/login/`, {
    data: USER,
    headers: { "X-CSRFToken": await csrf(anonymous) },
  });
  expect(login.status()).toBe(200);
  expect(
    (await anonymous.post(`${ADMIN}/publish/`, { data: {} })).status(),
    "a mutating call without the CSRF header must be refused",
  ).toBe(403);

  await anonymous.dispose();
});

test("the bundled messages are still the fallback, not a leftover", async () => {
  // The build has not stopped shipping them: this is what every outage test in
  // cms-content.spec.ts falls back to, and what keeps `json` mode possible.
  expect(en.hero.subtitle).toBeTruthy();
  expect(Object.keys(en)).toHaveLength(28);
});
