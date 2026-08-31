"use client";

/**
 * Awards — Circular Medallion Showcase.
 *
 * Rendered as 100% circular medallion cards with glassmorphic backdrop,
 * glowing accent rings, and spotlight micro-interactions.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface AwardItem {
  year: string;
  title: string;
  org: string;
}

function MedalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="14" r="6" />
      <path d="m9.5 8.5-3-6M14.5 8.5l3-6M8 14l2.5 2.5L16 11" />
    </svg>
  );
}

export function Awards() {
  const t = useTranslations("awards");
  const reduce = useReducedMotion();
  const items = t.raw("items") as AwardItem[];

  return (
    <section id="awards" className="relative overflow-hidden bg-gradient-to-b from-white via-off-white to-white section-y-lg">
      {/* Background soft ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[550px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("tag")}
            </span>
          </div>

          <SplitReveal
            as="h2"
            type="words"
            className="mt-4 text-3xl font-black leading-tight text-heading sm:text-4xl lg:text-5xl"
          >
            {t("title")}
          </SplitReveal>
          <p className="mt-4 t-body text-gray-muted">{t("description")}</p>
        </div>

        {/* Circular Medallion Cards Grid */}
        <div className="mt-16 grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((award, i) => (
            <motion.div
              key={award.title}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.9, y: reduce ? 0 : 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex aspect-square w-full max-w-[280px] sm:max-w-[290px] flex-col items-center justify-center rounded-full border border-primary/15 bg-white/90 p-6 text-center shadow-[var(--shadow-lift)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:scale-105 hover:border-primary hover:shadow-[var(--shadow-glow)]"
            >
              {/* Outer decorative ring */}
              <div className="pointer-events-none absolute inset-2 rounded-full border border-primary/10 transition-colors duration-500 group-hover:border-primary/30" />

              {/* Medal Icon Badge */}
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:shadow-[var(--shadow-ring)]">
                <MedalIcon className="h-7 w-7" />
              </span>

              {/* Year */}
              <span className="relative z-10 mt-3 font-mono text-2xl font-black tabular-nums text-primary/80 group-hover:text-primary transition-colors">
                {award.year}
              </span>

              {/* Award Title */}
              <h3 className="t-h5 relative z-10 mt-1.5 line-clamp-2 px-2 text-heading transition-colors group-hover:text-primary">
                {award.title}
              </h3>

              {/* Award Organization */}
              <p className="relative z-10 mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-muted/80">
                {award.org}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
