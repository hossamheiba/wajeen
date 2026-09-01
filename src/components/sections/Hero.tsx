"use client";

/**
 * Hero — legacy `#hero` type scale, driven by framer-motion.
 *
 * Every layer is permanently absolute and only `opacity` / `transform` are
 * animated, so each frame is composited on the GPU with no layout work. The
 * background crossfades on the same index as the headline, and the outgoing
 * photo holds full opacity until the incoming one has covered it, so the
 * transition never dips through the dark backdrop.
 */

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MagneticButton } from "@/components/ui/MagneticButton";
import energy from "../../../public/images/energy.jpg";
import infrastructure from "../../../public/images/infrastructure.jpg";
import buildings from "../../../public/images/buildings.jpg";

/** One photo per headline, in slide order. */
// The tower leads: it is the most recognisable of the three, and the hero
// preloads whichever sits first.
const PHOTOS: StaticImageData[] = [buildings, energy, infrastructure];

const SLIDE_MS = 5000;
const FADE_S = 1.4;
const EASE = [0.22, 1, 0.36, 1] as const;

interface Slide {
  line1: string;
  highlight: string;
  line2: string;
}

export function Hero() {
  const t = useTranslations("hero");
  const slides = t.raw("slides") as Slide[];
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  const count = Math.min(slides.length, PHOTOS.length);

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(id);
  }, [count]);

  const slide = slides[active];

  return (
    <section
      id="hero"
      data-surface="dark"
      className="relative flex h-[100svh] min-h-[750px] w-full items-center justify-center overflow-hidden bg-hero-backdrop"
    >
      {/* ---------- background crossfade (no zoom) ---------- */}
      <div className="absolute inset-0 z-[1] overflow-hidden">
        {/* Every photo stays mounted so none of them has to load mid-fade.
            The incoming one sits on top and fades in; the others only start
            fading out once it has fully covered them, so the seam never dips
            through to the dark backdrop. */}
        {PHOTOS.slice(0, count).map((photo, i) => {
          const isActive = i === active;
          return (
            <motion.div
              key={i}
              className="absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)]"
              style={{ zIndex: isActive ? 2 : 1 }}
              initial={false}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{
                duration: reduce ? 0 : FADE_S,
                ease: "easeInOut",
                delay: reduce || isActive ? 0 : FADE_S,
              }}
            >
              <Image
                src={photo}
                alt=""
                fill
                sizes="100vw"
                // The first photo is the page's LCP element, so it is the one
                // thing worth preloading from <head>. The other two are not
                // needed until 5s and 10s in — but they cannot simply be made
                // lazy, because every slide is `absolute inset-0` and so all
                // three are inside the viewport from the start; a lazy loader
                // would fetch them all at once regardless. `fetchPriority`
                // is the lever that actually applies: they still start early
                // enough never to pop mid-fade, but they queue *behind* the
                // LCP image instead of competing with it for bandwidth, which
                // is what `loading="eager"` on all three used to cause.
                {...(i === 0
                  ? { preload: true }
                  : { loading: "lazy" as const, fetchPriority: "low" as const })}
                className="object-cover object-center"
              />
            </motion.div>
          );
        })}

        {/* Photographic scrim — see --gradient-hero-scrim in globals.css. */}
        <div
          className="absolute inset-0 z-[2]"
          style={{ background: "var(--gradient-hero-scrim)" }}
        />
      </div>

      {/* ---------- content ---------- */}
      <div className="relative z-[3] mx-auto w-full max-w-[950px] px-6 text-center text-white">
        {/* Fixed height: the headline layers are absolute, so nothing reflows. */}
        <div className="relative flex min-h-[220px] items-center justify-center">
          {/* Default (not popLayout) mode: the layers are already absolute, so
              outgoing and incoming simply coexist and crossfade — no layout
              measurement, no pop. Opacity lives on the wrapper only; the lines
              carry just the staggered drift, so the two never multiply. */}
          {/* `initial={false}` is what keeps the first paint fast: without it
              framer-motion writes `opacity: 0` into the server-rendered markup
              and the headline cannot appear until React has hydrated. Slide
              changes after that still crossfade through `animate`/`exit`. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="absolute inset-0 flex flex-col items-center justify-center [backface-visibility:hidden] [transform:translateZ(0)]"
              initial={{ opacity: 0, y: reduce ? 0 : 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -25 }}
              transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
            >
              {/* One line, not two. The closing phrase keeps its lighter
                  weight so the emphasis still reads, but it sits inline — so
                  the size has to be driven by the *whole* sentence rather than
                  by the first two words, and `nowrap` holds it together. */}
              <h1
                className="hero-rise whitespace-nowrap font-black text-white"
                style={{
                  fontSize: "clamp(17px, 5.6vw, 58px)",
                  lineHeight: 1.1,
                  letterSpacing: "-1px",
                }}
              >
                {slide.line1}{" "}
                <span className="text-[var(--color-primary-on-dark)]">
                  {slide.highlight}
                </span>{" "}
                <span className="font-light text-white/85">{slide.line2}</span>
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>

        <p
          className="hero-rise mx-auto mt-5 max-w-[600px] font-normal leading-[1.6] text-white/75"
          style={
            {
              fontSize: "clamp(14px, 1.9vw, 19px)",
              "--rise-delay": "240ms",
            } as React.CSSProperties
          }
        >
          {t("subtitle")}
        </p>

        <div
          className="hero-rise mt-10 flex flex-wrap items-center justify-center gap-5"
          style={{ "--rise-delay": "360ms" } as React.CSSProperties}
        >
          <MagneticButton
            href="/business"
            className="font-bold uppercase tracking-[1px]"
          >
            {t("ctaPrimary")}
          </MagneticButton>
          <MagneticButton
            href="/projects"
            variant="outline"
            className="font-bold uppercase tracking-[1px]"
          >
            {t("ctaSecondary")}
          </MagneticButton>
        </div>

        {/* slide indicators */}
        <div className="mt-12 flex items-center justify-center gap-2.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className="group h-2.5 py-1"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-500 ease-out ${
                  i === active
                    ? "w-10 bg-[var(--color-primary-on-dark)]"
                    : "w-4 bg-white/30 group-hover:bg-white/60"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
