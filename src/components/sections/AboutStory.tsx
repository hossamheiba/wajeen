"use client";

// Converted from a server component for Stage 3A. Nothing about what it
// renders changed — it had no server-only work, no data access and no
// interactivity, only `getTranslations`. As a client component it reads the
// same namespace through the same provider, which is what lets the studio
// preview swap in draft messages and re-render it live. It still renders in
// full in the server HTML, so SSR output and SEO are unaffected.

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Milestone {
  year: string;
  label: string;
}

export function AboutStory() {
  const t = useTranslations("aboutPage.story");
  const milestones = t.raw("milestones") as Milestone[];

  return (
    <section id="story" className="bg-white section-y">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading eyebrow={t("tag")} title={t("title")} />
            <p className="mt-5 t-small text-gray-muted">{t("body1")}</p>
            <p className="mt-4 t-small text-gray-muted">{t("body2")}</p>
          </div>

          <div className="space-y-6 border-s-2 border-black/10 ps-8">
            {milestones.map((m) => (
              <div key={m.year} className="relative">
                <div className="absolute -start-[2.55rem] top-1 h-3 w-3 rounded-full bg-primary" />
                <div className="text-2xl font-extrabold text-black">{m.year}</div>
                <div className="mt-1 text-sm text-gray-muted">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
