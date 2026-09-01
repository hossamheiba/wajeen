/**
 * Section key → the component the public site actually renders.
 *
 * This registry is the whole reason the preview cannot drift from the site:
 * it hands back the real component, never a copy. Adding a section here is the
 * only work a new section needs to become previewable.
 *
 * `namespace` is the next-intl namespace the component reads. The preview host
 * merges incoming draft data at that key, so a component that reads
 * `useTranslations("hero")` sees the draft with no knowledge of the studio.
 */

import type { ComponentType } from "react";
import { Hero } from "@/components/sections/Hero";

export interface PreviewEntry {
  Component: ComponentType;
  namespace: string;
  /** Shown in the studio's section list. */
  label: string;
}

export const PREVIEW_REGISTRY: Record<string, PreviewEntry> = {
  hero: { Component: Hero, namespace: "hero", label: "Hero" },
};

export type PreviewSectionKey = keyof typeof PREVIEW_REGISTRY;

export function getPreviewEntry(key: string): PreviewEntry | undefined {
  return PREVIEW_REGISTRY[key];
}
