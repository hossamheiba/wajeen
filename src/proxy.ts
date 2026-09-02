/**
 * Next 16 calls this Proxy; it is the same thing older versions called
 * Middleware, and only one file per project is supported — so the studio's
 * headers are added here rather than in a second file.
 *
 * next-intl's routing runs first and is untouched: its response is what gets
 * returned, with two headers added when the path is a studio path.
 *
 * This is hygiene, not security. The auth cookie is HttpOnly and host-only on
 * `api.wjeen.com`, so this code — running on the `www` origin — cannot see it
 * and must not pretend to. The API refuses every unauthenticated `/admin/*`
 * request, and the studio pages render no content of their own to leak.
 */

import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleRouting = createMiddleware(routing);

const STUDIO_PATH = /^\/(en|ar)\/studio(\/|$)/;

export default function proxy(request: NextRequest) {
  const response = handleRouting(request);

  if (STUDIO_PATH.test(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("X-Frame-Options", "DENY");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
