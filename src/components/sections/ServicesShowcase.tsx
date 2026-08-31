"use client";

/**
 * Services showcase — featured sector beside a numbered index.
 *
 * Layout ported from the Al-Dawaa newsroom: a bordered stage holding the
 * active entry, an index whose selection pill slides between rows via a
 * shared layoutId, and the photo. Selecting a row crossfades the copy and
 * the image together. Content is the sector data already used by the
 * Services page, so the two stay in step.
 */

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { FadeUp } from "@/components/ui/Reveal";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const images: Record<string, typeof infrastructure> = {
  infrastructure,
  energy,
  buildings,
};

interface Sector {
  key: string;
  title: string;
  summary: string;
  capabilities: string[];
  stat: { value: string; label: string };
}

function Chevron({ dir = "next" }: { dir?: "next" | "prev" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${dir === "prev" ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ServicesShowcase() {
  const t = useTranslations("business");
  const tp = useTranslations("businessPage");
  const locale = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion();

  const sectors = tp.raw("sectors") as Sector[];
  // `business.cards` carries the CTA label; read it as data rather than via an
  // array-index message key.
  const ctaLabel =
    (t.raw("cards") as { cta?: string }[])?.[0]?.cta ?? tp("tag");
  const total = sectors.length;
  const [active, setActive] = useState(0);

  const step = useCallback(
    (d: number) => setActive((i) => (i + d + total) % total),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, rtl]);

  const sector = sectors[active];

  return (
    <section id="services" className="bg-off-white section-y">
      <div className="container-page">
        <div className="mb-10">
          <SectionHeading eyebrow={t("tag")} title={t("title")} />
          <p className="mt-4 max-w-xl t-small text-gray-muted">
            {t("description")}
          </p>
        </div>

        {/* stage */}
        <FadeUp delay={0.15} className="relative min-h-[480px] overflow-hidden rounded-frame border border-black/5 bg-white p-6 shadow-[var(--shadow-card)] sm:p-9 lg:p-12">
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />

          <div className="relative z-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
            {/* ---------- active sector ---------- */}
            <div className="flex min-h-[300px] flex-col justify-between text-start lg:col-span-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -10 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex h-full flex-col justify-between"
                >
                  <div>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-primary">
                        {sector.stat.value}
                      </span>
                      <span className="text-xs font-bold text-gray-muted">
                        {sector.stat.label}
                      </span>
                    </div>

                    <h3 className="t-h3 mb-4 text-heading">
                      {sector.title}
                    </h3>

                    <p className="mb-6 t-small text-gray-muted">
                      {sector.summary}
                    </p>

                    <ul className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {sector.capabilities.map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2 text-xs font-medium text-black"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto">
                    <MagneticButton href="/business" className="gap-1.5">
                      {ctaLabel}
                      <Chevron dir={rtl ? "prev" : "next"} />
                    </MagneticButton>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ---------- index ---------- */}
            <div className="flex max-h-[350px] flex-col justify-between border-t border-black/10 pt-6 lg:col-span-3 lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
              <div className="mb-4 text-start t-eyebrow text-gray-muted">
                {tp("tag")}
              </div>

              <div className="max-h-[260px] flex-1 space-y-2 overflow-y-auto pb-2 pe-1">
                {sectors.map((s, i) => {
                  const isActive = i === active;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActive(i)}
                      className={`group relative flex w-full items-start gap-3 rounded-ui px-4 py-3 text-start text-xs transition-colors ${
                        isActive
                          ? "font-bold text-white"
                          : "text-gray-muted hover:text-black"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="services-index-pill"
                          className="absolute inset-0 z-0 rounded-ui bg-primary"
                          transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 25,
                          }}
                        />
                      )}
                      <span
                        className={`relative z-10 shrink-0 font-black ${
                          isActive ? "text-white" : "text-primary"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="relative z-10 line-clamp-2 leading-snug">
                        {s.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-4">
                <span className="text-xs font-bold tabular-nums text-gray-muted">
                  {active + 1} / {total}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => step(-1)}
                    disabled={total <= 1}
                    aria-label={rtl ? "السابق" : "Previous"}
                    className="rounded-full border border-black/10 bg-white p-2 text-black transition-colors hover:border-primary hover:bg-off-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Chevron dir={rtl ? "next" : "prev"} />
                  </button>
                  <button
                    onClick={() => step(1)}
                    disabled={total <= 1}
                    aria-label={rtl ? "التالي" : "Next"}
                    className="rounded-full border border-black/10 bg-white p-2 text-black transition-colors hover:border-primary hover:bg-off-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Chevron dir={rtl ? "prev" : "next"} />
                  </button>
                </div>
              </div>
            </div>

            {/* ---------- photo ---------- */}
            <div className="relative min-h-[260px] overflow-hidden rounded-frame lg:col-span-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduce ? 1 : 1.04 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[sector.key] ?? infrastructure}
                    alt={sector.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
