"use client";

/**
 * Values — a vertical zig-zag infographic, ported from the KIFEi site's
 * "أهداف الملتقى" (forum objectives) treatment: a quick-nav pill ribbon, a
 * center track with a scroll-driven fill line, and alternating cards pinned
 * to numbered badges on that line. Recolored to Wjeen's navy identity and
 * redrawn with this codebase's own line-icon language instead of emoji.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface ValueItem {
  title: string;
  desc: string;
}

const ICON_BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** One mark per value, in order. */
const ICONS = [
  // safety — shield check
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M12 2.5 4 6v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V6l-8-3.5Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </svg>
  ),
  // excellence — star
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7L12 3.5Z" />
    </svg>
  ),
  // integrity — compass
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-6 2 2-6 6-2Z" />
    </svg>
  ),
  // partnership — two linked circles
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <circle cx="8.5" cy="8.5" r="4" />
      <circle cx="15.5" cy="15.5" r="4" />
      <path d="m11.3 11.3 1.4 1.4" />
    </svg>
  ),
  // accountability — target
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  ),
  // innovation — lightbulb
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  ),
];

/** Cycled per item — the source infographic loops four icon-box animations. */
const ANIMS = ["value-float", "value-pulse", "value-spin", "value-glow"];

export function Values() {
  const t = useTranslations("aboutPage.values");
  const reduce = useReducedMotion();
  const items = t.raw("items") as ValueItem[];

  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Fill-line progress: how far the track has scrolled past the viewport's
  // center, clamped to [0, 100]. Mirrors the source infographic's meter.
  useEffect(() => {
    const onScroll = () => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = (window.innerHeight / 2 - rect.top) / rect.height;
      setFill(Math.min(Math.max(progress, 0), 1) * 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jumpTo = (i: number) => {
    setActive(i);
    document.getElementById(`value-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section id="values" className="bg-white section-y">
      <style>{`
        @keyframes valueFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes valuePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
        @keyframes valueSpin  { to { transform: rotate(360deg); } }
        @keyframes valueGlow  { 0%, 100% { box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 18%, transparent); } 50% { box-shadow: 0 0 22px color-mix(in srgb, var(--color-primary) 45%, transparent); } }
        .value-float { animation: valueFloat 2.6s ease-in-out infinite; }
        .value-pulse { animation: valuePulse 2.1s ease-in-out infinite; }
        .value-spin  { animation: valueSpin 8s linear infinite; }
        .value-glow  { animation: valueGlow 2.1s ease-in-out infinite; }
      `}</style>

      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            eyebrow={t("tag")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        {/* quick-nav ribbon */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {items.map((item, i) => (
            <button
              key={item.title}
              onClick={() => jumpTo(i)}
              className={`flex shrink-0 items-center gap-2 rounded-ui border px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                active === i
                  ? "border-transparent bg-primary text-white shadow-[var(--shadow-lift)]"
                  : "border-black/10 bg-white text-gray-muted hover:-translate-y-0.5 hover:border-primary/40 hover:text-heading"
              }`}
            >
              <span className={active === i ? "text-white" : "text-primary"}>
                {ICONS[i % ICONS.length]("h-4 w-4")}
              </span>
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>

        {/* zig-zag timeline */}
        <div ref={trackRef} className="relative mx-auto mt-16 max-w-4xl">
          <div className="absolute inset-y-0 start-4 w-1 rounded-full bg-black/10 lg:start-1/2 lg:-translate-x-1/2 rtl:lg:translate-x-1/2" />
          <div
            className="absolute top-0 start-4 w-1 rounded-full bg-primary shadow-[var(--shadow-rail)] transition-[height] duration-200 ease-out lg:start-1/2 lg:-translate-x-1/2 rtl:lg:translate-x-1/2"
            style={{ height: `${fill}%` }}
          />

          <div className="flex flex-col gap-10">
            {items.map((item, i) => {
              const isRight = i % 2 === 1;
              const isActive = active === i;
              return (
                <div
                  key={item.title}
                  id={`value-${i}`}
                  onMouseEnter={() => setActive(i)}
                  className={`relative flex w-full ps-16 lg:ps-0 ${
                    isRight
                      ? "justify-start lg:justify-start lg:ps-[52%]"
                      : "justify-start lg:justify-end lg:pe-[52%]"
                  }`}
                >
                  {/* badge on the line */}
                  <span
                    className={`absolute start-4 top-6 z-10 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-ui border-4 border-white font-mono text-xs font-black tabular-nums shadow-[var(--shadow-lift)] transition-all duration-300 rtl:translate-x-1/2 lg:start-1/2 ${
                      isActive ? "scale-110 bg-primary text-white" : "bg-white text-primary"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <motion.div
                    initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="card group w-full max-w-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-float)]"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-ui bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white ${
                          reduce ? "" : ANIMS[i % ANIMS.length]
                        }`}
                      >
                        {ICONS[i % ICONS.length]("h-5 w-5")}
                      </span>
                      <h3 className="t-h5 text-heading">{item.title}</h3>
                    </div>
                    <p className="mt-3 t-small text-gray-muted">{item.desc}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
