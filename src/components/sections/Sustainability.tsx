"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";
import energy from "../../../public/images/energy.jpg";

interface Pillar {
  title: string;
  desc: string;
}

export function Sustainability() {
  const t = useTranslations("sustainability");
  const pillars = t.raw("pillars") as Pillar[];

  return (
    <section id="sustainability" className="bg-off-white section-y">
      <div className="container-page grid grid-cols-1 gap-14 lg:grid-cols-2">
        <FadeUp className="relative" y={20}>
          <div className="relative h-[420px] overflow-hidden rounded-frame">
            <Image src={energy} alt="Sustainability" fill className="object-cover" sizes="(min-width: 1024px) 45vw, 90vw" />
          </div>
          <div className="absolute -bottom-6 start-6 rounded-ui bg-white p-5 shadow-[var(--shadow-float)]">
            <div className="text-2xl font-extrabold text-primary">{t("badgeNumber")}</div>
            <div className="text-xs font-medium text-gray-muted">{t("badgeText")}</div>
          </div>
        </FadeUp>

        <div>
          <SectionHeading eyebrow={t("tag")} title={t("title")} />
          <p className="mt-4 max-w-md t-small text-gray-muted">{t("description")}</p>

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
