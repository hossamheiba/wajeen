"use client";

/**
 * Nothing goes live from a button alone.
 *
 * Publish is all-or-nothing across every namespace, so this screen shows the
 * complete set of pending drafts, what each one changes, and whether the two
 * locales still line up — the backend refuses a drifted publish, and finding
 * that out here beats finding it out from a 412.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  publish,
  readBlock,
  readDraftMessages,
  type BlockSummary,
} from "@/lib/studio/api";
import { diffPaths, keyPaths, type PathDiff } from "@/lib/studio/paths";
import { useStudio } from "../StudioShell";

interface PendingChange {
  block: BlockSummary;
  diff: PathDiff;
}

export function PublishReview() {
  const { blocks, reload } = useStudio();
  const [pending, setPending] = useState<PendingChange[] | null>(null);
  const [parity, setParity] = useState<{ ok: boolean; detail: string } | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drafts = (blocks?.blocks ?? []).filter((block) => block.has_draft);

  const inspect = useCallback(async () => {
    const changes = await Promise.all(
      drafts.map(async (block) => {
        const detail = await readBlock(block.namespace, block.locale);
        return {
          block,
          diff: diffPaths(detail.published, detail.draft ?? detail.published),
        };
      }),
    );
    setPending(changes);

    // The same check the backend runs before it writes a revision.
    const [en, ar] = await Promise.all([readDraftMessages("en"), readDraftMessages("ar")]);
    const enPaths = new Set(keyPaths(en));
    const arPaths = new Set(keyPaths(ar));
    const missing = [...enPaths].filter((path) => !arPaths.has(path));
    const extra = [...arPaths].filter((path) => !enPaths.has(path));
    setParity(
      missing.length || extra.length
        ? {
            ok: false,
            detail: `Arabic is missing ${missing.length} path(s) and has ${extra.length} extra. First: ${
              [...missing, ...extra][0]
            }`,
          }
        : { ok: true, detail: `${enPaths.size} key paths, identical in both locales.` },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => {
    // The rule cannot see through the awaits: every setState in these loaders
    // runs after a network round-trip, not synchronously on mount. Fetching on
    // mount is the whole job of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (blocks) void inspect();
  }, [blocks, inspect]);

  async function ship() {
    setBusy(true);
    setError(null);
    try {
      const version = await publish(label, blocks?.currentRevision ?? null);
      setResult(`Published as revision v${version.number}. All drafts are now clear.`);
      setLabel("");
      await reload();
      await inspect();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Publish</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Publishing promotes every pending draft at once and appends one immutable
        revision covering both locales.
      </p>

      {parity ? (
        <p
          className={`mt-4 rounded px-3 py-2 text-sm ${
            parity.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {parity.ok ? "Locale parity holds — " : "Locale parity is broken — "}
          {parity.detail}
        </p>
      ) : null}

      {drafts.length === 0 ? (
        <p className="mt-6 rounded border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
          No pending drafts. There is nothing to publish.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {(pending ?? []).map(({ block, diff }) => (
            <li key={`${block.namespace}-${block.locale}`} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <code className="text-sm font-medium">{block.namespace}</code>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] uppercase">
                  {block.locale}
                </span>
                <span className="ms-auto text-xs text-neutral-500">v{block.version}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-600">
                {diff.changed.length} changed · {diff.added.length} added
                {diff.removed.length ? (
                  <strong className="text-red-700"> · {diff.removed.length} REMOVED</strong>
                ) : null}
              </p>
              {diff.changed.slice(0, 4).map((path) => (
                <code key={path} className="mt-0.5 block text-[11px] text-neutral-500">
                  {path}
                </code>
              ))}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {result ? (
        <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={label}
          placeholder="Label for this revision (optional)"
          onChange={(event) => setLabel(event.target.value)}
          className="w-72 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={ship}
          disabled={busy || drafts.length === 0 || parity?.ok === false}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Publishing…" : `Publish ${drafts.length} draft${drafts.length === 1 ? "" : "s"}`}
        </button>
        {blocks?.currentRevision !== null ? (
          <span className="text-xs text-neutral-500">
            against revision v{blocks?.currentRevision}
          </span>
        ) : null}
      </div>
    </div>
  );
}
