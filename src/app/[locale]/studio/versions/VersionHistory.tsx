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
import { studioCopy } from "@/lib/studio/i18n";
import { usePageMeta, useStudio } from "../StudioShell";

export function VersionHistory({ locale }: { locale: string }) {
  const { blocks, reload } = useStudio();
  const toast = useToast();
  const copy = studioCopy(locale);

  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [selected, setSelected] = useState<VersionDetail | null>(null);
  const [current, setCurrent] = useState<VersionDetail | null>(null);
  const [diff, setDiff] = useState<Record<string, PathDiff> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const drafts = (blocks?.blocks ?? []).filter((block) => block.has_draft);

  usePageMeta(
    { title: copy.versions.title, subtitle: copy.versions.subtitle },
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
        copy.versions.label(selected.number),
        current?.number ?? null,
      );
      toast(copy.versions.done(selected.number, created.number));
      setSelected(null);
      setDiff(null);
      setConfirming(false);
      await refresh();
      await reload();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.detail : copy.versions.failed, "error");
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
        <SectionLabel>{copy.versions.history}</SectionLabel>
        <Surface padded={false} className="mt-3 overflow-hidden">
          {versions === null ? (
            <div className="p-4">
              <SkeletonRows rows={4} label={copy.common.loading} />
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
                          <StatusPill tone="live">{copy.common.live}</StatusPill>
                        ) : null}
                        {version.source === "rollback" ? (
                          <Badge tone="neutral">{copy.versions.restored}</Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-muted">
                        {version.label || copy.versions.noDescription}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-muted">
                        {timeAgo(version.created_at, locale)}
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
            <p className="mt-4 text-sm font-bold text-heading">{copy.versions.pickTitle}</p>
            <p className="mt-1 max-w-xs text-xs text-gray-muted">{copy.versions.pickBody}</p>
          </Surface>
        ) : (
          <Surface>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-heading">
                {copy.versions.versionNumber(selected.number)}
              </h2>
              {selected.isCurrent ? <StatusPill tone="live">Live</StatusPill> : null}
              {selected.rolledBackFrom ? (
                <Badge tone="neutral">
                  {copy.versions.restoredFrom(selected.rolledBackFrom)}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-gray-muted">
              {selected.label || copy.versions.noDescription} ·{" "}
              {timeAgo(selected.createdAt, locale)}
              {selected.createdBy ? ` · ${selected.createdBy}` : ""}
            </p>

            {selected.isCurrent ? (
              <p className="mt-5 rounded-ui bg-black/[0.03] px-3.5 py-3 text-sm text-gray-muted">
                {copy.versions.isCurrent}
              </p>
            ) : (
              <>
                <div className="mt-5 rounded-ui border border-black/[0.07] p-4">
                  <SectionLabel>{copy.versions.whatChanges}</SectionLabel>
                  {diff ? (
                    <p className="mt-2 text-sm text-heading">
                      {copy.versions.changeSummary(changedTotal, selected.number)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-muted">{copy.versions.comparing}</p>
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
                          {copy.versions.draftsKeptTitle(drafts.length)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-800">
                          {copy.versions.draftsKeptBody}
                        </p>
                        <ul className="mt-2 space-y-0.5">
                          {drafts.map((block) => (
                            <li key={`${block.namespace}-${block.locale}`} className="text-xs">
                              <Link
                                href={`/${locale}/studio/drafts`}
                                className="font-semibold text-amber-900 underline"
                              >
                                {rootName(block.namespace, locale)} ({block.locale.toUpperCase()})
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
                      {copy.versions.confirmTitle(selected.number)}
                    </p>
                    <p className="mt-1 text-xs text-gray-muted">{copy.versions.confirmBody}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={restore} disabled={busy}>
                        {busy ? copy.versions.restoring : copy.versions.confirmYes}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                        {copy.common.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <Button onClick={() => setConfirming(true)}>
                      {copy.versions.action(selected.number)}
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
