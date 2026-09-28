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
 *   42  studio entries        38 previewable + 4 plain
 *   38  preview entries       PageHeader appears 4×, PillarGrid 2×
 *   34  distinct components   38 − 3 − 1
 *   27  message namespaces    top-level keys of messages/{locale}.json
 *   27  studio roots          every namespace is now reachable
 *   54  ContentBlock rows     27 × 2 locales
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
 * Lists whose rows each carry a picture in the media library.
 *
 * A binding's address is the row's position — `projectsPage.items[3]` — so
 * these are the lists where moving or removing a row has to move its
 * photographs with it. They were read-only here until 2026-09-26, on the
 * grounds that a later stage would move them to their own screen; that cost
 * editors the ability to fix a project's words, so the editor now moves the
 * bindings instead of refusing the edit (`moveRowBindings`).
 */
export const PICTURE_ARRAYS = new Set([
  "projectsPage.items",
  "clients.items",
  "gallery.items",
]);

/**
 * The fields a screen shows, when showing the whole block would repeat another
 * screen's work.
 *
 * Ten namespaces are edited as several sections, and an entry that owns the
 * root — a page header — was being handed every branch under it: opening
 * "About — page header" listed the story, the values, the leadership and the
 * governance all over again, each of which has a screen of its own.
 *
 * Two rules, both derived from the registry rather than written down twice:
 *
 *   1. A page header owns exactly its own three words.
 *   2. Any other screen hides the branches a sibling screen owns.
 */
const HEADER_FIELDS = ["tag", "title", "description"];

export function visibleFields(entry: StudioEntry): {
  only?: string[];
  hidden: string[];
} {
  if (entry.key.startsWith("pageHeader")) return { only: HEADER_FIELDS, hidden: [] };

  const prefix = entry.path ? `${entry.path}.` : "";
  const hidden = STUDIO_ENTRIES.filter(
    (other) =>
      other.key !== entry.key &&
      other.root === entry.root &&
      other.path &&
      other.path.startsWith(prefix) &&
      !other.key.startsWith("pageHeader"),
  ).map((other) => other.path.slice(prefix.length).split(".")[0]);

  return { hidden: [...new Set(hidden)] };
}

/**
 * Whether a picture belongs on this screen.
 *
 * The same rule the fields follow: a page header owns the banner behind its
 * own title, a section owns what sits inside it, and nobody is shown the
 * other three About pages' banners while editing one of them.
 */
export function ownsSlot(entry: StudioEntry, slotPath: string): boolean {
  const head = slotPath.split(".")[0].replace(/\[\d+\]$/, "");
  if (entry.key.startsWith("pageHeader")) return head === "header";
  if (entry.path) return slotPath === entry.path || slotPath.startsWith(`${entry.path}.`);
  return head !== "header" && !visibleFields(entry).hidden.includes(head);
}

export function carriesPictures(namespace: string, fieldPath: string): boolean {
  return PICTURE_ARRAYS.has(fieldPath ? `${namespace}.${fieldPath}` : namespace);
}
