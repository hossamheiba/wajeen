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
