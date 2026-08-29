"use client";

/**
 * Leadership — an editorial masthead, not a slider.
 *
 * No photography exists for these executives yet (see the note below), so
 * the design leans into that rather than faking portraits: each row is pure
 * typography — a huge name, a small-caps role, and a giant ghost initial
 * tucked into the row's own edge. Everything is visible at once and needs no
 * navigation; hovering a row is the only interaction, in the spirit of a
 * printed masthead rather than a UI carousel.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Member {
  name: string;
  role: string;
}

function initial(name: string) {
  return name.trim()[0] ?? "";
}

export function Leadership() {
  const t = useTranslations("aboutPage.leadership");
  const reduce = useReducedMotion();

  const members = t.raw("members") as Member[];

  return (
    <section id="leadership" className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("tag")}
          </div>
          <SplitReveal
            as="h2"
            type="words"
            className="mt-2 text-3xl font-extrabold leading-[1.15] text-heading lg:text-4xl"
          >
            {t("title")}
          </SplitReveal>
          <p className="mt-4 text-sm leading-relaxed text-gray-muted">
            {t("description")}
          </p>
        </div>

        {/* ---------------- masthead ---------------- */}
        <div className="mt-14 divide-y divide-black/5 overflow-hidden rounded-[var(--radius-lg)] border border-black/5 bg-white">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: reduce ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.5, delay: i * 0.07 }}
              className="group relative flex items-center gap-5 overflow-hidden px-6 py-8 transition-colors duration-300 hover:bg-off-white sm:gap-8 sm:px-10 sm:py-10"
            >
              <span className="hidden w-8 shrink-0 font-mono text-xs font-bold tabular-nums text-gray-muted sm:block">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative min-w-0 flex-1">
                <h3 className="text-2xl font-black leading-[1.15] text-heading transition-colors duration-300 group-hover:text-primary sm:text-3xl md:text-4xl">
                  {m.name}
                </h3>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-muted sm:text-sm">
                  {m.role}
                </div>
                <span className="mt-4 block h-0.5 w-12 bg-primary/25 transition-all duration-500 ltr:origin-left rtl:origin-right group-hover:w-24 group-hover:bg-primary" />
              </div>

              {/* ghost initial, tucked into the row's trailing edge */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 select-none text-[6rem] font-black leading-none text-primary/[0.05] transition-all duration-500 ease-out group-hover:text-primary/[0.1] sm:text-[8rem] ltr:-right-2 ltr:group-hover:-translate-x-2 rtl:-left-2 rtl:group-hover:translate-x-2"
              >
                {initial(m.name)}
              </span>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-xs italic text-gray-muted">{t("note")}</p>
      </div>
    </section>
  );
}
