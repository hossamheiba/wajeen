"use client";

/**
 * Quality Policy — the ISO 9001 system this page's own Story milestones
 * already mention (certified 2018) gets a section, not just a date on a
 * timeline: what the certification actually commits the company to.
 *
 * Shape: a horizontal chain of numbered checkpoints threaded on one line —
 * the same "connected stages" motif businessPage's DeliveryProcess uses,
 * borrowed on purpose because a quality system genuinely is a pipeline of
 * gates, not a list of unordered values or an icon grid.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { chipClasses } from "@/components/ui/Chip";

interface Pillar {
  title: string;
  desc: string;
}

export function QualityPolicy() {
  const t = useTranslations("aboutPage.quality");
  const reduce = useReducedMotion();
  const pillars = t.raw("pillars") as Pillar[];
  const certifications = t.raw("certifications") as string[];

  return (
    <section id="quality" className="relative overflow-hidden bg-off-white section-y">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary-glow),transparent_70%)] opacity-[0.06]" />

      <div className="relative container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            eyebrow={t("tag")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div className="relative mx-auto mt-16 flex max-w-5xl flex-col items-stretch justify-between gap-6 px-4 lg:flex-row lg:gap-4">
          {/* the thread running behind the checkpoints */}
          <div className="absolute inset-x-4 top-1/2 z-0 hidden h-[2px] -translate-y-1/2 bg-gradient-to-r from-primary/5 via-primary/35 to-primary/5 lg:block" />

          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: reduce ? 0 : 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.1 * (i + 1) }}
              className="card group relative z-10 flex-1 text-start transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-ui border-2 border-primary/20 font-mono text-sm font-black tabular-nums text-primary transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="t-h5 mb-2 text-heading">{pillar.title}</h3>
              <p className="text-xs leading-relaxed text-gray-muted">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.4 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="t-eyebrow text-gray-muted">
            {t("certificationsLabel")}
          </span>
          {certifications.map((c) => (
            <span
              key={c}
              className={chipClasses({ tone: "outline", elevated: true })}
            >
              {c}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
