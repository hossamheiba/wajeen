"use client";

/**
 * Safety (HSE) — Light Glassmorphic Edition.
 *
 * Removes dark navy background and presents the HSE statistics, pillars,
 * and certifications in a modern, light glassmorphic design system.
 */

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { Counter } from "@/components/ui/Counter";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";
import { chipClasses, StatusPill } from "@/components/ui/Chip";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

interface Pillar {
  title: string;
  desc: string;
}

const ICON_BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS = [
  // training — graduation-ish check
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
      <path d="M7 12v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V12" />
    </svg>
  ),
  // auditing — magnifier over a checklist
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 5h11M4 10h7" />
      <circle cx="15" cy="15" r="4" />
      <path d="m18.5 18.5 2.5 2.5" />
    </svg>
  ),
  // reporting — megaphone
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M3 10v4h3l6 4V6L6 10H3Z" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  ),
];

export function SafetyHSE() {
  const t = useTranslations("hse");
  const stats = t.raw("stats") as StatItem[];
  const pillars = t.raw("pillars") as Pillar[];
  const certifications = t.raw("certifications") as string[];

  return (
    <section id="hse" className="relative overflow-hidden bg-gradient-to-b from-white via-off-white to-white section-y-lg">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 container-page">
        {/* Section Header */}
        <div className="max-w-3xl">
          <StatusPill pulse>{t("tag")}</StatusPill>

          <SplitReveal
            as="h2"
            type="words"
            className="mt-4 text-3xl font-black leading-tight text-heading sm:text-4xl lg:text-5xl"
          >
            {t("title")}
          </SplitReveal>

          <p className="mt-4 max-w-2xl t-body text-gray-muted">
            {t("description")}
          </p>
        </div>

        {/* Ledger of Stats */}
        <StaggerContainer className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StaggerItem
              key={stat.label}
              className="group relative overflow-hidden rounded-ui border border-primary/10 bg-white/90 p-6 backdrop-blur-xl shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="text-4xl font-black leading-none text-heading lg:text-5xl">
                <Counter
                  target={stat.value}
                  suffix={stat.suffix}
                  suffixClassName="text-primary"
                />
              </div>
              <div className="mt-3 text-xs font-bold leading-relaxed text-gray-muted">
                {stat.label}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Pillars Grid */}
        <StaggerContainer className="mt-14 grid grid-cols-1 gap-6 border-t border-black/5 pt-12 sm:grid-cols-3">
          {pillars.map((pillar, i) => (
            <StaggerItem
              key={pillar.title}
              className="card flex items-start gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-ui border border-primary/15 bg-primary/10 text-primary">
                {ICONS[i % ICONS.length]("h-6 w-6")}
              </span>
              <div>
                <h3 className="t-h5 text-heading">{pillar.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-muted">{pillar.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Certifications */}
        <FadeUp delay={0.2} className="mt-12 flex flex-wrap items-center gap-3">
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
        </FadeUp>
      </div>
    </section>
  );
}
