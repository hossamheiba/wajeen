"use client";

// Converted from a server component for Stage 3A. Nothing about what it
// renders changed — it had no server-only work, no data access and no
// interactivity, only `getTranslations`. As a client component it reads the
// same namespace through the same provider, which is what lets the studio
// preview swap in draft messages and re-render it live. It still renders in
// full in the server HTML, so SSR output and SEO are unaffected.

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

interface Position {
  title: string;
  department: string;
  location: string;
  type: string;
}

export function OpenPositions() {
  const t = useTranslations("careersPage.positions");
  const items = t.raw("items") as Position[];

  return (
    <section className="bg-white section-y">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <SectionHeading eyebrow={t("tag")} title={t("title")} />
          </div>
          <p className="max-w-md t-small text-gray-muted">{t("description")}</p>
        </div>

        {items.length === 0 ? (
          <div className="card mt-12 text-center">
            <p className="t-small mx-auto max-w-xl text-gray-muted">{t("emptyState")}</p>
          </div>
        ) : (
        <div className="mt-12 flex flex-col divide-y divide-black/5 overflow-hidden rounded-frame border border-black/5 bg-off-white">
          {items.map((pos) => (
            <div
              key={pos.title}
              className="flex flex-col gap-4 p-6 transition-colors hover:bg-white sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-base font-bold text-heading">{pos.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-muted">
                  <span className="rounded-ui bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {pos.department}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {/* The same pin the office cards wear, not an emoji: an
                        emoji renders in the reader's own font and is read
                        aloud as "round pushpin" by a screen reader. */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </svg>
                    {pos.location}
                  </span>
                  <span>{pos.type}</span>
                </div>
              </div>
              <Button
                href="/contact"
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {t("applyLabel")}{" "}
                <span aria-hidden="true" className="inline-block rtl:rotate-180">
                  →
                </span>
              </Button>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
