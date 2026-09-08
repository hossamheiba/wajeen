"use client";

/**
 * Only what is waiting.
 *
 * Drafts are a workflow state, not a filter on a list — this is the screen the
 * rail's badge points at, and the one someone opens to answer "what have I got
 * outstanding?". When there is nothing here, that is good news and the page
 * says so rather than showing an empty table.
 */

import Link from "next/link";
import { useMemo } from "react";
import { SectionRow } from "@/components/studio/SectionRow";
import { Button } from "@/components/studio/ui/Button";
import { SkeletonRows } from "@/components/studio/ui/Skeleton";
import { Surface } from "@/components/studio/ui/Surface";
import { IconCheck } from "@/components/studio/icons";
import { studioCopy } from "@/lib/studio/i18n";
import { usePageMeta, useStudio } from "../StudioShell";
import { useSectionRows } from "../sections/SectionBrowser";

export function DraftList({ locale }: { locale: string }) {
  const { blocks } = useStudio();
  const { rows, ready } = useSectionRows();
  const copy = studioCopy(locale);

  const pending = useMemo(
    () => rows.filter((row) => row.draftLocales.length > 0),
    [rows],
  );

  const count = blocks?.pendingDrafts ?? 0;

  usePageMeta(
    {
      title: copy.drafts.title,
      subtitle: count ? copy.drafts.subtitleCount(count) : copy.drafts.subtitleNone,
    },
    [locale, count],
  );

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl">
        <SkeletonRows rows={4} label={copy.common.loading} />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <Surface className="py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-700">
            <IconCheck width={22} height={22} />
          </span>
          <p className="mt-4 text-sm font-bold text-heading">{copy.drafts.emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-gray-muted">
            {copy.drafts.emptyBody}
          </p>
          <div className="mt-5">
            <Link href={`/${locale}/studio/sections`} className="contents">
              <Button variant="secondary">{copy.overview.browse}</Button>
            </Link>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Surface className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-heading">
            {copy.drafts.summary(pending.length)}
          </p>
          <p className="text-xs text-gray-muted">{copy.drafts.privacy}</p>
        </div>
        <Link href={`/${locale}/studio/publish`} className="contents">
          <Button>{copy.overview.reviewAndPublish}</Button>
        </Link>
      </Surface>

      <Surface padded={false} className="overflow-hidden">
        <ul className="divide-y divide-black/[0.06]">
          {pending
            .sort((a, b) => a.presentation.name.localeCompare(b.presentation.name, locale))
            .map((row) => (
              <SectionRow key={row.entry.key} row={row} locale={locale} showGroup />
            ))}
        </ul>
      </Surface>
    </div>
  );
}
