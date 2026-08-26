"use client";

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function CtaBanner() {
  const t = useTranslations("cta");

  return (
    <section className="relative overflow-hidden bg-dark-green py-28">
      <div className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange/20 blur-[100px]" />
      <div className="relative mx-auto max-w-[900px] px-6 text-center">
        <SplitReveal as="h2" type="words" className="text-4xl font-extrabold text-white lg:text-5xl">
          {t("title")} <span className="text-orange">{t("highlight")}</span> {t("titleEnd")}
        </SplitReveal>
        <p className="mx-auto mt-5 max-w-lg text-base text-white/60">{t("description")}</p>
        <div className="mt-9 flex justify-center">
          <MagneticButton href="/contact">{t("button")}</MagneticButton>
        </div>
      </div>
    </section>
  );
}
