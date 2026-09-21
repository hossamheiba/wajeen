/**
 * The content pipeline: draft → preview → publish → public API → public website.
 *
 * These were validation probes run by hand while Phase 1 was built. Nothing
 * about the site's behaviour is asserted here that was not asserted then; what
 * changes is that the assertions now run again whenever anyone asks.
 *
 * Every instance is a separate `next start` of ONE build, differing only in
 * runtime environment — see tests/content/serve.sh:
 *
 *   3111  json, CMS live        3112  cms, CMS live, revalidate 3
 *   3113  cms, nothing listening   3114  cms, CMS hangs   3115  json, CMS hangs
 *
 * The CMS is on :8011 with its own database, dropped when the run ends. The
 * development server on :8001 and a dev site on :3000 can both be running
 * throughout; nothing here touches either.
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import en from "../../src/messages/en.json";
import ar from "../../src/messages/ar.json";

const CMS = "http://localhost:8011";
const ADMIN = `${CMS}/api/v1/admin`;

const SITE = {
  json: "http://localhost:3111",
  cms: "http://localhost:3112",
  cmsUnavailable: "http://localhost:3113",
  cmsHanging: "http://localhost:3114",
  jsonHanging: "http://localhost:3115",
} as const;

/** One of the origins cms/scripts/content-e2e-api.sh trusts. */
const ORIGIN = SITE.cms;
const USER = { username: "content-e2e", password: "content-e2e-password" };

/** The bundled text — the thing the site ships with and falls back to. */
const BUNDLED = {
  title: en.aboutPreview.title,
  arTitle: ar.aboutPreview.title,
  description: en.meta.description,
};

/** Distinct per test, so a stale cache can never look like a pass. */
const mark = (what: string) => `CONTENT-E2E-${what}-${Date.now()}`;

// ---------------------------------------------------------------- the CMS

async function signIn(): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({
    extraHTTPHeaders: { Origin: ORIGIN },
  });
  await context.get(`${ADMIN}/auth/csrf/`);
  const response = await context.post(`${ADMIN}/auth/login/`, {
    data: USER,
    headers: { "X-CSRFToken": await csrf(context) },
  });
  expect(response.status(), "the isolated CMS must accept its own account").toBe(200);
  return context;
}

async function csrf(context: APIRequestContext): Promise<string> {
  const { cookies } = await context.storageState();
  return cookies.find((cookie) => cookie.name === "wjeen_csrftoken")?.value ?? "";
}

/** Open a draft on one namespace. Never publishes. */
async function draft(
  context: APIRequestContext,
  namespace: string,
  locale: string,
  patch: Record<string, unknown>,
) {
  const current = await (await context.get(`${ADMIN}/content/${namespace}/${locale}/`)).json();
  const response = await context.patch(`${ADMIN}/content/${namespace}/${locale}/`, {
    data: { path: "", patch },
    headers: { "X-CSRFToken": await csrf(context), "If-Match": String(current.version) },
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}

async function publish(context: APIRequestContext, label: string) {
  const blocks = await (await context.get(`${ADMIN}/content/`)).json();
  const response = await context.post(`${ADMIN}/publish/`, {
    data: { label },
    headers: {
      "X-CSRFToken": await csrf(context),
      "If-Match": String(blocks.currentRevision ?? 0),
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json();
}

const publicTree = async (context: APIRequestContext, locale: string) =>
  (await context.get(`${CMS}/api/v1/content/${locale}/`)).json();

const draftTree = async (context: APIRequestContext, locale: string) =>
  (await context.get(`${ADMIN}/preview/${locale}/`)).json();

// ---------------------------------------------------------------- the sites

/** A page's HTML, straight from the server, never from a browser cache. */
async function html(context: APIRequestContext, origin: string, path = "/en") {
  const response = await context.get(`${origin}${path}`, { headers: { "Cache-Control": "no-cache" } });
  expect(response.status(), `${origin}${path}`).toBe(200);
  return response.text();
}

/**
 * Poll a page until it carries `text`, or give up.
 *
 * Needed because a revalidation window is a window: the first request after it
 * expires may still be served stale while the refresh happens behind it.
 */
async function eventually(
  context: APIRequestContext,
  origin: string,
  text: string,
  { path = "/en", budgetMs = 60_000 }: { path?: string; budgetMs?: number } = {},
) {
  const deadline = Date.now() + budgetMs;
  let last = "";
  while (Date.now() < deadline) {
    last = await html(context, origin, path);
    if (last.includes(text)) return Date.now();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  expect(last, `"${text}" never reached ${origin}${path} within ${budgetMs}ms`).toContain(text);
  return Date.now();
}

/**
 * next-intl renders a key it cannot find as the key's own path. That is the
 * failure this whole fallback design exists to make unreachable, so every
 * outage assertion checks for it by name.
 */
function expectNoRawKeys(page: string) {
  // The joined form is what the fallback produces and nothing else emits: the
  // serialised message tree carries "aboutPreview" and "title" as separate
  // keys, never "aboutPreview.title" as one string.
  for (const key of ["aboutPreview.title", "meta.description", "hero.subtitle", "nav.home"]) {
    expect(page, `raw translation key leaked: ${key}`).not.toContain(key);
  }
}

// ----------------------------------------------------------------- the tests

test.describe.serial("the content pipeline", () => {
  let cms: APIRequestContext;
  let net: APIRequestContext;

  test.beforeAll(async () => {
    cms = await signIn();
    net = await playwrightRequest.newContext();
  });

  test.afterAll(async () => {
    await cms.dispose();
    await net.dispose();
  });

  test("the isolated CMS starts as the bundled tree", async () => {
    const tree = await publicTree(cms, "en");
    expect(Object.keys(tree)).toHaveLength(27);
    expect(tree.aboutPreview.title).toBe(BUNDLED.title);
    expect((await publicTree(cms, "ar")).aboutPreview.title).toBe(BUNDLED.arTitle);
  });

  test("every instance serves the bundled text before anything is published", async () => {
    for (const origin of Object.values(SITE)) {
      expect(await html(net, origin), origin).toContain(BUNDLED.title);
    }
  });

  // -------------------------------------------------------------- 3. drafts

  test("a draft reaches the preview tree and nothing else", async () => {
    const secret = mark("DRAFT");
    await draft(cms, "aboutPreview", "en", { title: secret });

    expect((await draftTree(cms, "en")).aboutPreview.title, "the editor must see it").toBe(secret);
    expect((await publicTree(cms, "en")).aboutPreview.title, "the public API must not").toBe(
      BUNDLED.title,
    );

    // Both modes, because a draft leak would be a leak in either.
    expect(await html(net, SITE.cms)).not.toContain(secret);
    expect(await html(net, SITE.json)).not.toContain(secret);
    expect(await html(net, SITE.cms)).toContain(BUNDLED.title);
  });

  test("the preview route renders published text, never the open draft", async () => {
    // The studio overlays the draft over this page through postMessage; the
    // page's own render is the published tree, and that is what keeps a draft
    // out of anything that can be reached without the editor.
    const page = await html(net, SITE.cms, "/en/__preview/aboutPreview");
    expect(page).toContain(BUNDLED.title);
  });

  // ------------------------------------------------- 4. publish propagation

  test("publishing carries a value from the studio all the way to the page", async () => {
    const secret = mark("PUBLISHED");
    await draft(cms, "aboutPreview", "en", { title: secret });
    await draft(cms, "meta", "en", { description: `${secret} meta` });

    const revision = await publish(cms, "content e2e");
    expect(revision.number).toBeGreaterThan(0);

    // API first, then the page — the point is the whole chain, in order.
    expect((await publicTree(cms, "en")).aboutPreview.title).toBe(secret);
    await eventually(net, SITE.cms, secret);

    const page = await html(net, SITE.cms);
    expect(page, "the change must be in the HTML, not merely in the API").toContain(secret);

    // 2c — metadata reads the same source as the body copy.
    expect(page).toContain(`${secret} meta`);
    expect(page).toMatch(/<meta name="description" content="CONTENT-E2E-PUBLISHED-[0-9]+ meta"/);
  });

  // ------------------------------------------------- 1. json mode regression

  test("json mode ignores published content that the cms instance is showing", async () => {
    const cmsPage = await html(net, SITE.cms);
    const jsonPage = await html(net, SITE.json);

    // Same CMS, same moment, same build: only the flag differs.
    expect(cmsPage).toContain("CONTENT-E2E-PUBLISHED-");
    expect(jsonPage, "the default must not follow the CMS").not.toContain("CONTENT-E2E-PUBLISHED-");
    expect(jsonPage).toContain(BUNDLED.title);
    expect(jsonPage).toContain(BUNDLED.description);
  });

  test("json mode does not call the content API at all", async () => {
    // Measured, not assumed. :3115 is json mode pointed at a CMS that accepts
    // connections and never answers, so a single call would cost the full 1.5s
    // timeout. The 30s failure cooldown in src/lib/content.ts means one slow
    // render could otherwise hide behind it, so this samples either side of
    // that window.
    for (const wait of [0, 16_000, 16_000]) {
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      const started = Date.now();
      const page = await html(net, SITE.jsonHanging);
      const elapsed = Date.now() - started;
      expect(elapsed, "a render this fast cannot have waited on the CMS").toBeLessThan(1_000);
      expect(page).toContain(BUNDLED.title);
    }
  });

  test("cms mode against the same hanging CMS does pay the timeout", async () => {
    // The control for the test above: same stub, same build, flag flipped.
    // Waits out the cooldown first so the request is one that really tries.
    await new Promise((resolve) => setTimeout(resolve, 31_000));
    const started = Date.now();
    const page = await html(net, SITE.cmsHanging);
    const elapsed = Date.now() - started;

    expect(elapsed, "cms mode must actually attempt the fetch").toBeGreaterThan(1_400);
    expect(elapsed, "and must give up at 1.5s rather than hang the page").toBeLessThan(4_000);
    expect(page, "and must still render, from the bundled messages").toContain(BUNDLED.title);
    expectNoRawKeys(page);
  });

  // -------------------------------------------------- 5. locale isolation

  test("an English publish leaves Arabic alone, and the reverse", async () => {
    const arabic = mark("AR");
    await draft(cms, "aboutPreview", "ar", { title: arabic });
    await publish(cms, "content e2e arabic");

    expect((await publicTree(cms, "ar")).aboutPreview.title).toBe(arabic);
    // English keeps the value published two tests ago, not the Arabic one.
    expect((await publicTree(cms, "en")).aboutPreview.title).toContain("CONTENT-E2E-PUBLISHED-");

    await eventually(net, SITE.cms, arabic, { path: "/ar" });
    const arabicPage = await html(net, SITE.cms, "/ar");
    const englishPage = await html(net, SITE.cms, "/en");

    expect(arabicPage).toContain(arabic);
    expect(englishPage, "the English page must not show Arabic content").not.toContain(arabic);
    expect(englishPage).toContain("CONTENT-E2E-PUBLISHED-");
  });

  // ------------------------------------------------------- 6. outage

  test("a CMS that is not there leaves the site whole", async () => {
    for (const path of ["/en", "/ar", "/en/story", "/ar/contact"]) {
      const page = await html(net, SITE.cmsUnavailable, path);
      expectNoRawKeys(page);
    }
    const page = await html(net, SITE.cmsUnavailable);
    expect(page, "the bundled text is the fallback").toContain(BUNDLED.title);
    expect(page, "and no published value can have reached it").not.toContain("CONTENT-E2E-");
  });

  test("an outage costs the page nothing once the cooldown is set", async () => {
    const started = Date.now();
    await html(net, SITE.cmsUnavailable);
    await html(net, SITE.cmsUnavailable, "/ar");
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  // ---------------------------------------------------- 7. revalidation

  test("WJEEN_CONTENT_REVALIDATE holds a tree, then lets the next one through", async () => {
    // :3112 runs with a 3 second window, so both halves are observable: the
    // page must NOT change inside it, and must change after it.
    const before = await html(net, SITE.cms);
    const secret = mark("REVALIDATED");

    await draft(cms, "aboutPreview", "en", { title: secret });
    await publish(cms, "content e2e revalidation");

    // The API is immediate. The page is not, and must not be.
    expect((await publicTree(cms, "en")).aboutPreview.title).toBe(secret);
    const immediately = await html(net, SITE.cms);
    expect(immediately, "a cached tree must still be cached").not.toContain(secret);
    expect(immediately, "and must still be the tree from before the publish").toContain(
      "CONTENT-E2E-PUBLISHED-",
    );
    expect(before).toContain("CONTENT-E2E-PUBLISHED-");

    // And then the window expires.
    await eventually(net, SITE.cms, secret);
  });

  test("the published history is intact after everything above", async () => {
    const versions = await (await cms.get(`${ADMIN}/versions/`)).json();
    expect(versions.versions.length, "three publishes, three revisions plus the baseline")
      .toBeGreaterThanOrEqual(4);
    expect(versions.versions.filter((v: { is_current: boolean }) => v.is_current)).toHaveLength(1);
  });
});
