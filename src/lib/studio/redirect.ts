/**
 * `?next=` validation.
 *
 * An unvalidated redirect target is an open redirect: `?next=https://evil.tld`
 * turns our own login page into a credible phishing hop. Only an internal
 * studio path is ever accepted, and anything else falls back to the studio
 * home rather than being rejected with an error the user cannot act on.
 */

const STUDIO_PATH = /^\/(en|ar)\/studio(\/[^?#]*)?$/;

export function safeNext(raw: string | null | undefined, locale: string): string {
  const fallback = `/${locale}/studio`;
  if (!raw) return fallback;

  // A backslash is treated as a slash by some parsers, so "/\evil.tld" can
  // become a protocol-relative URL. Reject before anything else looks at it.
  if (raw.includes("\\") || raw.includes("\0")) return fallback;

  // Protocol-relative ("//evil.tld") and absolute ("https://evil.tld") both
  // fail this: an internal path starts with exactly one slash.
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (decoded.includes("\\") || decoded.startsWith("//")) return fallback;

  // Strip query and hash before matching; they cannot change the destination
  // host, and keeping them would let "?next=/en/studio?x=@evil" look odd.
  const [pathOnly] = decoded.split(/[?#]/);
  return STUDIO_PATH.test(pathOnly) ? pathOnly : fallback;
}
