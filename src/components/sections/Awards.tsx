"use client";

/**
 * Awards — Circular Medallion Showcase.
 *
 * Rendered as 100% circular medallion cards with glassmorphic backdrop,
 * glowing accent rings, and spotlight micro-interactions.
 *
 * Seven medallions: the four the company holds, and three left empty on
 * purpose (2026-11-22) for the client to fill in from the dashboard. An empty
 * one is still drawn — a circle with only its medal — because this list, unlike
 * the others, is asked to show blanks; each line inside it is skipped when it
 * has no text, so nothing prints an empty heading.
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

        {/* Circular Medallion Cards. From `md` up the rows are always four
            medallions wide (seven: four, then three, the short row centred),
            at every screen size: the width is a quarter of the row, so a wider
            screen does not let a fifth one in and a narrower one does not push
            the last one down. The row stops growing at four 290px medallions.
            Below `md` it wraps as before — two across on a small tablet, one
            on a phone. */}
        <div className="mx-auto mt-16 flex w-full flex-wrap justify-center gap-8 md:max-w-[1256px] md:[--gap:1rem] lg:[--gap:2rem] md:gap-[var(--gap)]">
          {items.map((award, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.9, y: reduce ? 0 : 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex aspect-square w-full max-w-[280px] flex-col sm:w-[290px] sm:max-w-none md:w-[calc((100%-3*var(--gap))/4)] items-center justify-center rounded-full border border-primary/15 bg-white/90 p-6 text-center md:p-3 lg:p-6 shadow-[var(--shadow-lift)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:scale-105 hover:border-primary hover:shadow-[var(--shadow-glow)]"
            >
              {/* Outer decorative ring */}
              <div className="pointer-events-none absolute inset-2 rounded-full border border-primary/10 transition-colors duration-500 group-hover:border-primary/30" />

              {/* Medal Icon Badge */}
              <span className="relative z-10 flex h-14 w-14 shrink-0 md:h-9 md:w-9 lg:h-14 lg:w-14 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:shadow-[var(--shadow-ring)]">
                <MedalIcon className="h-7 w-7 md:h-[1.1rem] md:w-[1.1rem] lg:h-7 lg:w-7" />
              </span>

              {/* Year */}
              {award.year ? (
                <span className="relative z-10 mt-3 font-mono text-2xl font-black md:mt-1 md:text-base lg:mt-3 lg:text-2xl tabular-nums text-primary/80 group-hover:text-primary transition-colors">
                  {award.year}
                </span>
              ) : null}

              {/* Award Title */}
              {award.title ? (
                <h3 className="t-h5 relative z-10 mt-1.5 line-clamp-2 px-2 text-heading md:px-1 md:text-xs lg:px-2 lg:text-base transition-colors group-hover:text-primary">
                  {award.title}
                </h3>
              ) : null}

              {/* Award Organization */}
              {award.org ? (
                <p className="relative z-10 mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-muted/80 md:text-[9px] lg:text-[11px]">
                  {award.org}
                </p>
              ) : null}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
