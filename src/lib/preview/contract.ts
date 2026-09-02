/**
 * The studio ↔ preview message contract.
 *
 * Both sides import these types and the guard, so the shape cannot drift on
 * one side only. Versioned from the start: `v` lets a newer studio talk to an
 * iframe still serving an older bundle without silently misreading it.
 */

export const PREVIEW_PROTOCOL_VERSION = 1;

/** Studio → iframe. `data` is a whole next-intl namespace, in message shape. */
export interface PreviewUpdate {
  type: "wjeen:preview:update";
  v: number;
  locale: string;
  namespace: string;
  data: Record<string, unknown>;
}

/** iframe → studio, once the section has mounted and is listening. */
export interface PreviewReady {
  type: "wjeen:preview:ready";
  v: number;
}

/** iframe → studio, when a message could not be applied. */
export interface PreviewError {
  type: "wjeen:preview:error";
  v: number;
  message: string;
}

export type PreviewMessage = PreviewUpdate | PreviewReady | PreviewError;

/**
 * Every listener runs this first. Origin is checked by the caller against
 * `window.location.origin` — the studio and the preview are the same Next app,
 * so a cross-origin message is by definition not ours.
 */
export function isPreviewMessage(value: unknown): value is PreviewMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.type === "string" &&
    m.type.startsWith("wjeen:preview:") &&
    m.v === PREVIEW_PROTOCOL_VERSION
  );
}

/**
 * Namespaces are paths, not keys.
 *
 * Ten sections read a nested namespace — `aboutPage.story`, `careersPage.values`
 * and so on — so indexing the message tree with the namespace as a flat key
 * finds nothing. Both helpers walk the dots instead.
 */
export function getAtPath(
  tree: Record<string, unknown>,
  path: string,
): Record<string, unknown> | undefined {
  let node: unknown = tree;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "object" && node !== null
    ? (node as Record<string, unknown>)
    : undefined;
}

/**
 * Returns a new tree with `path` replaced, copying each level on the way down.
 *
 * Siblings survive at every depth — writing `careersPage.values` must not
 * disturb `careersPage.benefits`, exactly as replacing a namespace must not
 * drop the keys the editor does not know about. Same invariant, applied to
 * nesting rather than to one object.
 */
export function setAtPath(
  tree: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...tree, [head]: value };

  const child = tree[head];
  const branch =
    typeof child === "object" && child !== null
      ? (child as Record<string, unknown>)
      : {};
  return { ...tree, [head]: setAtPath(branch, rest.join("."), value) };
}
