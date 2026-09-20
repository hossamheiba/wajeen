/**
 * What only a production posture can show.
 *
 * Runs after the `editorial` project (tests/studio-cms/studio-on-cms.spec.ts)
 * against the same stack: gunicorn with DEBUG off on :8021, a separate media
 * host on :8025, one production build on :3131 reading its text from the CMS.
 * Editorial has already signed in, saved a draft and published; this file
 * picks up from there.
 *
 * Outage fallback is not repeated here. Testing it needs an origin that can be
 * repointed at run time, which only a build without the CMS URL allows — that
 * lives in tests/content/, and the code path is the same whatever server sits
 * behind the URL.
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { APIResponse, Page } from "@playwright/test";
import en from "../../src/messages/en.json";

const CMS = "http://localhost:8021";
const ADMIN = `${CMS}/api/v1/admin`;
const MEDIA = "http://localhost:8025";
const SITE = "http://localhost:3131";
const EDITOR = { username: "content-e2e", password: "content-e2e-password" };
const SECRET_KEY = process.env.PROD_E2E_SECRET_KEY ?? "";
const TOKEN = process.env.PROD_E2E_INQUIRY_TOKEN ?? "";

const ROUTES = ["", "/leaders", "/story", "/values", "/business", "/contact", "/careers"];

test.describe.configure({ mode: "serial" });

/** Every Set-Cookie on a response, as raw strings. */
function setCookies(response: APIResponse): string[] {
  return response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value);
}

function cookieValue(cookies: string[], name: string): string {
  const line = cookies.find((cookie) => cookie.startsWith(`${name}=`)) ?? "";
  return line.split(";")[0].slice(name.length + 1);
}

function expectNoRawKeys(markup: string, where: string) {
  for (const key of ["hero.subtitle", "meta.description", "nav.contact", "notFound.title"]) {
    expect(markup, `${where} rendered the raw key ${key}`).not.toContain(key);
  }
}

/**
 * Server-rendered HTML escapes `& < > " '` in text and in attribute values, so
 * a sentence with an apostrophe -- "the Kingdom's" -- never appears in the
 * markup as written. Decode the markup rather than guess React's exact entity.
 */
function decodeHtml(markup: string): string {
  return markup
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Selectors deliberately the ones tests/studio/flow.spec.ts uses. */
async function signIn(page: Page) {
  await page.goto("/en/studio/login");
  await page.getByLabel("Username").fill(EDITOR.username);
  await page.getByLabel("Password").fill(EDITOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/login"), { timeout: 30_000 });
}

// ------------------------------------------------------------ the server

test("the CMS is gunicorn with DEBUG off, and serves no media itself", async ({ request }) => {
  const content = await request.get(`${CMS}/api/v1/content/en/`);
  expect(content.status()).toBe(200);
  expect(content.headers()["server"] ?? "", "not runserver").toContain("gunicorn");

  // DEBUG off: a 404 is a 404, not a page listing every URL pattern.
  const missing = await request.get(`${CMS}/no-such-path/`);
  expect(missing.status()).toBe(404);
  const body = await missing.text();
  for (const leak of ["URLconf", "DEBUG = True", "Traceback", "urlpatterns"]) {
    expect(body, `a production 404 must not show ${leak}`).not.toContain(leak);
  }

  // And /media/ is the web server's job once DEBUG is off.
  expect((await request.get(`${CMS}/media/library/anything.jpg`)).status()).toBe(404);
});

// ------------------------------------------------------------------ media

test("images come from the media host, through next/image, onto the page", async ({ request }) => {
  const manifest = await (await request.get(`${CMS}/api/v1/media/manifest/`)).json();
  const urls = Object.values(manifest.bindings as Record<string, { cover?: { url: string } }>)
    .map((slot) => slot.cover?.url)
    .filter((url): url is string => Boolean(url));
  expect(urls.length, "the library must have bound images").toBeGreaterThan(0);
  expect(urls[0], "manifest URLs are absolute on the media host").toMatch(
    new RegExp(`^${MEDIA}/media/`),
  );

  const direct = await request.get(urls[0]);
  expect(direct.status()).toBe(200);
  expect(direct.headers()["content-type"]).toMatch(/^image\//);

  // On the page, every managed image goes through the optimiser — which only
  // accepts it because NEXT_PUBLIC_CMS_MEDIA_URL put the host on the list.
  const html = await (await request.get(`${SITE}/en`)).text();
  const optimised = [...html.matchAll(/\/_next\/image\?url=([^"&\s]+)(?:&amp;|&)w=(\d+)(?:&amp;|&)q=(\d+)/g)]
    .filter((match) => decodeURIComponent(match[1]).startsWith(`${MEDIA}/media/`));
  expect(optimised.length, "the home page must render at least one managed image").toBeGreaterThan(0);

  const [, url, width, quality] = optimised[0];
  const image = await request.get(`${SITE}/_next/image?url=${url}&w=${width}&q=${quality}`);
  expect(image.status(), "the optimiser must accept the media host").toBe(200);
  expect(image.headers()["content-type"]).toMatch(/^image\//);

  expect(html, "no page image may point at the API host's /media/").not.toContain(
    encodeURIComponent(`${CMS}/media/`),
  );
});

// ------------------------------------------------------------ public site

test("every public page renders in both languages and both directions", async ({ request }) => {
  for (const locale of ["en", "ar"]) {
    for (const route of ROUTES) {
      const response = await request.get(`${SITE}/${locale}${route}`);
      expect(response.status(), `/${locale}${route}`).toBe(200);
      const markup = await response.text();
      expectNoRawKeys(markup, `/${locale}${route}`);
      expect(markup).toContain(`<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
    }
  }
});

test("metadata, sitemap, robots and the Open Graph image", async ({ request }) => {
  const html = await (await request.get(`${SITE}/en`)).text();
  expect(decodeHtml(html)).toContain(`<meta name="description" content="${en.meta.description}"`);
  expect(html).toMatch(/<link rel="canonical"/);
  expect((html.match(/<link rel="alternate" hrefLang=/gi) ?? []).length).toBeGreaterThanOrEqual(2);
  expect(html).toMatch(/<meta property="og:image"/);

  // [\s\S] rather than the `s` flag: the project targets ES2017, which has no dotAll.
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}";
  expect(JSON.parse(jsonLd).description).toBe(en.meta.description);

  for (const path of ["/sitemap.xml", "/robots.txt", "/en/opengraph-image-1t30ir"]) {
    expect((await request.get(`${SITE}${path}`)).status(), path).toBe(200);
  }
});

test("an unknown route is a real 404, in the site's own words", async ({ request }) => {
  const response = await request.get(`${SITE}/en/no-such-page`);
  expect(response.status()).toBe(404);
  const markup = await response.text();
  expect(decodeHtml(markup)).toContain(en.notFound.title);
  expectNoRawKeys(markup, "/en/no-such-page");
});

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`nothing overflows sideways at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const path of ["/en", "/ar", "/en/contact", "/ar/business"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  });
}

// --------------------------------------------------------------- inquiries

test("an inquiry is stored with DEBUG off, and the retry job reaches it", async ({ request }) => {
  const email = `production-${Date.now()}@example.invalid`;
  const submitted = await request.post(`${SITE}/api/contact`, {
    headers: { "X-Forwarded-For": "198.51.100.77" },
    data: {
      kind: "contact",
      idempotencyKey: crypto.randomUUID(),
      name: "Production validation",
      email,
      phone: "+966500000000",
      company: "",
      sendTo: "ceo",
      message: "Stored by the production-posture CMS during the final validation.",
      companyName: "",
      city: "",
      serviceType: "",
      isAramcoVendor: false,
      aramcoVendorId: "",
    },
  });
  expect(submitted.status(), await submitted.text()).toBe(200);

  // The queue the scheduled job drains. Token-gated, server to server.
  const pending = await request.get(`${CMS}/api/v1/inquiries/pending-notification/`, {
    headers: { "X-Wjeen-Inquiry-Token": TOKEN },
  });
  expect(pending.status()).toBe(200);
  const rows = (await pending.json()).results as Array<{ email: string }>;
  expect(rows.some((row) => row.email === email), "the unsent notification is queued").toBe(true);

  // The job itself: closed without the token, working with it. Mail is emptied
  // in tests/production/serve.sh, so every attempt fails — and none is sent.
  expect((await request.post(`${SITE}/api/contact/retry`)).status()).toBe(403);
  const retried = await request.post(`${SITE}/api/contact/retry`, {
    headers: { "X-Wjeen-Inquiry-Token": TOKEN },
  });
  expect(retried.status()).toBe(200);
  const outcome = await retried.json();
  expect(outcome.ok).toBe(true);
  expect(outcome.sent, "nothing may be delivered from a test").toBe(0);
  expect(outcome.failed).toBeGreaterThanOrEqual(1);
});

// ------------------------------------------------------ auth, cookies, CSRF

let accessCookie = "";

test("session cookies are Secure, HttpOnly and SameSite=Strict with DEBUG off", async () => {
  const client = await playwrightRequest.newContext({ extraHTTPHeaders: { Origin: SITE } });

  const bootstrap = await client.get(`${ADMIN}/auth/csrf/`);
  const csrfCookies = setCookies(bootstrap);
  const csrfCookie = cookieValue(csrfCookies, "wjeen_csrftoken");
  const csrfToken = (await bootstrap.json()).csrfToken as string;
  expect(csrfCookie).toBeTruthy();
  expect(csrfCookies.join("\n")).toMatch(/wjeen_csrftoken=[^;]+;.*Secure/i);

  const login = await client.post(`${ADMIN}/auth/login/`, {
    data: EDITOR,
    headers: { "X-CSRFToken": csrfToken, Cookie: `wjeen_csrftoken=${csrfCookie}` },
  });
  expect(login.status(), await login.text()).toBe(200);

  const issued = setCookies(login);
  const access = issued.find((cookie) => cookie.startsWith("wjeen_access=")) ?? "";
  expect(access, "an access cookie must be issued").toBeTruthy();
  expect(access).toMatch(/;\s*Secure/i);
  expect(access).toMatch(/;\s*HttpOnly/i);
  expect(access).toMatch(/;\s*SameSite=Strict/i);
  expect(access).toMatch(/;\s*Path=\/api\/v1\/admin/i);
  expect(access, "host-only: no Domain attribute").not.toMatch(/;\s*Domain=/i);

  accessCookie = cookieValue(issued, "wjeen_access");
  await client.dispose();
});

test("admin endpoints need a session, and mutations need CSRF on top", async () => {
  const anonymous = await playwrightRequest.newContext({ extraHTTPHeaders: { Origin: SITE } });
  for (const path of ["/content/", "/preview/en/", "/versions/", "/inquiries/"]) {
    expect((await anonymous.get(`${ADMIN}${path}`)).status(), path).toBe(401);
  }

  // A valid session, and no CSRF header: refused.
  expect(accessCookie).toBeTruthy();
  const forged = await anonymous.post(`${ADMIN}/publish/`, {
    data: {},
    headers: { Cookie: `wjeen_access=${accessCookie}` },
  });
  expect(forged.status(), "a cookie alone must not be enough to publish").toBe(403);
  await anonymous.dispose();
});

// ---------------------------------------------------------------- rollback

test("rollback restores the earlier content, and the public page follows", async ({
  page,
  request,
}) => {
  // Editorial published over the imported baseline; revision #1 is that
  // baseline, so restoring it must bring the bundled subtitle back.
  const before = (await (await request.get(`${CMS}/api/v1/content/en/`)).json()).hero.subtitle;
  expect(before, "editorial must have published something to roll back").not.toBe(
    en.hero.subtitle,
  );

  await signIn(page);
  await page.goto("/en/studio/versions");
  await page.getByRole("button", { name: /^#1/ }).click();
  await expect(page.getByRole("heading", { name: "Version #1" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Restore version #1" }).click();
  await page.getByRole("button", { name: "Yes, restore it" }).click();
  await expect(page.getByText(/Version #1 restored as #\d+/)).toBeVisible({ timeout: 30_000 });

  const after = (await (await request.get(`${CMS}/api/v1/content/en/`)).json()).hero.subtitle;
  expect(after).toBe(en.hero.subtitle);

  // And through the revalidation window onto the page a visitor gets.
  await expect(async () => {
    const markup = decodeHtml(await (await request.get(`${SITE}/en`)).text());
    expect(markup).toContain(en.hero.subtitle);
    expect(markup).not.toContain(before);
  }).toPass({ timeout: 60_000 });

  // History grew; nothing was edited or removed.
  const versions = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/api/v1/admin/versions/`, { credentials: "include" });
    return (await response.json()).versions as Array<{ is_current: boolean; source: string }>;
  }, CMS);
  expect(versions.length).toBeGreaterThanOrEqual(3);
  expect(versions.filter((version) => version.is_current)).toHaveLength(1);
  expect(versions.some((version) => version.source === "rollback")).toBe(true);
});

// ----------------------------------------------------------------- secrets

test("no secret reaches any browser bundle, public or studio", async ({ page, request }) => {
  expect(SECRET_KEY.length, "the runner must have generated a key").toBeGreaterThan(20);
  expect(TOKEN.length, "the runner must have generated a token").toBeGreaterThan(20);

  const scripts = new Set<string>();
  for (const path of ["/en", "/ar/contact", "/en/studio/login"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    for (const src of await page.evaluate(() =>
      [...document.querySelectorAll("script[src]")].map((node) => (node as HTMLScriptElement).src),
    )) {
      scripts.add(src);
    }
  }
  expect(scripts.size).toBeGreaterThan(0);

  for (const src of scripts) {
    const body = await (await request.get(src)).text();
    expect(body, `${src} carries the Django secret key`).not.toContain(SECRET_KEY);
    expect(body, `${src} carries the inquiry token`).not.toContain(TOKEN);
    expect(body, `${src} carries the editor password`).not.toContain(EDITOR.password);
    expect(body, `${src} carries a mail provider key`).not.toMatch(/re_[A-Za-z0-9]{16,}/);
  }
});
