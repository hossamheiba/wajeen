"use client";

/**
 * Every editable screen, searchable.
 *
 * Forty-four rows is too many for an undifferentiated list and too few to need
 * paging, so the answer is grouping plus a filter that works on the first
 * keystroke. Nothing here is fetched per keystroke — the rows are already in
 * memory, so a debounce would only add lag.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SectionRow } from "@/components/studio/SectionRow";
import { Button } from "@/components/studio/ui/Button";
import { SearchInput } from "@/components/studio/ui/SearchInput";
import { SkeletonRows } from "@/components/studio/ui/Skeleton";
import { SectionLabel, Surface } from "@/components/studio/ui/Surface";
import { STUDIO_ENTRIES } from "@/lib/studio/registry";
import {
  GROUP_DISPLAY_ORDER,
  filterRows,
  groupName,
  present,
  type SectionRow as Row,
  type StatusFilter,
} from "@/lib/studio/ui";
import { usePageMeta, useStudio } from "../StudioShell";

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
];

export function useSectionRows(): { rows: Row[]; ready: boolean } {
  const { blocks } = useStudio();

  const rows = useMemo(() => {
    const drafts = new Map<string, string[]>();
    const updated = new Map<string, string>();

    for (const block of blocks?.blocks ?? []) {
      if (block.has_draft) {
        drafts.set(block.namespace, [...(drafts.get(block.namespace) ?? []), block.locale]);
      }
      const seen = updated.get(block.namespace);
      if (!seen || block.updated_at > seen) updated.set(block.namespace, block.updated_at);
    }

    return STUDIO_ENTRIES.map((entry) => ({
      entry,
      presentation: present(entry),
      group: groupName(entry),
      // Draft state belongs to the stored record, so every screen sharing a
      // record reports the same state. That is the truth, not a rounding.
      draftLocales: (drafts.get(entry.root) ?? []).sort(),
      updatedAt: updated.get(entry.root) ?? null,
    }));
  }, [blocks]);

  return { rows, ready: blocks !== null };
}

export function SectionBrowser({ locale }: { locale: string }) {
  const params = useSearchParams();
  const { rows, ready } = useSectionRows();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [localeFilter, setLocaleFilter] = useState<string | "all">("all");

  usePageMeta({ title: "Sections", subtitle: "Everything you can edit on the site" }, [locale]);

  const filtered = useMemo(
    () => filterRows(rows, { query, status, locale: localeFilter }),
    [rows, query, status, localeFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of filtered) {
      map.set(row.group, [...(map.get(row.group) ?? []), row]);
    }
    return map;
  }, [filtered]);

  const dirty = query !== "" || status !== "all" || localeFilter !== "all";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Surface className="space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search sections"
          placeholder="Search sections…"
        />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
            {STATUSES.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={status === option.key}
                onClick={() => setStatus(option.key)}
                className={`rounded-ui px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  status === option.key
                    ? "bg-primary text-white"
                    : "text-gray-muted hover:bg-black/[0.04] hover:text-heading"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {status === "draft" ? (
            <div className="flex items-center gap-1" role="group" aria-label="Filter by language">
              {(["all", "en", "ar"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={localeFilter === code}
                  onClick={() => setLocaleFilter(code)}
                  className={`rounded-ui px-3 py-1.5 text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    localeFilter === code
                      ? "bg-primary text-white"
                      : "text-gray-muted hover:bg-black/[0.04] hover:text-heading"
                  }`}
                >
                  {code === "all" ? "Both" : code}
                </button>
              ))}
            </div>
          ) : null}

          <span className="ms-auto text-xs text-gray-muted">
            {filtered.length} of {rows.length}
          </span>

          {dirty ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setLocaleFilter("all");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </Surface>

      {!ready ? (
        <SkeletonRows rows={6} />
      ) : filtered.length === 0 ? (
        <Surface className="py-14 text-center">
          <p className="text-sm font-bold text-heading">No sections match that.</p>
          <p className="mt-1 text-xs text-gray-muted">
            Try a different word, or clear the filters.
          </p>
        </Surface>
      ) : (
        GROUP_DISPLAY_ORDER.filter((group) => grouped.has(group)).map((group) => (
          <section key={group}>
            <SectionLabel>{group}</SectionLabel>
            <Surface padded={false} className="mt-3 overflow-hidden">
              <ul className="divide-y divide-black/[0.06]">
                {(grouped.get(group) ?? [])
                  .sort((a, b) => a.presentation.name.localeCompare(b.presentation.name))
                  .map((row) => (
                    <SectionRow key={row.entry.key} row={row} locale={locale} />
                  ))}
              </ul>
            </Surface>
          </section>
        ))
      )}
    </div>
  );
}
