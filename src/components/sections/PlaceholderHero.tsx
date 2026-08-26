"use client";

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function PlaceholderHero({ title }: { title: string }) {
  const t = useTranslations("placeholderPage");

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-dark-green px-6 text-center">
      <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
      <SplitReveal as="h1" type="chars" className="mt-4 text-4xl font-extrabold text-white lg:text-6xl" eager>
        {title}
      </SplitReveal>
      <div className="mt-9">
        <MagneticButton href="/">{t("cta")}</MagneticButton>
      </div>
    </section>
  );
}
