"use client";

/**
 * History, and the one way back.
 *
 * Rolling back never rewrites a revision — it appends a new one carrying an
 * old snapshot, so the list only ever grows and a rollback can itself be
 * rolled back.
 *
 * The warning matters more than the button. Rollback deliberately leaves
 * pending drafts alone, and a draft is a whole namespace seeded when it was
 * opened: publishing one that predates the rollback re-applies its era's
 * fields, including the ones being reverted right now. So the affected drafts
 * are named here, with discarding offered as an explicit choice rather than a
 * side effect.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  listVersions,
  readVersion,
  rollback,
  type VersionDetail,
  type VersionSummary,
} from "@/lib/studio/api";
import { diffPaths, type PathDiff } from "@/lib/studio/paths";
import { STUDIO_ENTRIES } from "@/lib/studio/registry";
import { useStudio } from "../StudioShell";

export function VersionHistory() {
  const { blocks, reload, locale } = useStudio();
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [selected, setSelected] = useState<VersionDetail | null>(null);
  const [current, setCurrent] = useState<VersionDetail | null>(null);
  const [diff, setDiff] = useState<Record<string, PathDiff> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const drafts = (blocks?.blocks ?? []).filter((block) => block.has_draft);

  const refresh = useCallback(async () => {
    const { versions: list } = await listVersions();
    setVersions(list);
    const currentSummary = list.find((version) => version.is_current);
    if (currentSummary) setCurrent(await readVersion(currentSummary.number));
  }, []);

  useEffect(() => {
    // The rule cannot see through the awaits: every setState in these loaders
    // runs after a network round-trip, not synchronously on mount. Fetching on
    // mount is the whole job of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function inspect(number: number) {
    setError(null);
    setResult(null);
    const detail = await readVersion(number);
    setSelected(detail);
    if (current) {
      setDiff({
        en: diffPaths(current.snapshot.en, detail.snapshot.en),
        ar: diffPaths(current.snapshot.ar, detail.snapshot.ar),
      });
    }
  }

  async function restore() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const created = await rollback(
        selected.number,
        `Rollback to v${selected.number}`,
        current?.number ?? null,
      );
      setResult(
        `Restored v${selected.number} as new revision v${created.number}. History is intact.`,
      );
      setSelected(null);
      setDiff(null);
      await refresh();
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Rollback failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Versions</h1>
        <ul className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {(versions ?? []).map((version) => (
            <li key={version.number}>
              <button
                type="button"
                onClick={() => inspect(version.number)}
                className={`w-full px-4 py-3 text-start hover:bg-neutral-50 ${
                  selected?.number === version.number ? "bg-neutral-100" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <strong className="text-sm">v{version.number}</strong>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px]">
                    {version.source}
                  </span>
                  {version.is_current ? (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] text-white">
                      current
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {version.label || "—"}
                  {version.rolled_back_from
                    ? ` · restored v${version.rolled_back_from}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {!selected ? (
          <p className="rounded border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
            Pick a revision to see what restoring it would change.
          </p>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold">
              Restoring v{selected.number} — {selected.label || "no label"}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {new Date(selected.createdAt).toLocaleString()}
              {selected.createdBy ? ` · ${selected.createdBy}` : ""}
            </p>

            {selected.isCurrent ? (
              <p className="mt-4 rounded bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
                This is already the current revision.
              </p>
            ) : null}

            {diff ? (
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {(["en", "ar"] as const).map((code) => (
                  <div key={code}>
                    <dt className="text-xs font-semibold uppercase text-neutral-500">{code}</dt>
                    <dd className="mt-1 text-neutral-700">
                      {diff[code].changed.length} changed · {diff[code].added.length} added
                      {diff[code].removed.length ? (
                        <strong className="text-red-700">
                          {" "}
                          · {diff[code].removed.length} removed
                        </strong>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {drafts.length ? (
              <div className="mt-5 rounded border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">
                  {drafts.length} pending draft{drafts.length === 1 ? "" : "s"} will survive
                  this rollback.
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  That is deliberate — unpublished work is not thrown away. But a draft
                  opened before this rollback still carries its own era&apos;s fields, so
                  publishing it later would re-apply them and partly undo what you are about
                  to restore.
                </p>
                <ul className="mt-2 space-y-1">
                  {drafts.map((block) => {
                    const entry = STUDIO_ENTRIES.find((item) => item.root === block.namespace);
                    return (
                      <li key={`${block.namespace}-${block.locale}`} className="text-xs">
                        <Link
                          href={`/${locale}/studio/${entry?.key ?? ""}`}
                          className="text-amber-900 underline"
                        >
                          {block.namespace} [{block.locale}]
                        </Link>{" "}
                        — open it to discard the draft
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={restore}
              disabled={busy || selected.isCurrent}
              className="mt-5 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Restoring…" : `Restore v${selected.number} as a new revision`}
            </button>
            {current ? (
              <span className="ms-3 text-xs text-neutral-500">
                against revision v{current.number}
              </span>
            ) : null}
          </div>
        )}

        {result ? (
          <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {result}
          </p>
        ) : null}
      </div>
    </div>
  );
}
