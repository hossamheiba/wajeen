"use client";

/**
 * One editing screen for all 44 sections.
 *
 * The rule that keeps an edit safe is the one Stage 2 found and 3A proved:
 * the form is seeded from the *whole* stored record and only a part of it is
 * shown. `hero` also carries a scroll label no field here touches; because the
 * draft is built from the complete record, that value rides along instead of
 * vanishing on the first keystroke.
 *
 * The saved patch is the part this screen owns, so the server merges it in
 * place rather than replacing the record.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PREVIEW_PROTOCOL_VERSION,
  isPreviewMessage,
} from "@/lib/preview/contract";
import { PreviewPanel } from "@/components/studio/PreviewPanel";
import { Badge, StatusPill } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { Skeleton } from "@/components/studio/ui/Skeleton";
import { Surface } from "@/components/studio/ui/Surface";
import { useToast } from "@/components/studio/ui/Toast";
import { IconEye, IconWarning } from "@/components/studio/icons";
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
import { present, siblings } from "@/lib/studio/ui";
import { usePageMeta, useStudio } from "../StudioShell";
import { FieldTree } from "./FieldTree";

const LOCALES = ["en", "ar"] as const;

export function SectionEditor({ locale, entryKey }: { locale: string; entryKey: string }) {
  const entry = STUDIO_REGISTRY[entryKey];
  const info = present(entry);
  const shared = siblings(entry);
  const { reload } = useStudio();
  const toast = useToast();

  const [editing, setEditing] = useState<string>(locale);
  const [block, setBlock] = useState<BlockDetail | null>(null);
  /** The WHOLE record, not just this screen's part. */
  const [root, setRoot] = useState<Json>(null);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [previewReady, setPreviewReady] = useState(false);
  const [frameKey, setFrameKey] = useState(0);

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
    } catch (error) {
      toast(error instanceof ApiError ? error.detail : "Could not load this section.");
    } finally {
      setBusy(false);
    }
  }, [entry.root, editing, toast]);

  useEffect(() => {
    // The rule cannot see through the awaits: every setState in this loader
    // runs after a network round-trip, not synchronously on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /**
   * True only when the loaded record is the one being edited. Without it the
   * previous language's fields stay on screen while the next is still in
   * flight — long enough to type into, and the arriving response then
   * overwrites what was typed.
   */
  const ready = block !== null && block.locale === editing;
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
      if (event.data.type === "wjeen:preview:error") toast(event.data.message, "error");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [toast]);

  useEffect(() => {
    if (previewReady) post(subtree);
  }, [previewReady, subtree, post]);

  // ------------------------------------------------------------ editing

  const onChange = useCallback(
    (segments: Segment[], next: Json) => {
      setRoot((current: Json) => setAt(current, [...pathSegments, ...segments], next));
      setDirty(true);
    },
    [pathSegments],
  );

  const isLocked = useCallback(
    (segments: Segment[]) =>
      isEntityArray(
        entry.namespace,
        segments.filter((segment) => typeof segment === "string").join("."),
      ),
    [entry.namespace],
  );

  /**
   * The last check before a save. The server refuses key loss and type drift
   * too, but catching it here names the field instead of the record, and never
   * sends a request that is known to fail.
   */
  const problems = useMemo(() => {
    if (!ready || root === null) return [];
    const before = block.effective;

    const lost = lostPaths(before, root);
    if (lost.length) {
      return [`This would remove ${lost.length} field${lost.length === 1 ? "" : "s"}.`];
    }

    const drifted = keyPaths(before).filter((path) => {
      const was = readAt(before, path);
      const now = readAt(root, path);
      return now !== undefined && typeName(was) !== typeName(now);
    });
    return drifted.length
      ? [`${drifted.length} field${drifted.length === 1 ? "" : "s"} changed type.`]
      : [];
  }, [ready, block, root]);

  const canSave = ready && dirty && !saving && problems.length === 0;

  const save = useCallback(async () => {
    if (!block || subtree === undefined || !canSave) return;
    setSaving(true);
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
      toast("Draft saved.");
      await reload();
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        setConflict(error.detail);
      } else {
        toast(error instanceof ApiError ? error.detail : "Save failed.", "error");
      }
    } finally {
      setSaving(false);
    }
  }, [block, subtree, canSave, entry.root, entry.path, editing, toast, reload]);

  const discard = useCallback(async () => {
    if (!block) return;
    setSaving(true);
    try {
      await discardDraft(entry.root, editing, block.version);
      await load();
      await reload();
      toast("Draft discarded. The live site is unchanged.");
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) setConflict(error.detail);
      else toast("Could not discard the draft.", "error");
    } finally {
      setSaving(false);
    }
  }, [block, entry.root, editing, load, reload, toast]);

  const switchLocale = useCallback(
    (code: string) => {
      if (code === editing) return;
      // Each language is stored separately, so switching loads different
      // content. Losing an unsaved edit to that silently is not acceptable.
      if (dirty && !window.confirm("Discard the unsaved changes in this language?")) return;
      setEditing(code);
    },
    [dirty, editing],
  );

  const previewSrc =
    entry.previewKey === null ? null : `/${editing}/__preview/${entry.previewKey}`;

  usePageMeta(
    {
      title: info.name,
      subtitle: info.description,
      crumbs: [
        { label: "Studio", href: `/${locale}/studio` },
        { label: "Sections", href: `/${locale}/studio/sections` },
        { label: info.name },
      ],
      actions: (
        <>
          <div className="flex items-center gap-0.5 rounded-ui border border-black/10 bg-white p-0.5">
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                aria-label={`Edit in ${code}`}
                aria-pressed={editing === code}
                onClick={() => switchLocale(code)}
                className={`rounded-[calc(var(--radius-ui)-2px)] px-2.5 py-1.5 text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  editing === code
                    ? "bg-primary text-white"
                    : "text-gray-muted hover:bg-black/[0.04] hover:text-heading"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {previewSrc ? (
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              aria-pressed={tab === "preview"}
              onClick={() => setTab(tab === "preview" ? "edit" : "preview")}
            >
              <IconEye width={14} height={14} />
              {tab === "preview" ? "Edit" : "Preview"}
            </Button>
          ) : null}

          <Button size="sm" onClick={save} disabled={!canSave}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </>
      ),
    },
    [locale, editing, tab, canSave, saving, info.name, previewSrc, switchLocale, save],
  );

  return (
    <div className="mx-auto max-w-[110rem]">
      {conflict ? (
        <Surface className="mb-5 border-amber-300 bg-amber-50/70">
          <div className="flex gap-3">
            <IconWarning width={18} height={18} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900" role="alert">
                Someone else changed this while you were editing.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">{conflict}</p>
              {shared.length ? (
                <p className="mt-1 text-xs text-amber-700">
                  {shared.length} other screen{shared.length === 1 ? "" : "s"} edit the same
                  content, so this can happen without anyone opening {info.name}.
                </p>
              ) : null}
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    setBusy(true);
                    void load();
                  }}
                >
                  Reload the latest
                </Button>
              </div>
            </div>
          </div>
        </Surface>
      ) : null}

      {problems.map((problem) => (
        <p
          key={problem}
          role="alert"
          className="mb-5 rounded-ui bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {problem} Undo that change before saving.
        </p>
      ))}

      <div className={previewSrc ? "grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]" : ""}>
        <div className={tab === "preview" && previewSrc ? "hidden lg:block" : ""}>
          <Surface>
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-black/[0.06] pb-3">
              {ready && block.hasDraft ? (
                <StatusPill tone="draft">Unpublished draft</StatusPill>
              ) : (
                <StatusPill tone="live">Matches the live site</StatusPill>
              )}
              {dirty ? <Badge tone="warning">Unsaved</Badge> : null}
              {shared.length ? (
                <span className="ms-auto text-[11px] text-gray-muted">
                  Shared with {shared.length} other screen{shared.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {fields ? (
              <FieldTree node={fields} value={subtree} onChange={onChange} isLocked={isLocked} />
            ) : (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <Skeleton className="mb-2 h-3 w-24" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
              </div>
            )}

            {ready && block.hasDraft ? (
              <div className="mt-5 border-t border-black/[0.06] pt-4">
                <Button variant="danger" size="sm" onClick={discard} disabled={saving || busy}>
                  Discard draft
                </Button>
                <p className="mt-2 text-[11px] text-gray-muted">
                  Removes the unpublished changes. The live site is not affected.
                </p>
              </div>
            ) : null}
          </Surface>
        </div>

        {previewSrc ? (
          <div className={tab === "edit" ? "hidden lg:block" : ""}>
            <PreviewPanel
              key={`${entry.previewKey}-${editing}-${frameKey}`}
              src={previewSrc}
              title={`${info.name} preview`}
              locale={editing}
              frameRef={frameRef}
              onReload={() => {
                setPreviewReady(false);
                setFrameKey((current) => current + 1);
              }}
            />
          </div>
        ) : (
          <Surface className="mt-6 lg:mt-0">
            <p className="text-sm text-gray-muted">
              This content appears across the whole site rather than in one section,
              so there is nothing single to preview. Everything else works the same.
            </p>
            <Link
              href={`/${editing}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
            >
              Open the website
            </Link>
          </Surface>
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
