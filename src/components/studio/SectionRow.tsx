"use client";

/**
 * One editable screen, as a row.
 *
 * Shared by the browser and the drafts list so a section looks the same
 * wherever it appears. Draft state is per language because that is how it is
 * stored — a section can have an Arabic draft and a published English one.
 */

import Link from "next/link";
import { Badge, StatusPill } from "./ui/Badge";
import { IconChevron } from "./icons";
import { studioCopy } from "@/lib/studio/i18n";
import type { SectionRow as Row } from "@/lib/studio/ui";
import { timeAgo } from "@/lib/studio/ui";

export function SectionRow({
  row,
  locale,
  showGroup = false,
}: {
  row: Row;
  locale: string;
  showGroup?: boolean;
}) {
  const { entry, presentation, draftLocales, updatedAt } = row;
  const copy = studioCopy(locale);

  return (
    <li>
      <Link
        href={`/${locale}/studio/${entry.key}`}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-heading">
              {presentation.name}
            </span>
            {showGroup ? <Badge tone="neutral">{row.groupLabel}</Badge> : null}
            {entry.previewKey === null ? (
              <Badge tone="neutral">{copy.common.noPreview}</Badge>
            ) : null}
          </span>
          {presentation.description ? (
            <span className="mt-0.5 block truncate text-xs text-gray-muted">
              {presentation.description}
            </span>
          ) : null}
        </span>

        <span className="hidden shrink-0 text-xs text-gray-muted sm:block">
          {timeAgo(updatedAt, locale)}
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {draftLocales.length ? (
            draftLocales.map((code) => (
              <StatusPill key={code} tone="draft">
                {code.toUpperCase()} {copy.common.draft}
              </StatusPill>
            ))
          ) : (
            <StatusPill tone="live">{copy.common.live}</StatusPill>
          )}
        </span>

        <IconChevron width={14} height={14} className="shrink-0 text-gray-muted" />
      </Link>
    </li>
  );
}
