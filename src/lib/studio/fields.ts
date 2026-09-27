/**
 * The editor's field shapes are *inferred from the content*, never declared.
 *
 * Hand-authoring a schema for 44 entries would guarantee drift: the messages
 * change, the schema does not, and the editor starts hiding fields nobody
 * notices are missing. Reading the shape off the data means a new key becomes
 * editable the moment it exists.
 *
 * The registry may still supply labels and ordering on top — cosmetics only,
 * never the shape.
 */

import type { Json, Segment } from "./paths";
import { typeName } from "./paths";
import { FIELD_NAMES_AR, fieldHidden } from "./fieldNames";

export type FieldNode =
  | { kind: "text"; segments: Segment[]; label: string; multiline: boolean }
  | { kind: "number"; segments: Segment[]; label: string; integer: boolean }
  | { kind: "boolean"; segments: Segment[]; label: string }
  | { kind: "object"; segments: Segment[]; label: string; children: FieldNode[] }
  | {
      kind: "array";
      segments: Segment[];
      label: string;
      items: FieldNode[];
      /** Shape for a new item, or null when the array is empty and has none. */
      template: Json;
    }
  | { kind: "empty"; segments: Segment[]; label: string; container: "list" | "dict" };

/**
 * "ctaPrimary" → "Cta primary"; "line1" → "Line 1"; 3 → "Item 4".
 *
 * In Arabic the key is looked up in `fieldNames` first — the content's own
 * vocabulary, named once — and only falls back to the English tidy-up when a
 * key has no Arabic name yet, because a field with an English label is still
 * editable while a blank one is not.
 */
export function humanise(segment: Segment, locale = "en"): string {
  const ar = locale === "ar";
  if (typeof segment === "number") return ar ? `عنصر ${segment + 1}` : `Item ${segment + 1}`;
  if (ar && segment in FIELD_NAMES_AR) return FIELD_NAMES_AR[segment];
  const spaced = segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The order a section reads in, whatever order the record is stored in.
 *
 * Content reaches the editor from Postgres as JSONB, which does not keep key
 * order — so a section whose file reads tag, title, description arrived with
 * its description somewhere near the bottom, under lists it introduces. That
 * is not a storage detail an editor should have to know.
 *
 * Only the words that open a section are placed. Everything else keeps the
 * order it arrived in, so a list of rows is never reshuffled.
 */
const FIELD_ORDER = [
  "tag",
  "eyebrow",
  "title",
  "headline",
  // The hero's headline is its slides, and they open the page.
  "slides",
  "titleEnd",
  "subtitle",
  "description",
  "desc",
  "summary",
  "lead",
  "body",
  "body1",
  "body2",
  "body3",
  "quote",
  "note",
];

function fieldRank(key: string): number {
  const at = FIELD_ORDER.indexOf(key);
  return at === -1 ? FIELD_ORDER.length : at;
}

/** Long or wrapped copy gets a textarea; a headline gets a single line. */
const MULTILINE_AT = 90;

export function describe(
  value: Json,
  segments: Segment[] = [],
  locale = "en",
  /** The block's root, so a path can be matched against the hidden list. */
  namespace = "",
): FieldNode {
  const label = segments.length ? humanise(segments[segments.length - 1], locale) : "";

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: "empty", segments, label, container: "list" };
    }
    return {
      kind: "array",
      segments,
      label,
      items: value.map((item, index) => describe(item, [...segments, index], locale, namespace)),
      template: blankFrom(value[0]),
    };
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, Json>)
      .map((entry, index) => ({ entry, index }))
      // A stable sort by rank: the opening words first, everything else in
      // the order it came.
      .sort((a, b) => fieldRank(a.entry[0]) - fieldRank(b.entry[0]) || a.index - b.index)
      .map(({ entry }) => entry)
      .filter(
      // A hidden field stays in the record and out of the form — see
      // `FIELD_HIDDEN`. Filtered here rather than in the form so every screen
      // that reads a field tree agrees on what is editable.
      ([key]) =>
        !fieldHidden(
          namespace,
          [...segments, key]
            .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
            .join(".")
            .replace(/\.\[/g, "["),
        ),
    );
    if (entries.length === 0) {
      return { kind: "empty", segments, label, container: "dict" };
    }
    return {
      kind: "object",
      segments,
      label,
      children: entries.map(([key, child]) => describe(child, [...segments, key], locale, namespace)),
    };
  }

  if (typeof value === "number") {
    return { kind: "number", segments, label, integer: Number.isInteger(value) };
  }
  if (typeof value === "boolean") {
    return { kind: "boolean", segments, label };
  }

  const text = typeof value === "string" ? value : String(value ?? "");
  return {
    kind: "text",
    segments,
    label,
    multiline: text.length > MULTILINE_AT || text.includes("\n"),
  };
}

/**
 * A blank item shaped like an existing one.
 *
 * Types are carried over, not reset to string: a new project whose `manpower`
 * arrives as "" instead of 0 would flip an int to a str and fail the type
 * census, which is the whole reason that gate exists.
 */
export function blankFrom(sample: Json): Json {
  if (Array.isArray(sample)) return sample.map((item) => blankFrom(item));
  if (sample !== null && typeof sample === "object") {
    return Object.fromEntries(
      Object.entries(sample as Record<string, Json>).map(([key, value]) => [
        key,
        blankFrom(value),
      ]),
    );
  }
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  return "";
}

/**
 * Coerce what a control produced back to the type the content already had.
 *
 * `<input type="number">` yields a string; writing it straight back turns
 * `manpower: 160` into `manpower: "160"` and silently breaks the round-trip
 * gate. Every write goes through here.
 */
export function coerce(raw: string | number | boolean, previous: Json): Json {
  const want = typeName(previous);

  if (want === "int" || want === "float") {
    const parsed = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isFinite(parsed)) return previous;
    return want === "int" ? Math.trunc(parsed) : parsed;
  }
  if (want === "bool") return Boolean(raw);
  if (want === "str") return String(raw);

  // Unknown or null: leave it exactly as it was rather than guess.
  return previous;
}

/** Flattens a tree into the leaves a form actually renders. */
export function leaves(node: FieldNode): FieldNode[] {
  if (node.kind === "object") return node.children.flatMap(leaves);
  if (node.kind === "array") return node.items.flatMap(leaves);
  return [node];
}
