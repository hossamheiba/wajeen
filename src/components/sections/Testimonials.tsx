"use client";

/**
 * Testimonials — Executive Quote Stage (Light / Glassmorphic Edition).
 *
 * Removes dark navy background and presents quote spotlights in a clean,
 * modern light backdrop with gold/primary accents and sleek typography.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { StatusPill } from "@/components/ui/Chip";

interface Quote {
  quote: string;
  role: string;
}

const CYCLE_MS = 6000;

export function Testimonials() {
  const t = useTranslations("testimonials");
  const reduce = useReducedMotion();
  const items = t.raw("items") as Quote[];

  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || reduce || items.length <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % items.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [held, reduce, items.length]);

  const current = items[active];

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-gradient-to-b from-white via-off-white to-white section-y-lg"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 container-feature">
        {/* Section Header */}
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

          <p className="mx-auto mt-4 max-w-lg t-body text-gray-muted">
            {t("description")}
          </p>
        </div>

        {/* Quote Spotlight Card */}
        <div className="relative mt-14 rounded-frame border border-primary/10 bg-white/90 p-8 sm:p-14 backdrop-blur-xl shadow-[var(--shadow-card)]">
          {/* Top Primary Line */}
          <div className="absolute inset-x-16 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Quote Mark Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-ui bg-primary/5 text-primary border border-primary/10 shadow-[var(--shadow-card)]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 opacity-80">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          <div className="relative flex min-h-[160px] items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: reduce ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -16 }}
                transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-3xl"
              >
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-relaxed text-heading">
                  “{current.quote}”
                </p>

                <StatusPill dot="positive" className="mt-8">
                  {current.role}
                </StatusPill>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="mt-10 flex items-center justify-center gap-2.5">
            {items.map((item, i) => (
              <button
                key={item.role}
                onClick={() => setActive(i)}
                aria-label={`Quote ${i + 1}`}
                className="group h-2.5 py-1 cursor-pointer"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-500 ease-out ${
                    i === active
                      ? "w-10 bg-primary shadow-[var(--shadow-card)]"
                      : "w-4 bg-primary/20 group-hover:bg-primary/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
