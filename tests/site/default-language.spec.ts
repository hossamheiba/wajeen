/**
 * The site opens in Arabic.
 *
 * `localeDetection` is off on purpose: with it on, the first thing next-intl
 * trusts is the visitor's NEXT_LOCALE cookie and their browser's language, and
 * `defaultLocale` only applies to someone with neither. A test that only sends
 * a plain request would pass either way, so these send the two things that
 * used to win.
 */

import { expect, test } from "@playwright/test";

async function landing(request: import("@playwright/test").APIRequestContext, headers: Record<string, string>) {
  const response = await request.get("/", { headers, maxRedirects: 0 });
  return { status: response.status(), location: response.headers()["location"] ?? "" };
}

test.describe("default language", () => {
  test("a plain visit to the root opens the Arabic site", async ({ request }) => {
    const { status, location } = await landing(request, {});
    expect([307, 308]).toContain(status);
    expect(new URL(location, "http://x").pathname).toBe("/ar");
  });

  test("an English browser still opens the Arabic site", async ({ request }) => {
    const { location } = await landing(request, { "Accept-Language": "en-US,en;q=0.9" });
    expect(new URL(location, "http://x").pathname).toBe("/ar");
  });

  test("a remembered English choice does not pull the root back to /en", async ({ request }) => {
    const { location } = await landing(request, { Cookie: "NEXT_LOCALE=en" });
    expect(new URL(location, "http://x").pathname).toBe("/ar");
  });

  test("English pages are still reachable at their own address", async ({ request }) => {
    for (const path of ["/en", "/en/story", "/en/contact"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
    }
  });
});
