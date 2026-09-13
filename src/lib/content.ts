/**
 * Where the site's *text* comes from.
 *
 * Until now there was nothing to decide: `src/i18n/request.ts` imported
 * `src/messages/{locale}.json` and that was the whole story. This module adds
 * a second possible source — the CMS's published tree — behind a flag, and
 * keeps the first one underneath it forever.
 *
 *   WJEEN_CONTENT_SOURCE=json   (the default, and the current behaviour, exactly)
 *   WJEEN_CONTENT_SOURCE=cms    fetch the published tree, merged over the JSON
 *
 * The bundled JSON is never optional and never deleted. In `cms` mode it is the
 * *base* of a deep merge, so a namespace the CMS has not got, a key an editor
 * has not written, a request that timed out, or a CMS that is simply down can
 * only ever mean "the text that shipped with this build" — never a visitor
 * staring at `aboutPreview.title`. next-intl renders a missing key as its own
 * path and logs; that must not be reachable from a network failure.
 *
 * Published only. The draft tree lives behind `/api/v1/admin/preview/`, needs a
 * session, and is not reachable from here at all — which is what keeps an
 * unfinished edit off the public site.
 *
 * Shape: `/api/v1/content/{locale}/` returns next-intl's exact structure — the
 * same 28 namespaces and 1223 key paths as the file, proven by
 * `cms/content/tests/test_public_parity.py`. That gate is the reason this
 * module can be a swap rather than a translation layer.
 */

export type ContentSource = "json" | "cms";

/** Requests never sit longer than this; the bundled copy is already in memory. */
const TIMEOUT_MS = 1_500;
/**
 * How long a good tree is reused before the CMS is asked again.
 *
 * Overridable for the same reason the media manifest's window is: an
 * end-to-end test that publishes and then asserts the page changed cannot wait
 * out a production window, and neither can someone watching their own edit.
 */
const REVALIDATE_SECONDS = Number(process.env.WJEEN_CONTENT_REVALIDATE ?? 60);
/** After a failure, stop asking for a while: one slow request, not one per visitor. */
const FAILURE_COOLDOWN_MS = 30_000;

type Json = unknown;
type Tree = Record<string, Json>;

export function contentSource(): ContentSource {
  return process.env.WJEEN_CONTENT_SOURCE === "cms" ? "cms" : "json";
}

function cmsOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_CMS_API_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/**
 * The messages that ship with the build.
 *
 * Written as the same template-literal import the loader always used, so both
 * locales stay in the bundle and `json` mode returns byte-for-byte what it
 * returned before this module existed.
 */
async function bundled(locale: string): Promise<Tree> {
  return (await import(`../messages/${locale}.json`)).default as Tree;
}

/**
 * Merge `patch` over `base`.
 *
 * Objects merge key by key; everything else — including arrays — replaces
 * wholesale. That is deliberately the same rule the CMS applies on the way in
 * (`cms/content/services/paths.py: deep_merge`): a list is an ordered piece of
 * content, and merging it index-wise would corrupt a reorder rather than
 * honour it.
 */
export function deepMerge(base: Json, patch: Json): Json {
  if (
    base !== null &&
    patch !== null &&
    typeof base === "object" &&
    typeof patch === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(patch)
  ) {
    const merged: Record<string, Json> = { ...(base as Record<string, Json>) };
    for (const [key, value] of Object.entries(patch as Record<string, Json>)) {
      merged[key] = key in merged ? deepMerge(merged[key], value) : value;
    }
    return merged;
  }
  return patch;
}

let cooldownUntil = 0;

/**
 * The published tree for one locale, or null.
 *
 * Never throws and never rejects: every failure path returns null and the
 * caller falls back to the bundled copy.
 */
async function fetchPublished(locale: string): Promise<Tree | null> {
  const origin = cmsOrigin();
  if (!origin) return null;
  if (Date.now() < cooldownUntil) return null;

  try {
    const response = await fetch(`${origin}/api/v1/content/${locale}/`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["messages", `messages:${locale}`] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`content ${response.status}`);

    const tree = (await response.json()) as unknown;
    // A tree that is not an object of namespaces is not a tree. Merging an
    // array or a string over the messages would replace the whole site.
    if (tree === null || typeof tree !== "object" || Array.isArray(tree)) {
      throw new Error("content payload is not a namespace tree");
    }
    cooldownUntil = 0;
    return tree as Tree;
  } catch {
    cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
    return null;
  }
}

/**
 * The messages for one locale, from whichever source is configured.
 *
 * In `json` mode this is the bundled import and nothing else — no fetch, no
 * merge, no network at all.
 */
export async function loadMessages(locale: string): Promise<Tree> {
  const file = await bundled(locale);
  if (contentSource() !== "cms") return file;

  const published = await fetchPublished(locale);
  if (published === null) return file;

  return deepMerge(file, published) as Tree;
}
