"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section data-surface="dark" className="flex min-h-[80vh] flex-col items-center justify-center bg-primary px-6 pt-24 text-center">
      <div className="t-eyebrow tracking-[0.3em] text-white/40">
        {t("tag")}
      </div>
      <SplitReveal
        as="h1"
        type="words"
        className="t-h2 mt-4 max-w-xl text-white"
        eager
      >
        {t("title")}
      </SplitReveal>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">{t("description")}</p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <MagneticButton href="/">{t("homeCta")}</MagneticButton>
        <MagneticButton href="/contact" variant="outline">
          {t("contactCta")}
        </MagneticButton>
      </div>
      <Link
        href="/"
        aria-label="Wjeen International Co., Ltd."
        className="mt-16 opacity-40 transition-opacity hover:opacity-70"
      >
        <span className="t-eyebrow text-white">
          Wjeen International
        </span>
      </Link>
    </section>
  );
}
