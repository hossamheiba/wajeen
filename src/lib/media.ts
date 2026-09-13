/**
 * Images that the CMS owns.
 *
 * The site's *text* still comes from `src/messages/{locale}.json` and always
 * does — nothing here changes that, and the test that proves the pages render
 * with the CMS unreachable still passes unchanged. Only images that an editor
 * is meant to be able to swap are resolved through the media library.
 *
 * The shape of the deal:
 *
 *   content says     projectsPage.items[3].image = "berri-gas-plant"
 *   the library says projectsPage.items[3] → cover → https://…/a7f3….jpg
 *   the site shows   the library's answer, or the content's, in that order
 *
 * The fallback is not a nicety. During the migration both sources are live, and
 * after it the CMS could still be down, slow, or missing a binding somebody
 * deleted. In every one of those cases the page renders the photograph that is
 * bundled in `/public` rather than a gap — so the media library can fail
 * without the site failing.
 *
 * One manifest covers the whole site. It is small (a few dozen entries), it is
 * fetched once per revalidation window rather than once per image, and a fetch
 * that fails is remembered briefly so a dead CMS costs one slow request rather
 * than one per page view.
 */

export interface MediaImage {
  url: string;
  width: number;
  height: number;
  alt: { en: string; ar: string };
  caption?: { en: string; ar: string };
}

export interface MediaSlot {
  cover?: MediaImage;
  logo?: MediaImage;
  gallery?: MediaImage[];
}

/** Keyed by content address: `projectsPage.items[3]`, `clients.items[0]`. */
export type MediaManifest = Record<string, MediaSlot>;

export const EMPTY_MANIFEST: MediaManifest = {};

/**
 * How long a good manifest is reused before the CMS is asked again.
 *
 * A minute in production: the manifest is small but it is one request per
 * window for the whole site, and an image swap landing within a minute is
 * fast enough. Configurable because the end-to-end tests change a binding and
 * then assert the page changed, and because an editor watching their own edit
 * appear deserves a shorter wait than the default.
 */
const REVALIDATE_SECONDS = Number(process.env.WJEEN_MEDIA_REVALIDATE ?? 60);
/** A CMS that is down must not add its timeout to every single request. */
const FAILURE_COOLDOWN_MS = 30_000;
/** A slow CMS must never hold a page. The bundled images are right there. */
const TIMEOUT_MS = 1_500;

function cmsOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_CMS_API_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/**
 * `/media/library/…` from Django becomes an absolute URL against the CMS.
 * A manifest that already carries an absolute URL — which is what a CDN or an
 * object store would return — is passed through untouched.
 */
function absolute(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

let cooldownUntil = 0;

/**
 * Fetch the manifest. Never throws, never rejects: the worst case is an empty
 * manifest and a site that draws its bundled images.
 */
export async function fetchMediaManifest(): Promise<MediaManifest> {
  const origin = cmsOrigin();
  if (!origin) return EMPTY_MANIFEST;
  if (Date.now() < cooldownUntil) return EMPTY_MANIFEST;

  try {
    const response = await fetch(`${origin}/api/v1/media/manifest/`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["media-manifest"] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`manifest ${response.status}`);

    const body = (await response.json()) as { bindings?: MediaManifest };
    const bindings = body.bindings ?? {};

    const resolved: MediaManifest = {};
    for (const [address, slot] of Object.entries(bindings)) {
      resolved[address] = {
        ...(slot.cover && { cover: { ...slot.cover, url: absolute(slot.cover.url, origin) } }),
        ...(slot.logo && { logo: { ...slot.logo, url: absolute(slot.logo.url, origin) } }),
        ...(slot.gallery && {
          gallery: slot.gallery.map((image) => ({
            ...image,
            url: absolute(image.url, origin),
          })),
        }),
      };
    }
    cooldownUntil = 0;
    return resolved;
  } catch {
    cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
    return EMPTY_MANIFEST;
  }
}

/** `projectsPage` + `items[3]` → `projectsPage.items[3]`. */
export function address(namespace: string, path: string): string {
  return path ? `${namespace}.${path}` : namespace;
}

export function pickCover(manifest: MediaManifest, at: string): MediaImage | null {
  return manifest[at]?.cover ?? null;
}

export function pickLogo(manifest: MediaManifest, at: string): MediaImage | null {
  return manifest[at]?.logo ?? null;
}

/**
 * A gallery in the order the CMS holds it. The cover, when one is set, leads —
 * that is what "primary image" means here, and it is why reordering in the
 * dashboard reorders the page.
 */
export function pickGallery(manifest: MediaManifest, at: string): MediaImage[] {
  const slot = manifest[at];
  if (!slot) return [];
  const gallery = slot.gallery ?? [];
  if (!slot.cover) return gallery;
  const rest = gallery.filter((image) => image.url !== slot.cover!.url);
  return [slot.cover, ...rest];
}

/** The alt text for the reader's language, falling back to the other one. */
export function altFor(image: MediaImage, locale: string): string {
  const alt = locale === "ar" ? image.alt.ar || image.alt.en : image.alt.en || image.alt.ar;
  return alt ?? "";
}
