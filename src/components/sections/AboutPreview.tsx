"use client";

/**
 * Homepage summary of the About page: who we are, plus the milestone spine.
 * Full story lives at /about.
 */

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";
import buildings from "../../../public/images/buildings.jpg";

interface Milestone {
  year: string;
  label: string;
}

export function AboutPreview() {
  const t = useTranslations("aboutPreview");
  const milestones = t.raw("milestones") as Milestone[];

  return (
    <section id="about" className="bg-off-white section-y">
      <div className="container-page grid grid-cols-1 gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow={t("tag")} title={t("title")} />
          <p className="mt-4 max-w-md t-small text-gray-muted">
            {t("description")}
          </p>

          <StaggerContainer className="mt-10 space-y-0" stagger={0.12}>
            {milestones.map((m, i) => (
              <StaggerItem key={m.year} className="flex gap-5" y={16}>
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
                  <div className="mt-0.5 t-small text-gray-muted">
                    {m.label}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            {t("cta")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </Link>
        </div>

        <FadeUp className="relative order-first lg:order-last" y={20}>
          <div className="relative h-[420px] overflow-hidden rounded-frame lg:h-full lg:min-h-[520px]">
            <Image
              src={buildings}
              alt={t("title")}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </div>
          <div className="absolute -bottom-6 end-6 rounded-ui bg-white p-5 shadow-[var(--shadow-float)]">
            <div className="text-2xl font-extrabold text-primary">
              {t("badgeNumber")}
            </div>
            <div className="text-xs font-medium text-gray-muted">
              {t("badgeText")}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
