"use client";

/**
 * One editing screen for all 44 entries.
 *
 * The rule that makes it safe is the one Stage 2 established and 3A proved:
 * **the form is seeded from the whole ContentBlock row, and only a subtree of
 * it is displayed.** `hero` also carries a `scroll` label no field here
 * touches; because the draft is built from the complete row, that key rides
 * along untouched instead of vanishing on the first keystroke.
 *
 * The PATCH body is the subtree at `entry.path`, so the server merges it under
 * `draft_data.{path}` — `careersPage.values` is namespace `careersPage` plus
 * path `values`, never a root of its own.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PREVIEW_PROTOCOL_VERSION,
  isPreviewMessage,
} from "@/lib/preview/contract";
import {
  ApiError,
  discardDraft,
  patchBlock,
  readBlock,
  type BlockDetail,
} from "@/lib/studio/api";
import { describe } from "@/lib/studio/fields";
import {
  getAt,
  keyPaths,
  lostPaths,
  setAt,
  typeName,
  type Json,
  type Segment,
} from "@/lib/studio/paths";
import { STUDIO_REGISTRY, isEntityArray } from "@/lib/studio/registry";
import { useStudio } from "../StudioShell";
import { FieldTree } from "./FieldTree";

const LOCALES = ["en", "ar"] as const;
const DEVICES = [
  { key: "phone", label: "Phone", width: 390 },
  { key: "tablet", label: "Tablet", width: 834 },
  { key: "desktop", label: "Desktop", width: 1440 },
] as const;

type Device = (typeof DEVICES)[number]["key"];

/** How much of a real viewport fits beside the form. */
const PREVIEW_SCALE: Record<Device, { width: number; scale: number }> = {
  phone: { width: 390, scale: 1 },
  tablet: { width: 834, scale: 0.8 },
  desktop: { width: 1440, scale: 0.55 },
};

export function SectionEditor({ locale, entryKey }: { locale: string; entryKey: string }) {
  const entry = STUDIO_REGISTRY[entryKey];
  const { reload } = useStudio();

  const [editing, setEditing] = useState<string>(locale);
  const [block, setBlock] = useState<BlockDetail | null>(null);
  /** The WHOLE row, not the subtree — this is the merge invariant. */
  const [root, setRoot] = useState<Json>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [previewReady, setPreviewReady] = useState(false);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const pathSegments = useMemo(
    () => (entry.path ? entry.path.split(".") : []),
    [entry.path],
  );

  const load = useCallback(async () => {
    try {
      const detail = await readBlock(entry.root, editing);
      setConflict(null);
      setBlock(detail);
      setRoot(detail.effective);
      setDirty(false);
      setStatus(detail.hasDraft ? "Editing a saved draft." : null);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.detail : "Could not load this section.");
    } finally {
      setBusy(false);
    }
  }, [entry.root, editing]);

  useEffect(() => {
    // The rule cannot see through the awaits: every setState in these loaders
    // runs after a network round-trip, not synchronously on mount. Fetching on
    // mount is the whole job of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /**
   * True only when the loaded block is the one being edited.
   *
   * Without this the previous locale's fields stay on screen while the next
   * one is still in flight — long enough to type into, and the arriving
   * response then silently overwrites what was typed.
   */
  const ready = block !== null && block.locale === editing;

  /** The part of the row this entry is responsible for. */
  const subtree = useMemo(() => getAt(root, pathSegments), [root, pathSegments]);

  const fields = useMemo(
    () => (ready && subtree !== undefined ? describe(subtree) : null),
    [ready, subtree],
  );

  // ------------------------------------------------------------ preview

  const post = useCallback(
    (data: Json) => {
      const frame = frameRef.current;
      if (!frame?.contentWindow || data === undefined) return;
      frame.contentWindow.postMessage(
        {
          type: "wjeen:preview:update",
          v: PREVIEW_PROTOCOL_VERSION,
          locale: editing,
          namespace: entry.namespace,
          data,
        },
        // Same-origin app; never "*".
        window.location.origin,
      );
    },
    [editing, entry.namespace],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type === "wjeen:preview:ready") setPreviewReady(true);
      if (event.data.type === "wjeen:preview:error") setStatus(event.data.message);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (previewReady) post(subtree);
  }, [previewReady, subtree, post]);

  // ------------------------------------------------------------ editing

  const onChange = useCallback(
    (segments: Segment[], next: Json) => {
      setRoot((current: Json) => setAt(current, [...pathSegments, ...segments], next));
      setDirty(true);
      setStatus(null);
    },
    [pathSegments],
  );

  const isLocked = useCallback(
    (segments: Segment[]) =>
      isEntityArray(entry.namespace, segments.filter((s) => typeof s === "string").join(".")),
    [entry.namespace],
  );

  /**
   * The last line of defence before a save.
   *
   * The server refuses key loss and type drift too, but catching it here means
   * the editor never sends a request it knows will be rejected — and the
   * message names the field instead of the row.
   */
  const problems = useMemo(() => {
    if (!block || root === null) return [];
    const before = block.effective;
    const lost = lostPaths(before, root);
    if (lost.length) return [`Would drop ${lost.length} field(s): ${lost.slice(0, 5).join(", ")}`];

    const drifted = keyPaths(before).filter((path) => {
      const was = readAt(before, path);
      const now = readAt(root, path);
      return now !== undefined && typeName(was) !== typeName(now);
    });
    return drifted.length
      ? [`Type changed on ${drifted.length} field(s): ${drifted.slice(0, 5).join(", ")}`]
      : [];
  }, [block, root]);

  async function save() {
    if (!block || subtree === undefined || problems.length) return;
    setBusy(true);
    setStatus(null);
    setConflict(null);
    try {
      const result = await patchBlock(
        entry.root,
        editing,
        entry.path,
        subtree as Record<string, unknown>,
        block.version,
      );
      setBlock({ ...block, version: result.version, hasDraft: true, draft: result.draft });
      setDirty(false);
      setStatus("Draft saved.");
      await reload();
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        setConflict(error.detail);
      } else {
        setStatus(error instanceof ApiError ? error.detail : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (!block) return;
    setBusy(true);
    try {
      await discardDraft(entry.root, editing, block.version);
      await load();
      await reload();
      setStatus("Draft discarded. Published content is unchanged.");
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) setConflict(error.detail);
    } finally {
      setBusy(false);
    }
  }

  const previewSrc =
    entry.previewKey === null
      ? null
      : `/${editing}/__preview/${entry.previewKey}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${locale}/studio`} className="text-sm text-neutral-500 hover:underline">
          ← Sections
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{entry.label}</h1>
        <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
          {entry.root}
          {entry.path ? ` → ${entry.path}` : ""}
        </code>
        {block ? (
          <span className="text-xs text-neutral-500">v{block.version}</span>
        ) : null}

        <div className="ms-auto flex gap-1">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              aria-label={`Edit in ${code}`}
              aria-pressed={editing === code}
              onClick={() => {
                if (code === editing) return;
                // Each locale is a separate row, so switching loads different
                // content. Losing an unsaved edit to that is not acceptable
                // silently.
                if (
                  dirty &&
                  !window.confirm("Discard the unsaved changes in this locale?")
                ) {
                  return;
                }
                setEditing(code);
              }}
              className={`rounded px-3 py-1.5 text-sm uppercase ${
                editing === code ? "bg-neutral-900 text-white" : "border border-neutral-300"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {conflict ? (
        <div role="alert" className="mt-4 rounded border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Someone else changed this block while you were editing.
          </p>
          <p className="mt-1 text-sm text-amber-800">{conflict}</p>
          <p className="mt-1 text-xs text-amber-700">
            Screens sharing the block <code>{entry.root}</code> share its version, so this
            can happen without anyone touching {entry.label}.
          </p>
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              void load();
            }}
            className="mt-3 rounded bg-amber-900 px-3 py-1.5 text-sm text-white"
          >
            Reload the latest and re-apply my edit
          </button>
        </div>
      ) : null}

      {problems.map((problem) => (
        <p key={problem} role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {problem}
        </p>
      ))}

      <div className={`mt-6 grid gap-6 ${previewSrc ? "lg:grid-cols-[minmax(0,26rem)_1fr]" : ""}`}>
        <div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            {fields ? (
              <FieldTree node={fields} value={subtree} onChange={onChange} isLocked={isLocked} />
            ) : (
              <p className="text-sm text-neutral-500">
                {busy ? "Loading…" : "Nothing to edit here."}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={!ready || busy || !dirty || problems.length > 0}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
            {ready && block.hasDraft ? (
              <button
                type="button"
                onClick={discard}
                disabled={busy}
                className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-40"
              >
                Discard draft
              </button>
            ) : null}
            {status ? <span className="text-sm text-neutral-500">{status}</span> : null}
            {dirty ? (
              <span className="text-sm text-amber-700">Unsaved changes</span>
            ) : null}
          </div>
        </div>

        {previewSrc ? (
          <div>
            <div className="mb-2 flex gap-1">
              {DEVICES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setDevice(option.key)}
                  className={`rounded px-3 py-1 text-xs ${
                    device === option.key
                      ? "bg-neutral-900 text-white"
                      : "border border-neutral-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* The iframe is scaled, so its *layout* box is still full width.
                Absolute inside a clipped container keeps that box from
                overflowing and covering the form beside it. */}
            <div className="relative h-[70vh] overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <iframe
                ref={frameRef}
                key={`${entry.previewKey}-${editing}`}
                src={previewSrc}
                title={`${entry.label} preview`}
                className="absolute left-0 top-0 origin-top-left border-0"
                style={{
                  width: PREVIEW_SCALE[device].width,
                  height: `${100 / PREVIEW_SCALE[device].scale}%`,
                  transform: `scale(${PREVIEW_SCALE[device].scale})`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">
            This namespace is real content but not a rendered section, so there is no
            preview to show. Editing it is exactly the same everywhere else.
          </p>
        )}
      </div>
    </div>
  );
}

/** Reads a `a.b[0].c` path — the format `keyPaths` emits. */
function readAt(tree: Json, path: string): Json {
  const segments: Segment[] = [];
  for (const part of path.split(".")) {
    const [name, ...indices] = part.split("[");
    if (name) segments.push(name);
    for (const index of indices) segments.push(Number(index.replace("]", "")));
  }
  return getAt(tree, segments);
}
