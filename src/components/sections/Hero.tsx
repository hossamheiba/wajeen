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

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ContentImage } from "@/components/ui/ContentImage";
import { headlineRuns } from "@/lib/headline";
import { slotsFor } from "@/lib/mediaSlots";

/** One photo per headline, in slide order — the dashboard owns each one. */
// Order matters beyond taste: the hero preloads whichever photo sits first,
// so this is also the one the LCP measurement waits on.
const PHOTOS = slotsFor("hero");

/**
 * The headline of a slide, whatever shape the record is in.
 *
 * Until 2026-09-26 a slide was three fields — `line1`, `highlight`, `line2` —
 * and the CMS keeps every revision, so a rollback can still hand this section
 * that shape. Reading both means a rollback renders the headline instead of a
 * blank hero, and a slide with neither renders nothing rather than throwing.
 */
function headlineOf(slide: Slide | undefined): string {
  if (!slide || typeof slide !== "object") return "";
  if (typeof slide.headline === "string") return slide.headline;
  const lead = [slide.line1, slide.highlight].filter(Boolean).join(" ");
  const close = slide.line2 ? `*${slide.line2}*` : "";
  return [lead, close].filter(Boolean).join(" ");
}

const SLIDE_MS = 5000;
const FADE_S = 1.4;
/** Set once: the headline's own size and the height its layer reserves are
 *  the same measurement, and they drifted apart the moment the headline went
 *  from two lines to one. */
const HEADLINE_SIZE = "clamp(17px, 5.6vw, 58px)";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Slide {
  /** The whole headline. `*asterisks*` set the closing phrase lighter. */
  headline?: string;
  /** The three-field shape this replaced, still readable — see `headlineOf`. */
  line1?: string;
  highlight?: string;
  line2?: string;
}

export function Hero() {
  const t = useTranslations("hero");
  // `t.raw` answers with the key itself when a namespace is missing — which
  // the studio's preview can genuinely send — so the shape is checked, not
  // assumed.
  const raw = t.raw("slides");
  const slides: Slide[] = Array.isArray(raw) ? (raw as Slide[]) : [];
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
        {PHOTOS.slice(0, count).map((slot, i) => {
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
              <ContentImage
                namespace={slot.namespace}
                path={slot.path}
                fallbackSrc={slot.bundled}
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
        {/* The headline layers are absolutely positioned so the outgoing and
            incoming slides can crossfade without reflow, which means this
            wrapper has to carry the height itself. It was a flat 220px, set
            when the headline ran to two lines — on one line that left ~80-98px
            of dead space above and below it. Tracking the type size keeps the
            reservation honest at every breakpoint. */}
        <div
          className="relative flex items-center justify-center"
          style={{ minHeight: `calc(${HEADLINE_SIZE} * 1.5)` }}
        >
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
                  fontSize: HEADLINE_SIZE,
                  lineHeight: 1.1,
                  letterSpacing: "-1px",
                }}
              >
                {/* The headline is one field. What the editor wraps in
                    asterisks is set in the lighter weight — the same two
                    weights this line has always had, now written as one
                    sentence instead of three words in three boxes.
                    White, not the periwinkle accent: over a photograph the
                    accent read as washed-out, most visibly on the Aramco
                    slide, where the client's name is the point. */}
                {headlineRuns(headlineOf(slide)).map((run, index) =>
                  run.marked ? (
                    <span key={index} className="font-light text-white/85">
                      {run.text}
                    </span>
                  ) : (
                    <span key={index} className="text-white">
                      {run.text}
                    </span>
                  ),
                )}
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
            href="/#projects"
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
                    ? "w-10 bg-white"
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
