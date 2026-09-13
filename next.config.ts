import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Security headers.
 *
 * The CSP here is deliberately partial: it carries only the directives that
 * cannot affect script or style execution. A full policy is not viable on this
 * site today — Next's App Router streams two inline hydration scripts
 * (`self.__next_f.push(...)`) and Framer Motion writes inline `style`
 * attributes on ~200 elements per page, so `script-src`/`style-src` would need
 * a nonce, and Next can only inject a nonce into *dynamically rendered* pages.
 * All eight pages here are SSG, so adding a nonce would convert the whole site
 * to per-request rendering to buy protection this content does not need.
 *
 * What is included still blocks clickjacking, <base> injection and form
 * hijacking, with no effect on GSAP, Lenis, Framer Motion, hydration or SSG.
 */
const CSP_BASE = [
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

/** Public pages: never embeddable. */
const CSP = [...CSP_BASE, "frame-ancestors 'none'"].join("; ");

/**
 * The studio preview is the one route that has to be embeddable, and only by
 * the studio itself — which is served from this same origin. `'self'` is the
 * whole allowance: no wildcard, no third-party origin, and the public pages
 * keep `'none'`.
 */
const CSP_PREVIEW = [...CSP_BASE, "frame-ancestors 'self'"].join("; ");

/** Matches every path except the preview routes, so the two header sets never
 *  both apply and emit a duplicate X-Frame-Options. */
const NOT_PREVIEW = "/((?!(?:en|ar)/__preview).*)";
const PREVIEW = "/:locale(en|ar)/__preview/:path*";

const securityHeaders = [
  // Two years, subdomains included. `preload` is intentionally omitted: it is
  // a one-way commitment to the browser preload list and should be a
  // deliberate decision once the real domain has been serving HTTPS a while.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Redundant with frame-ancestors above, kept for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // The site uses none of these; deny them rather than inherit permissions.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

/** Same posture as the public site apart from the two framing directives. */
const previewHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  { key: "Content-Security-Policy", value: CSP_PREVIEW },
  // Keep the preview out of search results and out of any cache that a
  // published page would share.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/**
 * Where CMS-managed images come from.
 *
 * next/image refuses to optimise a remote host it was not told about, which is
 * the point: this is the allow-list, not a convenience. It is read from the
 * same variable the studio uses to reach the CMS, so development (Django on
 * :8001) and production (an object store or CDN) are one line of configuration
 * rather than two code paths.
 *
 * If the variable is unset the list is empty and every image on the site falls
 * back to the copies under /public — which is exactly the behaviour wanted
 * while the media migration is still in progress.
 */
function mediaOrigin(): URL | null {
  const raw = process.env.NEXT_PUBLIC_CMS_MEDIA_URL ?? process.env.NEXT_PUBLIC_CMS_API_URL;
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function mediaPatterns() {
  const origin = mediaOrigin();
  if (!origin) return [];
  return [
    {
      protocol: origin.protocol.replace(":", "") as "http" | "https",
      hostname: origin.hostname,
      port: origin.port,
      pathname: "/media/**",
    },
  ];
}

/**
 * Next refuses to fetch a remote image whose hostname resolves to a private
 * address — an SSRF guard, and a good one: without it a public site's image
 * optimiser is a proxy into its own network.
 *
 * In development the CMS *is* on localhost, so the guard blocks every managed
 * image and reports it with the same message as an unconfigured host, which
 * makes it look like a `remotePatterns` problem for as long as it takes to
 * read the server log.
 *
 * The exemption is therefore derived, never configured: it can only be true
 * when the media origin is literally a loopback name. Point the site at a real
 * CDN and it is false again, with no flag left behind to forget.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

function mediaIsLoopback(): boolean {
  const origin = mediaOrigin();
  return origin !== null && LOOPBACK.has(origin.hostname);
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaPatterns(),
    dangerouslyAllowLocalIP: mediaIsLoopback(),
  },
  async headers() {
    return [
      { source: PREVIEW, headers: previewHeaders },
      { source: NOT_PREVIEW, headers: securityHeaders },
    ];
  },
  /**
   * `/about` was one page; it is now three — /leaders, /story and /values —
   * and the header's own "About Us" already lands on /story. The old address is
   * indexed and bookmarked, so it goes on permanently (308) to the same place
   * instead of to a 404. Locale-bound: a bare `/about` is given its locale by
   * src/proxy.ts first, and then arrives here.
   */
  async redirects() {
    return [
      { source: "/:locale(en|ar)/about", destination: "/:locale/story", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
