"use client";

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";
import { ContentImage } from "@/components/ui/ContentImage";

interface Pillar {
  title: string;
  desc: string;
}

export function Sustainability() {
  const t = useTranslations("sustainability");
  const pillars = t.raw("pillars") as Pillar[];

  return (
    <section id="sustainability" className="bg-primary section-y">
      <div className="container-page grid grid-cols-1 gap-14 lg:grid-cols-2">
        <FadeUp className="relative" y={20}>
          <div className="relative h-[420px] overflow-hidden rounded-frame">
            <ContentImage
              namespace="sustainability"
              path="photo"
              fallbackSrc="/images/energy.jpg"
              alt={t("title")}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </div>
          {/* One line since the client removed the standard's number: the
              remaining text carries the badge, so it takes the weight. */}
          <div className="absolute -bottom-6 start-6 rounded-ui bg-white px-5 py-4 shadow-[var(--shadow-float)]">
            <div className="text-sm font-extrabold text-primary">{t("badgeText")}</div>
          </div>
        </FadeUp>

        <div>
          <SectionHeading eyebrow={t("tag")} title={t("title")} tone="dark" />
          <p className="mt-4 max-w-md t-small text-white/70">{t("description")}</p>

          <StaggerContainer className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pillars.map((p) => (
              <StaggerItem key={p.title} className="rounded-ui border border-black/5 bg-white p-5">
                <div className="text-sm font-bold text-heading">{p.title}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-gray-muted">{p.desc}</div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
