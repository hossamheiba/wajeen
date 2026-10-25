/**
 * The studio's view of the media library.
 *
 * A thin typed layer over the same authenticated client the content editor
 * uses — same cookie, same CSRF token, same refresh-once-and-retry — so there
 * is one session and one error shape across the whole dashboard.
 *
 * Addresses are (namespace, path) pairs, exactly as the content tree is keyed:
 * `projectsPage` + `items[3]` is one project. Nothing here invents an id of
 * its own, because the thing being pointed at is a node in JSON, not a row.
 */

import { API_BASE, apiRequest, apiUpload } from "./api";
import type { MediaManifest } from "@/lib/media";

export type MediaRole = "cover" | "logo" | "gallery";

export interface MediaUsage {
  id: number;
  namespace: string;
  path: string;
  address: string;
  role: MediaRole;
  position: number;
}

export interface MediaAsset {
  id: number;
  url: string;
  checksum: string;
  original_name: string;
  content_type: string;
  width: number;
  height: number;
  bytes: number;
  alt_en: string;
  alt_ar: string;
  category: "project" | "client" | "gallery" | "page" | "other";
  status: "active" | "archived";
  usage: MediaUsage[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaBinding extends MediaUsage {
  asset: MediaAsset;
  caption_en: string;
  caption_ar: string;
}

/**
 * Django serves uploads from a path relative to its own origin in development
 * and from an absolute CDN URL in production. Resolving here means no
 * component has to know which of the two it is looking at.
 */
export function assetUrl(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;
}

export interface AssetQuery {
  category?: string;
  status?: string;
  search?: string;
  used?: "true" | "false";
}

export function listAssets(query: AssetQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ results: MediaAsset[] }>(`/media/${suffix}`);
}

export function readAsset(id: number) {
  return apiRequest<MediaAsset>(`/media/${id}/`);
}

export function updateAsset(
  id: number,
  patch: Partial<Pick<MediaAsset, "alt_en" | "alt_ar" | "category" | "status">>,
) {
  return apiRequest<MediaAsset>(`/media/${id}/`, { method: "PATCH", body: patch });
}

/** Refused with 409 `media_in_use` when something still shows it. */
export function deleteAsset(id: number) {
  return apiRequest<null>(`/media/${id}/`, { method: "DELETE" });
}

export function uploadAsset(input: {
  file: File;
  altEn?: string;
  altAr?: string;
  category?: string;
}) {
  const form = new FormData();
  form.set("file", input.file);
  form.set("original_name", input.file.name);
  if (input.altEn) form.set("alt_en", input.altEn);
  if (input.altAr) form.set("alt_ar", input.altAr);
  if (input.category) form.set("category", input.category);
  return apiUpload<MediaAsset>("/media/", form);
}

/**
 * The studio's bindings in the shape the site's `MediaProvider` reads.
 *
 * The admin API answers with rows — one per bound asset — while the public
 * manifest is keyed by content address with a slot per role. The preview needs
 * the second shape, and the studio already has the first, so the conversion
 * happens here rather than asking the CMS for the same facts twice.
 */
export function manifestFromBindings(bindings: MediaBinding[]): MediaManifest {
  const manifest: MediaManifest = {};
  for (const binding of [...bindings].sort((a, b) => a.position - b.position)) {
    const key = binding.path ? `${binding.namespace}.${binding.path}` : binding.namespace;
    const image = {
      url: assetUrl(binding.asset.url),
      width: binding.asset.width,
      height: binding.asset.height,
      alt: { en: binding.asset.alt_en, ar: binding.asset.alt_ar },
      caption: { en: binding.caption_en, ar: binding.caption_ar },
    };
    const slot = (manifest[key] ??= {});
    if (binding.role === "gallery") (slot.gallery ??= []).push(image);
    else if (binding.role === "logo") slot.logo = image;
    else slot.cover = image;
  }
  return manifest;
}

export function listBindings(namespace?: string) {
  const suffix = namespace ? `?namespace=${encodeURIComponent(namespace)}` : "";
  return apiRequest<{ results: MediaBinding[] }>(`/media/bindings/${suffix}`);
}

/** Point a cover or a logo at an asset, or pass null to clear it. */
export function setSlot(
  role: Exclude<MediaRole, "gallery">,
  namespace: string,
  path: string,
  assetId: number | null,
) {
  return apiRequest<{ ok: true }>(`/media/slot/${role}/`, {
    method: "PUT",
    body: { namespace, path, asset: assetId },
  });
}

/** Replace a gallery with this exact order. */
export function setGallery(
  namespace: string,
  path: string,
  items: { asset: number; caption_en?: string; caption_ar?: string }[],
) {
  return apiRequest<{ count: number }>(`/media/slot/gallery/`, {
    method: "PUT",
    body: { namespace, path, items },
  });
}

/**
 * Keep each row's pictures with the row when a list is reordered.
 *
 * A binding's address is the row's position — `projectsPage.items[3]` — so a
 * row that moves leaves its photograph behind unless the bindings move too.
 * This computes where every affected address ends up and writes the new map.
 *
 * `to === null` removes the row: its pictures go, and everything after it
 * shifts up by one. Writes are independent of each other because the server
 * replaces whatever sits at an address, so no temporary positions are needed.
 */
export async function moveRowBindings(
  namespace: string,
  listKey: string,
  from: number,
  to: number | null,
): Promise<void> {
  const { results } = await listBindings(namespace);
  const pattern = new RegExp(`^${listKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[(\\d+)\\]$`);

  /** Every row of this list that holds anything, by its current index. */
  const rows = new Map<number, MediaBinding[]>();
  let last = -1;
  for (const binding of results) {
    const match = pattern.exec(binding.path);
    if (!match) continue;
    const index = Number(match[1]);
    last = Math.max(last, index);
    rows.set(index, [...(rows.get(index) ?? []), binding]);
  }
  if (rows.size === 0) return;

  const moved = new Map<number, MediaBinding[]>();
  const place = (index: number, bindings: MediaBinding[] | undefined) => {
    if (bindings?.length) moved.set(index, bindings);
  };

  if (to === null) {
    for (let index = 0; index <= last; index += 1) {
      if (index === from) continue;
      place(index > from ? index - 1 : index, rows.get(index));
    }
  } else {
    for (let index = 0; index <= last; index += 1) {
      place(index === from ? to : index === to ? from : index, rows.get(index));
    }
  }

  // Every address that may have changed hands: everything up to the last row
  // that held a picture, and -- for a move -- both rows it swaps, either of
  // which can lie *beyond* that. A move is a swap, so a picture lands on
  // `from` as readily as on `to`: moving the first of six people down puts it
  // on the second, and moving the second *up* puts the first one's picture
  // there. When every row has a picture the three coincide, which is how this
  // went unnoticed for the lists it was written for. With sparse pictures (one
  // portrait among six people) the landing row is an empty one past `last`,
  // and stopping at `last` cleared the source and wrote nothing at the
  // destination: moving a person made their portrait vanish.
  const reach = to === null ? last : Math.max(last, from, to);
  const touched = new Set<number>();
  for (let index = 0; index <= reach; index += 1) touched.add(index);

  await Promise.all(
    [...touched].map(async (index) => {
      const here = moved.get(index) ?? [];
      const path = `${listKey}[${index}]`;
      for (const role of ["cover", "logo"] as const) {
        const one = here.find((binding) => binding.role === role) ?? null;
        const had = rows.get(index)?.some((binding) => binding.role === role) ?? false;
        if (!one && !had) continue;
        await setSlot(role, namespace, path, one ? one.asset.id : null);
      }
      const gallery = here
        .filter((binding) => binding.role === "gallery")
        .sort((a, b) => a.position - b.position);
      const hadGallery = rows.get(index)?.some((binding) => binding.role === "gallery") ?? false;
      if (gallery.length || hadGallery) {
        await setGallery(
          namespace,
          path,
          gallery.map((binding) => ({
            asset: binding.asset.id,
            caption_en: binding.caption_en,
            caption_ar: binding.caption_ar,
          })),
        );
      }
    }),
  );
}
