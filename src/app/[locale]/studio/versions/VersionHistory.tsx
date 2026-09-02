"use client";

/**
 * History, and the one way back.
 *
 * Restoring never rewrites a version — it adds a new one carrying older
 * content, so the list only grows and a restore can itself be undone.
 *
 * The warning matters more than the button. Restoring deliberately leaves
 * unpublished drafts alone, and a draft holds a whole section as it was when
 * it was opened: publishing one that predates a restore re-applies its own
 * era, including the fields being rolled back right now. So the affected
 * drafts are named here, and discarding them stays an explicit choice.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, StatusPill } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { SkeletonRows } from "@/components/studio/ui/Skeleton";
import { SectionLabel, Surface } from "@/components/studio/ui/Surface";
import { useToast } from "@/components/studio/ui/Toast";
import { IconVersions, IconWarning } from "@/components/studio/icons";
import {
  ApiError,
  listVersions,
  readVersion,
  rollback,
  type VersionDetail,
  type VersionSummary,
} from "@/lib/studio/api";
import { diffPaths, type PathDiff } from "@/lib/studio/paths";
import { rootName, timeAgo } from "@/lib/studio/ui";
import { usePageMeta, useStudio } from "../StudioShell";

export function VersionHistory({ locale }: { locale: string }) {
  const { blocks, reload } = useStudio();
  const toast = useToast();

  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [selected, setSelected] = useState<VersionDetail | null>(null);
  const [current, setCurrent] = useState<VersionDetail | null>(null);
  const [diff, setDiff] = useState<Record<string, PathDiff> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const drafts = (blocks?.blocks ?? []).filter((block) => block.has_draft);

  usePageMeta(
    { title: "Versions", subtitle: "Every published release, newest first" },
    [locale],
  );

  const refresh = useCallback(async () => {
    const { versions: list } = await listVersions();
    setVersions(list);
    const currentSummary = list.find((version) => version.is_current);
    if (currentSummary) setCurrent(await readVersion(currentSummary.number));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function inspect(number: number) {
    setConfirming(false);
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
    try {
      const created = await rollback(
        selected.number,
        `Restored version #${selected.number}`,
        current?.number ?? null,
      );
      toast(`Version #${selected.number} restored as #${created.number}.`);
      setSelected(null);
      setDiff(null);
      setConfirming(false);
      await refresh();
      await reload();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.detail : "Restore failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  const changedTotal = diff
    ? diff.en.changed.length + diff.ar.changed.length + diff.en.added.length + diff.ar.added.length
    : 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div>
        <SectionLabel>History</SectionLabel>
        <Surface padded={false} className="mt-3 overflow-hidden">
          {versions === null ? (
            <div className="p-4">
              <SkeletonRows rows={4} />
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {versions.map((version) => (
                <li key={version.number}>
                  <button
                    type="button"
                    onClick={() => inspect(version.number)}
                    aria-pressed={selected?.number === version.number}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
                      selected?.number === version.number
                        ? "bg-primary/[0.06]"
                        : "hover:bg-primary/[0.03]"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-black tracking-tight text-heading">
                          #{version.number}
                        </span>
                        {version.is_current ? (
                          <StatusPill tone="live">Live</StatusPill>
                        ) : null}
                        {version.source === "rollback" ? (
                          <Badge tone="neutral">Restored</Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-muted">
                        {version.label || "No description"}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-muted">
                        {timeAgo(version.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      <div>
        {!selected ? (
          <Surface className="grid place-items-center py-20 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/[0.07] text-primary">
              <IconVersions width={22} height={22} />
            </span>
            <p className="mt-4 text-sm font-bold text-heading">Pick a version</p>
            <p className="mt-1 max-w-xs text-xs text-gray-muted">
              Choose a release on the left to see what restoring it would change.
            </p>
          </Surface>
        ) : (
          <Surface>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-heading">
                Version #{selected.number}
              </h2>
              {selected.isCurrent ? <StatusPill tone="live">Live</StatusPill> : null}
              {selected.rolledBackFrom ? (
                <Badge tone="neutral">Restored #{selected.rolledBackFrom}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-gray-muted">
              {selected.label || "No description"} · {timeAgo(selected.createdAt)}
              {selected.createdBy ? ` · ${selected.createdBy}` : ""}
            </p>

            {selected.isCurrent ? (
              <p className="mt-5 rounded-ui bg-black/[0.03] px-3.5 py-3 text-sm text-gray-muted">
                This is what the site is showing right now.
              </p>
            ) : (
              <>
                <div className="mt-5 rounded-ui border border-black/[0.07] p-4">
                  <SectionLabel>What would change</SectionLabel>
                  {diff ? (
                    <p className="mt-2 text-sm text-heading">
                      <strong className="font-black">{changedTotal}</strong> field
                      {changedTotal === 1 ? "" : "s"} across both languages would go back
                      to how they were in version #{selected.number}.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-muted">Comparing…</p>
                  )}
                </div>

                {drafts.length ? (
                  <div className="mt-4 rounded-ui border border-amber-300 bg-amber-50/70 p-4">
                    <div className="flex gap-3">
                      <IconWarning
                        width={18}
                        height={18}
                        className="mt-0.5 shrink-0 text-amber-700"
                      />
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          {drafts.length} unpublished draft
                          {drafts.length === 1 ? "" : "s"} will be kept.
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-800">
                          That is on purpose — unfinished work is never thrown away. But a
                          draft written before this restore still holds the newer text, so
                          publishing it later would bring part of it back.
                        </p>
                        <ul className="mt-2 space-y-0.5">
                          {drafts.map((block) => (
                            <li key={`${block.namespace}-${block.locale}`} className="text-xs">
                              <Link
                                href={`/${locale}/studio/drafts`}
                                className="font-semibold text-amber-900 underline"
                              >
                                {rootName(block.namespace)} ({block.locale.toUpperCase()})
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                {confirming ? (
                  <div className="mt-5 rounded-ui border border-primary/25 bg-primary/[0.04] p-4">
                    <p className="text-sm font-bold text-heading">
                      Put version #{selected.number} back on the live site?
                    </p>
                    <p className="mt-1 text-xs text-gray-muted">
                      This adds a new version rather than deleting anything, so you can
                      undo it.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={restore} disabled={busy}>
                        {busy ? "Restoring…" : "Yes, restore it"}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <Button onClick={() => setConfirming(true)}>
                      Restore version #{selected.number}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Surface>
        )}
      </div>
    </div>
  );
}
