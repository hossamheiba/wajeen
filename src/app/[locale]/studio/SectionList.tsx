"use client";

/**
 * Every editable thing on the site, grouped by where it appears.
 *
 * The draft badge is per *root*, not per entry, because that is what the
 * database stores: seven entries share `aboutPage`, so a draft on any one of
 * them is a draft on all seven. Showing it per entry would suggest an
 * isolation that does not exist.
 */

import Link from "next/link";
import {
  GROUP_ORDER,
  STUDIO_ENTRIES,
  entriesSharingRoot,
  type StudioEntry,
} from "@/lib/studio/registry";
import { useStudio } from "./StudioShell";

const LOCALES = ["en", "ar"] as const;

export function SectionList({ locale }: { locale: string }) {
  const { blocks } = useStudio();

  const draftsByRoot = new Map<string, Set<string>>();
  for (const block of blocks?.blocks ?? []) {
    if (!block.has_draft) continue;
    const set = draftsByRoot.get(block.namespace) ?? new Set<string>();
    set.add(block.locale);
    draftsByRoot.set(block.namespace, set);
  }

  const grouped = new Map<string, StudioEntry[]>();
  for (const entry of STUDIO_ENTRIES) {
    grouped.set(entry.group, [...(grouped.get(entry.group) ?? []), entry]);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Sections</h1>
        <p className="text-sm text-neutral-500">
          {STUDIO_ENTRIES.length} entries · {new Set(STUDIO_ENTRIES.map((e) => e.root)).size}{" "}
          content blocks
        </p>
      </div>

      {GROUP_ORDER.filter((group) => grouped.has(group)).map((group) => (
        <section key={group} className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {group}
          </h2>
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {(grouped.get(group) ?? [])
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((entry) => {
                const drafts = draftsByRoot.get(entry.root);
                const shared = entriesSharingRoot(entry.root).length;
                return (
                  <li key={entry.key}>
                    <Link
                      href={`/${locale}/studio/${entry.key}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
                    >
                      <span className="font-medium">{entry.label}</span>
                      <code className="text-xs text-neutral-500">{entry.namespace}</code>

                      {entry.previewKey === null ? (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                          no preview
                        </span>
                      ) : null}

                      {shared > 1 ? (
                        <span
                          className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700"
                          title={`${shared} screens share the block "${entry.root}" and its version counter`}
                        >
                          shares {entry.root}
                        </span>
                      ) : null}

                      <span className="ms-auto flex gap-1">
                        {LOCALES.map((code) =>
                          drafts?.has(code) ? (
                            <span
                              key={code}
                              className="rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-medium uppercase text-white"
                            >
                              {code} draft
                            </span>
                          ) : null,
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
