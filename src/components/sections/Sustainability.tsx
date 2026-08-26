"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import energy from "../../../public/images/energy.jpg";

interface Pillar {
  title: string;
  desc: string;
}

export function Sustainability() {
  const t = useTranslations("sustainability");
  const pillars = t.raw("pillars") as Pillar[];

  return (
    <section id="sustainability" className="bg-off-white py-24">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-6 lg:grid-cols-2 lg:px-10">
        <div className="relative">
          <div className="relative h-[420px] overflow-hidden rounded-[var(--radius-lg)]">
            <Image src={energy} alt="Sustainability" fill className="object-cover" sizes="(min-width: 1024px) 45vw, 90vw" />
          </div>
          <div className="absolute -bottom-6 start-6 rounded-[var(--radius-md)] bg-white p-5 shadow-2xl">
            <div className="text-2xl font-extrabold text-primary">{t("badgeNumber")}</div>
            <div className="text-xs font-medium text-gray-muted">{t("badgeText")}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-muted">{t("description")}</p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-[var(--radius-md)] border border-black/5 bg-white p-5">
                <div className="text-sm font-bold text-black">{p.title}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-gray-muted">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
