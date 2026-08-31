"use client";

/**
 * Sector showcase — one sector at a time.
 *
 * Ported from the Al-Dawaa innovation slider: a counter, sliding copy, a
 * floating image card you can drag, an autoplay progress line, segment dots
 * and arrows. Replaces the three stacked image/text blocks that were here;
 * every field they carried (summary, capabilities, stat) still shows.
 */

import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";
import { Button } from "@/components/ui/Button";

const images: Record<string, typeof infrastructure> = {
  infrastructure,
  energy,
  buildings,
};

const AUTOPLAY_MS = 6000;
const EASE = [0.16, 1, 0.3, 1] as const;

interface Sector {
  key: string;
  title: string;
  summary: string;
  capabilities: string[];
  stat: { value: string; label: string };
}

/**
 * The URL fragment, modelled as what it actually is: state owned by the
 * browser, not by React. useSyncExternalStore is the primitive for exactly
 * that — it hands the server render (and the hydration pass that has to match
 * it) an empty snapshot, then the real value, with no `window` read during
 * render and no mount effect that setState's a second render on top of the
 * first.
 */
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const getHash = () => window.location.hash.slice(1);
const getServerHash = () => "";

function useHash() {
  return useSyncExternalStore(subscribeToHash, getHash, getServerHash);
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${flip ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function Arrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${flip ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SectorDetails() {
  const reduce = useReducedMotion() === true;
  const t = useTranslations("businessPage");
  const tb = useTranslations("business");
  const locale = useLocale();
  const rtl = locale === "ar";

  const sectors = t.raw("sectors") as Sector[];
  // `business` has no top-level `cta` — the label lives on each card.
  const ctaLabel =
    (tb.raw("cards") as { cta?: string }[])?.[0]?.cta ?? tb("title");
  const total = sectors.length;

  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const next = useCallback(() => {
    setDir(1);
    setActive((p) => (p + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setDir(-1);
    setActive((p) => (p - 1 + total) % total);
  }, [total]);

  const select = (i: number) => {
    setDir(i > active ? 1 : -1);
    setActive(i);
    setAutoplay(false);
  };

  useEffect(() => {
    if (!autoplay || total <= 1) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, next, total]);

  // Deep-linked from the footer / header (e.g. /business#energy) — land on the
  // sector the URL names instead of always starting at the first one, and stop
  // the autoplay so the sector the visitor asked for is the one they see.
  //
  // Derived by adjusting state during render, React's documented alternative
  // to an effect for this shape (https://react.dev/learn/you-might-not-need-an-effect):
  // the previous mount effect setState'd synchronously, cascading a second
  // render of the whole section on every visit. `appliedHash` records which
  // fragment has already been honoured, so a visitor who then clicks through
  // the sectors themselves is never yanked back to the deep-linked one.
  const hash = useHash();
  const hashIndex = hash ? sectors.findIndex((s) => s.key === hash) : -1;
  const [appliedHash, setAppliedHash] = useState<string | null>(null);
  if (hashIndex !== -1 && appliedHash !== hash) {
    setAppliedHash(hash);
    setDir(hashIndex > active ? 1 : -1);
    setActive(hashIndex);
    setAutoplay(false);
  }

  const onDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 50;
    setAutoplay(false);
    if (info.offset.x < -threshold) (rtl ? prev : next)();
    else if (info.offset.x > threshold) (rtl ? next : prev)();
  };

  if (total === 0) return null;
  const sector = sectors[active];

  const textVariants = {
    enter: (d: number) => ({ y: d > 0 ? 40 : -40, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (d: number) => ({ y: d < 0 ? 40 : -40, opacity: 0 }),
  };

  const imageVariants = {
    enter: (d: number) => ({ x: d > 0 ? 150 : -150, opacity: 0, scale: 0.9 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d < 0 ? 150 : -150, opacity: 0, scale: 0.95 }),
  };

  return (
    <section id="sectors" className="relative w-full overflow-hidden section-y">
      <style>{`@keyframes sectorProgress{from{width:0%}to{width:100%}}`}</style>

      {/* drifting brand glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-30 transition-all duration-1000"
        animate={{
          background: `radial-gradient(circle at ${rtl ? "25%" : "75%"} 30%, var(--color-primary-glow) 0%, transparent 60%), radial-gradient(circle at 50% 80%, var(--color-grid-dot) 0%, transparent 70%)`,
        }}
      />

      <div className="relative container-page">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ---------------- copy ---------------- */}
          <div className="order-2 flex flex-col justify-center lg:order-1 lg:col-span-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="rounded-ui bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                {tb("tag")}
              </span>
              <div className="h-px w-8 bg-black/10" />
              <span className="font-mono text-sm font-bold tabular-nums text-gray-muted">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </span>
            </div>

            <div className="min-h-[300px] md:min-h-[330px]">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={active}
                  custom={dir}
                  variants={textVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                  className="flex flex-col gap-4"
                >
                  <h2 className="t-h3 text-heading">
                    {sector.title}
                  </h2>
                  <p className="t-body text-gray-muted">
                    {sector.summary}
                  </p>

                  <ul className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sector.capabilities.map((cap) => (
                      <li
                        key={cap}
                        className="flex items-center gap-2.5 text-sm text-black"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {cap}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="inline-flex items-baseline gap-3 rounded-ui bg-off-white px-6 py-4">
                      <span className="text-2xl font-extrabold text-primary">
                        {sector.stat.value}
                      </span>
                      <span className="text-xs text-gray-muted">
                        {sector.stat.label}
                      </span>
                    </div>

                    <Button href="/projects" className="group active:scale-95">
                      <span>{ctaLabel}</span>
                      <motion.span
                        animate={reduce ? { x: 0 } : { x: rtl ? [0, -4, 0] : [0, 4, 0] }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                        }
                      >
                        <Arrow flip={rtl} />
                      </motion.span>
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ---------------- controls ---------------- */}
            <div className="mt-8 flex flex-col gap-5 border-t border-black/10 pt-6">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  key={active}
                  style={{
                    animation: autoplay
                      ? `sectorProgress ${AUTOPLAY_MS}ms linear forwards`
                      : "none",
                    width: autoplay ? undefined : "0%",
                  }}
                  className="absolute inset-y-0 start-0 rounded-full bg-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {sectors.map((s, i) => {
                    const isActive = i === active;
                    return (
                      <button
                        key={s.key}
                        onClick={() => select(i)}
                        aria-label={s.title}
                        className={`relative h-2 overflow-hidden rounded-full transition-all duration-300 ${
                          isActive
                            ? "w-14 bg-black/10"
                            : "w-2.5 bg-black/15 hover:bg-black/30"
                        }`}
                      >
                        {isActive && (
                          <div
                            key={active}
                            style={{
                              animation: autoplay
                                ? `sectorProgress ${AUTOPLAY_MS}ms linear forwards`
                                : "none",
                              width: autoplay ? undefined : "0%",
                            }}
                            className="absolute inset-y-0 start-0 rounded-full bg-primary"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      prev();
                      setAutoplay(false);
                    }}
                    aria-label={rtl ? "السابق" : "Previous"}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black transition-all hover:border-primary hover:bg-primary hover:text-white active:scale-90"
                  >
                    <Chevron flip={rtl} />
                  </button>
                  <button
                    onClick={() => {
                      next();
                      setAutoplay(false);
                    }}
                    aria-label={rtl ? "التالي" : "Next"}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black transition-all hover:border-primary hover:bg-primary hover:text-white active:scale-90"
                  >
                    <Chevron flip={!rtl} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- image ---------------- */}
          <div className="order-1 flex justify-center lg:order-2 lg:col-span-5">
            <motion.div
              animate={reduce ? { y: 0 } : { y: [0, -10, 0] }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 6, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative aspect-[4/5] w-full max-w-[400px] sm:aspect-square lg:aspect-[4/5]"
            >
              <div className="absolute inset-0 -m-4 rounded-frame bg-gradient-to-tr from-primary/15 to-[var(--color-primary-on-dark)]/20 opacity-50 blur-xl" />

              <div className="relative h-full w-full overflow-hidden rounded-frame border border-black/5 bg-white p-3 shadow-[var(--shadow-lift)]">
                <div className="relative h-full w-full overflow-hidden rounded-ui bg-off-white">
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                      key={active}
                      custom={dir}
                      variants={imageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={onDragEnd}
                      className="relative h-full w-full cursor-grab select-none active:cursor-grabbing"
                    >
                      <Image
                        src={images[sector.key] ?? infrastructure}
                        alt={sector.title}
                        fill
                        // No preload: this card sits below the fold, under the
                        // page's own banner photo (which is the real LCP), and
                        // it is keyed on `active` — so the deprecated
                        // `priority` here was re-declaring a high-priority
                        // fetch on *every* sector change. Lazy is correct: the
                        // first image loads as the section scrolls into view,
                        // and later ones are already in the viewport when the
                        // visitor switches sectors.
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
