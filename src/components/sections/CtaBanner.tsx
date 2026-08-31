"use client";

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { FadeUp } from "@/components/ui/Reveal";

export function CtaBanner() {
  const t = useTranslations("cta");

  return (
    <section className="relative overflow-hidden bg-white section-y">
      <div className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative container-narrow text-center">
        <SplitReveal as="h2" type="words" className="t-h2-feature text-heading">
          {t("title")}{" "}
          <span className="underline decoration-primary/40 underline-offset-8">{t("highlight")}</span>{" "}
          {t("titleEnd")}
        </SplitReveal>
        <FadeUp delay={0.2} y={16}>
          <p className="mx-auto mt-5 max-w-lg text-base text-gray-muted">{t("description")}</p>
          <div className="mt-9 flex justify-center">
            <MagneticButton href="/contact">{t("button")}</MagneticButton>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
