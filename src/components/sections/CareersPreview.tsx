"use client";

/**
 * Homepage summary of the Careers page: why people join, plus a route to the
 * open roles. Full listing lives at /careers.
 */

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

interface Value {
  title: string;
  desc: string;
}

export function CareersPreview() {
  const t = useTranslations("careersPreview");
  const values = t.raw("items") as Value[];

  return (
    <section id="careers" className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
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
            <p className="mt-4 text-sm leading-relaxed text-gray-muted">
              {t("description")}
            </p>
          </div>
          <MagneticButton href="/careers">{t("cta")}</MagneticButton>
        </div>

        <StaggerContainer className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <StaggerItem
              key={v.title}
              className="group relative overflow-hidden rounded-[var(--radius-md)] border border-black/5 bg-off-white p-6 transition-colors hover:border-primary/30"
            >
              <span className="pointer-events-none absolute -top-2 end-2 select-none text-[5rem] font-black leading-none text-black/[0.04]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative">
                <div className="h-1 w-10 rounded-full bg-primary" />
                <div className="mt-4 text-sm font-bold text-heading">
                  {v.title}
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-gray-muted">
                  {v.desc}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
