"use client";

/**
 * An image the CMS may own, with the bundled copy behind it.
 *
 * Three sections draw content images and all three want the same ladder:
 * whatever the media library binds at this content address, then the file the
 * content names under `/public`, and a graceful nothing if even that fails.
 * Written once here so the rungs cannot drift apart — and so that "the CMS is
 * down" is handled in one place rather than three.
 *
 * `onError` is tracked per source, not as a single flag. If a managed image
 * 404s — a file moved in the object store, a binding pointing at something
 * deleted — the component drops to the bundled copy and tries that on its own
 * merits, rather than concluding that both are broken.
 *
 * The `key` on the underlying Image is the resolved URL, so replacing an image
 * in the dashboard genuinely remounts it. Next caches optimised images by
 * (url, width, quality) and the library's URLs carry a content hash, so a new
 * file is always a new URL and never a stale cache hit.
 */

import Image, { type ImageProps } from "next/image";
import { useLocale } from "next-intl";
import { useState } from "react";
import { altFor, useCover, useGallery, useLogo } from "@/components/layout/MediaProvider";

type Role = "cover" | "logo" | "gallery";

type Props = Omit<ImageProps, "src" | "alt" | "onError"> & {
  /** Root key of messages/{locale}.json — `projectsPage`, `clients`. */
  namespace: string;
  /** The node inside it — `items[3]`. */
  path: string;
  role?: Role;
  /** The copy under /public that the content names. */
  fallbackSrc: string | null;
  /** What the content calls this picture, when the library offers nothing. */
  alt: string;
};

export function ContentImage({
  namespace,
  path,
  role = "cover",
  fallbackSrc,
  alt,
  ...imageProps
}: Props) {
  const locale = useLocale();
  const [managedFailed, setManagedFailed] = useState(false);
  const [bundledFailed, setBundledFailed] = useState(false);

  // All three hooks run every render — hooks cannot be called conditionally,
  // and each is a cheap map lookup on a context value.
  const cover = useCover(namespace, path);
  const logo = useLogo(namespace, path);
  const gallery = useGallery(namespace, path);

  const bound = role === "logo" ? logo : role === "gallery" ? (gallery[0] ?? null) : cover;
  const managed = managedFailed ? null : bound;

  const src = managed ? managed.url : bundledFailed ? null : fallbackSrc;
  if (!src) return null;

  return (
    <Image
      {...imageProps}
      key={src}
      src={src}
      alt={managed ? altFor(managed, locale) || alt : alt}
      data-managed={managed ? "true" : "false"}
      onError={managed ? () => setManagedFailed(true) : () => setBundledFailed(true)}
    />
  );
}
