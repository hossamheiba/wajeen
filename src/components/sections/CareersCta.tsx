"use client";

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function CareersCta() {
  const t = useTranslations("careersPage.cta");

  return (
    <section className="relative overflow-hidden bg-off-white section-y-lg">
      <div className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative container-narrow text-center">
        <SplitReveal as="h2" type="words" className="t-h2-feature text-heading">
          {t("title")}
        </SplitReveal>
        <p className="mx-auto mt-5 max-w-lg text-base text-gray-muted">{t("description")}</p>
        <div className="mt-9 flex justify-center">
          <MagneticButton href="mailto:corporate@wjeen.com">{t("button")}</MagneticButton>
        </div>
      </div>
    </section>
  );
}
