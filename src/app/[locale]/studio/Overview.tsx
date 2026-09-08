"use client";

/**
 * The studio's home.
 *
 * Every number on this page comes from the API or from the registry. Nothing
 * is estimated, and where the data cannot support a claim the claim is not
 * made — the activity list is built from real block rows rather than pretending
 * each of the 44 screens has its own timestamp.
 */

import Link from "next/link";
import { useMemo } from "react";
import { Badge, StatusPill } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { Skeleton } from "@/components/studio/ui/Skeleton";
import { SectionLabel, Surface } from "@/components/studio/ui/Surface";
import { IconChevron, IconExternal, IconPublish } from "@/components/studio/icons";
import { STUDIO_ENTRIES, STUDIO_ROOTS } from "@/lib/studio/registry";
import { rootHref, rootName, timeAgo } from "@/lib/studio/ui";
import { studioCopy } from "@/lib/studio/i18n";
import { usePageMeta, useStudio } from "./StudioShell";

function Metric({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Surface className="flex flex-col justify-between gap-3">
      <SectionLabel>{label}</SectionLabel>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-3xl font-black leading-none tracking-tight text-heading">
          {value ?? "—"}
        </p>
      )}
      {hint ? <p className="text-xs text-gray-muted">{hint}</p> : null}
    </Surface>
  );
}

function greeting(copy: ReturnType<typeof studioCopy>): string {
  const hour = new Date().getHours();
  if (hour < 12) return copy.overview.morning;
  if (hour < 18) return copy.overview.afternoon;
  return copy.overview.evening;
}

export function Overview({ locale }: { locale: string }) {
  const { blocks, loading, username } = useStudio();
  const copy = studioCopy(locale);

  usePageMeta({ title: copy.overview.title, subtitle: copy.overview.subtitle }, [locale]);

  const recent = useMemo(() => {
    const rows = blocks?.blocks ?? [];
    return [...rows]
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 6);
  }, [blocks]);

  const draftCount = blocks?.pendingDrafts ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section>
        <p className="text-sm font-semibold text-primary">
          {copy.overview.greet(greeting(copy), username)}
        </p>
        <h2 className="mt-1 max-w-xl text-2xl font-black leading-tight tracking-tight text-heading sm:text-3xl">
          {copy.overview.headline}
        </h2>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Link href={`/${locale}/studio/sections`} className="contents">
            <Button>{copy.overview.browse}</Button>
          </Link>
          {draftCount ? (
            <Link href={`/${locale}/studio/drafts`} className="contents">
              <Button variant="secondary">{copy.overview.reviewDrafts(draftCount)}</Button>
            </Link>
          ) : null}
          <a href={`/${locale}`} target="_blank" rel="noreferrer" className="contents">
            <Button variant="ghost">
              {copy.common.openWebsite}
              <IconExternal width={14} height={14} />
            </Button>
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={copy.overview.metricSections}
          value={STUDIO_ENTRIES.length}
          hint={copy.overview.metricSectionsHint}
        />
        <Metric
          label={copy.overview.metricAreas}
          value={STUDIO_ROOTS.length}
          hint="EN · AR"
        />
        <Metric
          label={copy.overview.metricDrafts}
          value={draftCount}
          hint={
            draftCount ? copy.overview.metricDraftsWaiting : copy.overview.metricDraftsNone
          }
          loading={loading && !blocks}
        />
        <Metric
          label={copy.overview.metricVersion}
          value={blocks?.currentRevision !== null && blocks ? `#${blocks.currentRevision}` : null}
          hint={copy.overview.metricVersionHint}
          loading={loading && !blocks}
        />
      </section>

      {draftCount ? (
        <Surface className="flex flex-wrap items-center gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-ui bg-primary/[0.08] text-primary">
            <IconPublish width={18} height={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-heading">
              {copy.overview.readyTitle(draftCount)}
            </p>
            <p className="text-xs text-gray-muted">{copy.overview.readyBody}</p>
          </div>
          <Link href={`/${locale}/studio/publish`} className="contents">
            <Button>{copy.overview.reviewAndPublish}</Button>
          </Link>
        </Surface>
      ) : null}

      <section>
        <SectionLabel>{copy.overview.recent}</SectionLabel>
        <Surface padded={false} className="mt-3 overflow-hidden">
          {loading && !blocks ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="p-6 text-sm text-gray-muted">{copy.overview.recentEmpty}</p>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {recent.map((block) => (
                <li key={`${block.namespace}-${block.locale}`}>
                  <Link
                    href={rootHref(block.namespace, locale)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-heading">
                        {rootName(block.namespace, locale)}
                      </span>
                      <span className="block text-xs text-gray-muted">
                        {timeAgo(block.updated_at, locale)}
                      </span>
                    </span>
                    <Badge tone="neutral">{block.locale.toUpperCase()}</Badge>
                    {block.has_draft ? (
                      <StatusPill tone="draft">{copy.common.draft}</StatusPill>
                    ) : null}
                    <IconChevron width={14} height={14} className="text-gray-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </section>
    </div>
  );
}
