/**
 * Single source of truth for the site's public URL. wjeen.com is a
 * placeholder until the real domain is live — update NEXT_PUBLIC_SITE_URL
 * (or this fallback) once it is, and sitemap/robots/OG/JSON-LD all follow.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.wjeen.com";
