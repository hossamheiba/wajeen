"use client";

// Converted from a server component for Stage 3A. Nothing about what it
// renders changed — it had no server-only work, no data access and no
// interactivity, only `getTranslations`. As a client component it reads the
// same namespace through the same provider, which is what lets the studio
// preview swap in draft messages and re-render it live. It still renders in
// full in the server HTML, so SSR output and SEO are unaffected.

/**
 * "Who we are" — a centred chip, heading and the two paragraphs.
 *
 * The timeline that used to stand beside this text was removed at the client's
 * request (2026-11-22), and the section now takes the same shape as the
 * testimonials header further down the page: the chip and the heading in the
 * middle of the screen, the copy in a card beneath. The milestones are still
 * in the content tree — the CMS never deletes a key — but nothing reads them
 * and the studio no longer offers them (`RETIRED_FIELDS`).
 */

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";

export function AboutStory({ as: as_ = "h2" }: { as?: "h1" | "h2" } = {}) {
  // The story page's own header carries no title any more — it repeated the
  // About header — so this section's heading is the page's heading.
  const t = useTranslations("aboutPage.story");

  return (
    <section
      id="story"
      className="relative overflow-hidden bg-gradient-to-b from-white via-off-white to-white section-y-lg"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 container-feature">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("tag")}
            </span>
          </div>

          <SplitReveal
            as={as_}
            type="words"
            className="mt-4 text-3xl font-black leading-tight text-heading sm:text-4xl lg:text-5xl"
          >
            {t("title")}
          </SplitReveal>
        </div>

        <div className="relative mx-auto mt-12 max-w-3xl rounded-frame border border-primary/10 bg-white/90 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-12">
          <div className="absolute inset-x-16 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
          <p className="t-body text-gray-muted">{t("body1")}</p>
          <p className="mt-5 t-body text-gray-muted">{t("body2")}</p>
        </div>
      </div>
    </section>
  );
}
