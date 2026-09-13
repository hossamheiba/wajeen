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
