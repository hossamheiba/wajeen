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
const CSP = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

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

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
