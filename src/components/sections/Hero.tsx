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
const PHOTOS: StaticImageData[] = [energy, infrastructure, buildings];

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
      className="relative flex h-screen min-h-[750px] w-full items-center justify-center overflow-hidden bg-[#0F1011]"
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
                priority={i === 0}
                loading={i === 0 ? undefined : "eager"}
                className="object-cover object-center"
              />
            </motion.div>
          );
        })}

        <div
          className="absolute inset-0 z-[2]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 40%, rgba(15,16,17,0.9) 100%)",
          }}
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
          <AnimatePresence initial={false}>
            <motion.div
              key={active}
              className="absolute inset-0 flex flex-col items-center justify-center [backface-visibility:hidden] [transform:translateZ(0)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
            >
              <motion.h1
                className="font-black text-white"
                style={{
                  fontSize: "clamp(54px, 7.5vw, 105px)",
                  lineHeight: 1.05,
                  letterSpacing: "-2px",
                }}
                initial={{ y: reduce ? 0 : 40 }}
                animate={{ y: 0 }}
                transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
              >
                {slide.line1}{" "}
                <span className="inline-block text-[var(--color-primary-on-dark)]">
                  {slide.highlight}
                </span>
              </motion.h1>

              <motion.h2
                className="font-light text-white/85"
                style={{
                  fontSize: "clamp(38px, 5.5vw, 80px)",
                  lineHeight: 1.1,
                }}
                initial={{ y: reduce ? 0 : 40 }}
                animate={{ y: 0 }}
                transition={{
                  duration: reduce ? 0 : 0.9,
                  ease: EASE,
                  delay: reduce ? 0 : 0.1,
                }}
              >
                {slide.line2}
              </motion.h2>
            </motion.div>
          </AnimatePresence>
        </div>

        <p
          className="mx-auto mt-5 max-w-[600px] font-normal leading-[1.6] text-white/75"
          style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
        >
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <MagneticButton
            href="/business"
            className="!px-9 !py-4 !text-sm font-bold uppercase tracking-[1px]"
          >
            {t("ctaPrimary")}
          </MagneticButton>
          <MagneticButton
            href="/projects"
            variant="outline"
            className="!px-9 !py-4 !text-sm font-bold uppercase tracking-[1px] !border-[1.5px] !border-white/40 !shadow-none"
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
