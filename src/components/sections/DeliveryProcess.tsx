"use client";

/**
 * Delivery process — the four EPC stages as one connected chain.
 *
 * Layout ported from the Al-Dawaa "Operational Integration Cycle": a centred
 * heading over a horizontal run of cards with a gradient line threaded behind
 * them, each card revealing on scroll 0.1s after the last, its icon tile
 * scaling and tipping on hover. Icons are inline SVG — the original leaned on
 * the Material Symbols webfont, which this project doesn't load.
 */

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Step {
  title: string;
  desc: string;
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-6 w-6",
  "aria-hidden": true,
};

/** One mark per stage, in order. */
const ICONS = [
  // Engineering — drafting compass
  <svg key="eng" {...ICON_PROPS}>
    <circle cx="12" cy="4" r="1.6" />
    <path d="M12 5.6 6 20M12 5.6 18 20M8.4 14h7.2" />
  </svg>,
  // Procurement — delivery crate
  <svg key="proc" {...ICON_PROPS}>
    <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z" />
    <path d="m3 8.5 9 4.5 9-4.5M12 13v7" />
  </svg>,
  // Construction — crane
  <svg key="cons" {...ICON_PROPS}>
    <path d="M4 20h16M6 20V6h13M6 6 3 9M19 6v4M19 10h-4M15 10v3" />
  </svg>,
  // Handover — verified key
  <svg key="hand" {...ICON_PROPS}>
    <path d="M12 2.5 4 6v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V6l-8-3.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>,
];

export function DeliveryProcess() {
  const t = useTranslations("businessPage.process");
  const steps = t.raw("steps") as Step[];

  return (
    <section className="relative z-10 overflow-hidden border-y border-black/5 bg-off-white py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary-glow),transparent_70%)] opacity-[0.06]" />

      <div className="relative mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-primary">
            {t("tag")}
          </span>
          <SplitReveal
            as="h2"
            type="words"
            className="text-3xl font-black text-heading sm:text-4xl"
          >
            {t("title")}
          </SplitReveal>
          <div className="mt-4 h-1 w-12 rounded-full bg-primary" />
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-stretch justify-between gap-8 px-4 lg:flex-row lg:items-center lg:gap-4">
          {/* the thread running behind the cards */}
          <div className="absolute inset-x-4 top-1/2 z-0 hidden h-[2px] -translate-y-1/2 bg-gradient-to-r from-primary/5 via-primary/35 to-primary/5 lg:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
              className="group relative z-10 flex-1 cursor-default rounded-2xl border border-black/5 bg-white p-6 text-start shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner transition-all duration-300 group-hover:rotate-6 group-hover:scale-110">
                {ICONS[i % ICONS.length]}
              </div>
              <h3 className="mb-2 text-base font-black text-heading">
                {i + 1}. {step.title}
              </h3>
              <p className="text-xs font-medium leading-relaxed text-gray-muted">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
