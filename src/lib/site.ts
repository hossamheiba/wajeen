/**
 * Single source of truth for the site's public origin. Everything SEO-facing
 * derives from it — canonical tags, hreflang, Open Graph URLs, sitemap.xml,
 * robots.txt and the JSON-LD organisation block.
 *
 * Set NEXT_PUBLIC_SITE_URL per environment (see .env.example); the literal
 * below is the confirmed production domain and the fallback when the variable
 * is absent. Any trailing slash is stripped so callers can always append.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.wjeen.com";
