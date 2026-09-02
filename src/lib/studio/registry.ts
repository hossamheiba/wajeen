/**
 * What the studio can edit.
 *
 * Built on the preview catalogue rather than replacing it: `registry.ts` still
 * owns the components and the preview route still resolves the same 40 keys.
 * Only the plain data is shared, which is why nothing here imports a section —
 * the studio and its tests can read the catalogue without pulling in React.
 *
 * The counts are worth stating once, because they are all different numbers
 * and mixing them up is how a section quietly becomes uneditable:
 *
 *   44  studio entries        40 previewable + 4 plain
 *   40  preview entries       PageHeader appears 5×, PillarGrid 2×
 *   35  distinct components   40 − 4 − 1
 *   28  message namespaces    top-level keys of messages/{locale}.json
 *   28  studio roots          every namespace is now reachable
 *   56  ContentBlock rows     28 × 2 locales
 *
 * An entry is NOT a row. Seven entries share the root `aboutPage`, so they
 * share one row per locale — and therefore one version counter.
 */

import { PREVIEW_ENTRY_META } from "@/lib/preview/entries";
import { splitNamespace } from "./paths";

export interface StudioEntry {
  /** URL segment: /studio/{key}. */
  key: string;
  /** The full namespace, which may carry one dot. */
  namespace: string;
  /** The ContentBlock row this entry writes to. */
  root: string;
  /** Where inside that row, relative to its top level. "" means the row itself. */
  path: string;
  label: string;
  group: string;
  /**
   * The preview registry key to render in the iframe, or null for namespaces
   * with no previewable section of their own. `nav`, `footer`, `meta` and
   * `notFound` are real content but not sections, and inventing a component
   * for them would put something on screen that the site never renders.
   */
  previewKey: string | null;
}

/**
 * Namespaces with no section to preview. They are edited as plain fields.
 * These are NOT website sections and must not be counted among the 35.
 */
const PLAIN_NAMESPACES: { key: string; namespace: string; label: string }[] = [
  { key: "nav", namespace: "nav", label: "Navigation" },
  { key: "footer", namespace: "footer", label: "Footer" },
  { key: "meta", namespace: "meta", label: "SEO & metadata" },
  { key: "notFound", namespace: "notFound", label: "404 page" },
];

const GROUP_BY_ROOT: Record<string, string> = {
  aboutPage: "About",
  aboutPreview: "About",
  businessPage: "Business",
  business: "Business",
  careersPage: "Careers",
  careersPreview: "Careers",
  contactPage: "Contact",
  projectsPage: "Projects",
  nav: "Global",
  footer: "Global",
  meta: "Global",
  notFound: "Global",
};

function groupFor(root: string): string {
  return GROUP_BY_ROOT[root] ?? "Home & shared";
}

function entryFor(
  key: string,
  namespace: string,
  label: string,
  previewKey: string | null,
): StudioEntry {
  const [root, path] = splitNamespace(namespace);
  return { key, namespace, root, path, label, group: groupFor(root), previewKey };
}

export const STUDIO_REGISTRY: Record<string, StudioEntry> = {
  ...Object.fromEntries(
    Object.entries(PREVIEW_ENTRY_META).map(([key, meta]) => [
      key,
      entryFor(key, meta.namespace, meta.label, key),
    ]),
  ),
  ...Object.fromEntries(
    PLAIN_NAMESPACES.map(({ key, namespace, label }) => [
      key,
      entryFor(key, namespace, label, null),
    ]),
  ),
};

export const STUDIO_ENTRIES: StudioEntry[] = Object.values(STUDIO_REGISTRY);

export function getStudioEntry(key: string): StudioEntry | undefined {
  return STUDIO_REGISTRY[key];
}

/** Every ContentBlock row the studio can reach, one per root. */
export const STUDIO_ROOTS: string[] = [
  ...new Set(STUDIO_ENTRIES.map((entry) => entry.root)),
].sort();

/** Entries sharing a root share a version counter — the list screen says so. */
export function entriesSharingRoot(root: string): StudioEntry[] {
  return STUDIO_ENTRIES.filter((entry) => entry.root === root);
}

export const GROUP_ORDER = [
  "Home & shared",
  "About",
  "Business",
  "Projects",
  "Careers",
  "Contact",
  "Global",
] as const;

/**
 * Arrays that Stage 3D moves into relational tables. Editing them here would
 * be work thrown away one stage later, and would teach editors a flow that is
 * about to change, so they are shown read-only.
 */
export const ENTITY_ARRAYS = new Set([
  "projectsPage.items",
  "clients.items",
  "servicesList.items",
  "certificates.items",
]);

export function isEntityArray(namespace: string, fieldPath: string): boolean {
  return ENTITY_ARRAYS.has(fieldPath ? `${namespace}.${fieldPath}` : namespace);
}
