"use client";

/**
 * Homepage summary of the About page: who we are, plus the milestone spine.
 * Full story lives at /about.
 */

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";
import buildings from "../../../public/images/buildings.jpg";

interface Milestone {
  year: string;
  label: string;
}

export function AboutPreview() {
  const t = useTranslations("aboutPreview");
  const milestones = t.raw("milestones") as Milestone[];

  return (
    <section id="about" className="bg-off-white py-24">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("tag")}
          </div>
          <SplitReveal
            as="h2"
            type="words"
            className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl"
          >
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-muted">
            {t("description")}
          </p>

          <div className="mt-10 space-y-0">
            {milestones.map((m, i) => (
              <div key={m.year} className="flex gap-5">
                {/* spine */}
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary ring-4 ring-primary/15" />
                  {i < milestones.length - 1 && (
                    <span className="w-px flex-1 bg-black/10" />
                  )}
                </div>
                <div className="pb-7">
                  <div className="text-sm font-extrabold text-primary">
                    {m.year}
                  </div>
                  <div className="mt-0.5 text-sm leading-relaxed text-gray-muted">
                    {m.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            {t("cta")} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="relative order-first lg:order-last">
          <div className="relative h-[420px] overflow-hidden rounded-[var(--radius-lg)] lg:h-full lg:min-h-[520px]">
            <Image
              src={buildings}
              alt={t("title")}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </div>
          <div className="absolute -bottom-6 end-6 rounded-[var(--radius-md)] bg-white p-5 shadow-2xl">
            <div className="text-2xl font-extrabold text-primary">
              {t("badgeNumber")}
            </div>
            <div className="text-xs font-medium text-gray-muted">
              {t("badgeText")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
