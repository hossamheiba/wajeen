"use client";

/**
 * Governance — drawn as the thing it actually is: a reporting structure.
 *
 * The board sits at the root and its oversight branches down to the four
 * committees. The connectors are CSS rules scaled on scroll rather than SVG,
 * so they stay locked to the grid columns at every breakpoint. Selecting a
 * committee lights its branch and opens its detail below.
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Pillar {
  title: string;
  desc: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const ICON_BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** One mark per committee, in order. */
const ICONS = [
  // board oversight — gavel / authority
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 21h9M6.5 17.5 12 12M9 6l6 6M13 2.5 21.5 11M11 4.5 8 7.5M18 11.5l-3 3" />
    </svg>
  ),
  // regulatory compliance — document check
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 14l2 2 4-4" />
    </svg>
  ),
  // ethics — balance scale
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M12 4v17M8 21h8M4 8h16M6.5 8 4 14h5L6.5 8ZM17.5 8 15 14h5l-2.5-6Z" />
    </svg>
  ),
  // transparent reporting — chart
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" />
      <circle cx="7" cy="11" r="1.3" />
      <circle cx="12" cy="5" r="1.3" />
      <circle cx="17" cy="8" r="1.3" />
    </svg>
  ),
];

export function Governance() {
  const t = useTranslations("aboutPage.governance");
  const reduce = useReducedMotion();
  const pillars = t.raw("pillars") as Pillar[];
  const len = pillars.length;

  const [active, setActive] = useState(0);

  /** Half a column in from each edge — the bar spans node centre to centre. */
  const edge = `${50 / len}%`;
  const item = pillars[active];

  const grow = (delay: number) => ({
    initial: { scaleY: 0 },
    whileInView: { scaleY: 1 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: reduce ? 0 : 0.5, ease: EASE, delay },
  });

  return (
    <section
      id="governance"
      className="relative overflow-hidden bg-off-white py-24"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {t("tag")}
          </div>
          <SplitReveal
            as="h2"
            type="words"
            className="mt-3 text-3xl font-black leading-[1.15] text-heading lg:text-4xl"
          >
            {t("title")}
          </SplitReveal>
          <p className="mt-5 text-sm leading-relaxed text-gray-muted">
            {t("description")}
          </p>
        </div>

        {/* ================= the structure ================= */}
        <div className="mt-16">
          {/* root */}
          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
              className="relative rounded-2xl border border-black/5 bg-white px-8 py-5 text-center shadow-lg"
            >
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-primary/25" />
              <div className="text-base font-black text-heading">
                {t("boardLabel")}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                {t("boardCaption")}
              </div>
            </motion.div>
          </div>

          {/* ---- desktop connectors ---- */}
          <div className="hidden md:block">
            {/* stem down from the board */}
            <motion.div
              {...grow(0.15)}
              style={{ transformOrigin: "top" }}
              className="mx-auto h-10 w-px bg-black/15"
            />

            {/* bar spanning the committee centres */}
            <div className="relative h-px">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: reduce ? 0 : 0.6,
                  ease: EASE,
                  delay: 0.35,
                }}
                style={{ left: edge, right: edge, transformOrigin: "center" }}
                className="absolute h-px bg-black/15"
              />
            </div>

            {/* drop stems, one per committee */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}
            >
              {pillars.map((p, i) => (
                <div key={p.title} className="flex justify-center">
                  <motion.div
                    {...grow(0.5 + i * 0.08)}
                    style={{ transformOrigin: "top" }}
                    className={`h-10 w-px transition-colors duration-300 ${
                      i === active
                        ? "bg-primary"
                        : "bg-black/15"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* mobile spacer */}
          <div className="h-8 md:hidden" />

          {/* ---- committee nodes ---- */}
          {/* The node columns must match the drop stems above exactly, and the
              count comes from the data — so the md rule is emitted here rather
              than written as a fixed Tailwind class. */}
          <style>{`@media(min-width:768px){.gov-nodes{grid-template-columns:repeat(${len},minmax(0,1fr))}}`}</style>
          <div className="gov-nodes grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
            {pillars.map((p, i) => {
              const isActive = i === active;
              return (
                <motion.button
                  key={p.title}
                  onClick={() => setActive(i)}
                  aria-current={isActive}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: reduce ? 0 : 0.5,
                    ease: EASE,
                    delay: 0.55 + i * 0.08,
                  }}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-start transition-all duration-300 ${
                    isActive
                      ? "-translate-y-1 border-primary/40 bg-white shadow-[0_18px_40px_-16px_rgba(15,21,95,0.35)]"
                      : "border-black/5 bg-white/60 hover:border-black/15 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                        isActive
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {ICONS[i % ICONS.length]("h-5 w-5")}
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums text-gray-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-4 text-sm font-bold leading-snug text-heading">
                    {p.title}
                  </div>

                  <div
                    className={`mt-3 h-0.5 rounded-full transition-all duration-500 ${
                      isActive
                        ? "w-12 bg-primary"
                        : "w-6 bg-black/15"
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* ---- detail ---- */}
          <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {ICONS[active % ICONS.length]("h-6 w-6")}
                </span>
                <div>
                  <div className="text-base font-black text-heading">
                    {item.title}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-muted">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
