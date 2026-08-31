"use client";

/**
 * From the President — executive message with luxury typography, quote badge, and glassmorphic card.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SplitReveal } from "@/components/ui/SplitReveal";

export function FromThePresident() {
  const t = useTranslations("aboutPage.president");
  const reduce = useReducedMotion();

  return (
    <section id="president" className="relative overflow-hidden bg-gradient-to-b from-white via-off-white to-white section-y">
      <div className="container-feature">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-ui border border-primary/10 bg-white/90 p-8 sm:p-12 backdrop-blur-xl shadow-[var(--shadow-card)]"
        >
          {/* Subtle top primary accent line */}
          <div className="absolute inset-x-12 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Tag & Header */}
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="t-eyebrow text-primary">
              {t("tag")}
            </span>
          </div>

          {/* Clean Quote Icon & Text */}
          <div className="relative mt-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-ui bg-primary/5 text-primary border border-primary/10 shadow-[var(--shadow-card)]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 opacity-90">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <SplitReveal as="p" type="words" className="text-xl sm:text-2xl lg:text-3xl font-black leading-relaxed text-heading">
              {t("quote")}
            </SplitReveal>
          </div>

          {/* Body Paragraphs */}
          <div className="mt-8 grid gap-6 border-t border-black/5 pt-8 text-sm sm:t-body text-gray-muted lg:grid-cols-2">
            <p className="bg-primary/5 p-4 rounded-ui border border-primary/5">{t("body1")}</p>
            <p className="bg-primary/5 p-4 rounded-ui border border-primary/5">{t("body2")}</p>
          </div>

          {/* President Signature & Title */}
          <div className="mt-8 flex items-center gap-4 pt-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-ui bg-primary text-white shadow-[var(--shadow-lift)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M4 17.5c3-4.5 5.5-8.5 8-11 1.3-1.3 3.2-1.3 4.2 0 1 1.2.8 2.8-.4 4-2.6 2.4-6.7 4.8-11.3 6.6" />
                <path d="M3.5 20.5 5 17l2.5 2.5-4 1Z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-extrabold text-heading">{t("name")}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                {t("role")}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
