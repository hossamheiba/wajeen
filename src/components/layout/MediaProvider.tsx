"use client";

/**
 * The media manifest, made readable from client components.
 *
 * Every section that draws a content image — the project list, the gallery,
 * the client wall — is a client component, and the manifest is fetched on the
 * server. A context is the join between them: the layout fetches once and
 * provides, and each section reads what it needs by content address.
 *
 * The default value is the empty manifest, not `undefined`, which is what makes
 * the whole thing fail-safe. A component rendered outside the provider — in the
 * studio preview, in a test, in a page that never mounts it — resolves nothing
 * and falls back to its bundled image rather than throwing.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  EMPTY_MANIFEST,
  address,
  altFor,
  pickCover,
  pickGallery,
  pickLogo,
  type MediaImage,
  type MediaManifest,
} from "@/lib/media";

const MediaContext = createContext<MediaManifest>(EMPTY_MANIFEST);

export function MediaProvider({
  manifest,
  children,
}: {
  manifest: MediaManifest;
  children: ReactNode;
}) {
  return <MediaContext.Provider value={manifest}>{children}</MediaContext.Provider>;
}

export function useMediaManifest(): MediaManifest {
  return useContext(MediaContext);
}

/** The image bound as the cover at `namespace.path`, or null. */
export function useCover(namespace: string, path: string): MediaImage | null {
  return pickCover(useContext(MediaContext), address(namespace, path));
}

/** The image bound as the logo at `namespace.path`, or null. */
export function useLogo(namespace: string, path: string): MediaImage | null {
  return pickLogo(useContext(MediaContext), address(namespace, path));
}

/** The ordered gallery at `namespace.path`; empty when nothing is bound. */
export function useGallery(namespace: string, path: string): MediaImage[] {
  return pickGallery(useContext(MediaContext), address(namespace, path));
}

export { altFor };
export type { MediaImage };
