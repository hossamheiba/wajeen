"use client";

/**
 * One image in the dashboard.
 *
 * A plain `<img>`, not `next/image`, and deliberately. These files are served
 * by the CMS, which in development is a Django dev server on another port; the
 * optimiser would proxy every thumbnail through the Next server for a screen
 * only editors see. The two things `next/image` is really bought for are had
 * anyway: the aspect box below reserves the space so nothing shifts, and
 * `loading="lazy"` keeps a library of two hundred images from fetching at once.
 */

import { useState } from "react";
import { assetUrl, type MediaAsset } from "@/lib/studio/media";

export function MediaThumb({
  asset,
  className = "",
  /** `contain` for logos, which must not be cropped. */
  fit = "cover",
  eager = false,
}: {
  asset: Pick<MediaAsset, "url" | "original_name" | "alt_en" | "width" | "height">;
  className?: string;
  fit?: "cover" | "contain";
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className={`flex items-center justify-center bg-black/[0.04] text-[10px] font-semibold text-gray-muted ${className}`}
      >
        {asset.original_name || "—"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(asset.url)}
      // The library's own alt describes the picture; in a grid of files the
      // file name is the more useful label, so both are offered.
      alt={asset.alt_en || asset.original_name || ""}
      width={asset.width}
      height={asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setBroken(true)}
      className={`${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
    />
  );
}

/** Bytes, in the unit a person would say out loud. */
export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
