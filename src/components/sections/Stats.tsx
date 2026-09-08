"use client";

/**
 * Stats — "our reach" infographic.
 *
 * Ported from the Al-Dawaa RibbonSteps section: medallions strung along a
 * glowing wire, a spark that glides to whichever step is active, and tilting
 * stat cards beneath. The original hardcodes three steps and pins the spark
 * at 0/50/100%; here the wire inset and the spark stop are derived from the
 * item count, so it also holds four.
 *
 * Icons are inline SVG — the source used lucide, which this project doesn't
 * install.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Counter } from "@/components/ui/Counter";
import { SectionHeading } from "@/components/ui/SectionHeading";

const CYCLE_MS = 3800;

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  body: string;
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

/** One mark per stat, in order. */
const ICONS = [
  // people
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
    </svg>
  ),
  // calendar / years
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  // completed project
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="m9 13 2.2 2.2L16 10.5" />
    </svg>
  ),
  // machinery
  (c: string) => (
    <svg {...ICON_BASE} className={c}>
      <circle cx="7" cy="18" r="2.6" />
      <circle cx="17" cy="18" r="2.6" />
      <path d="M4.4 18H3v-4h7V8h4l4 6h2v4h-1.4M10 14h6" />
    </svg>
  ),
];

/* ------------------------------------------------------------- stat card */

function StatCard({
  item,
  isActive,
  onHoverState,
}: {
  item: StatItem;
  isActive: boolean;
  onHoverState: (hovered: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: ny * 8, y: -nx * 8 });
    onHoverState(true);
  };

  const onLeave = () => {
    setTilt({ x: 0, y: 0 });
    onHoverState(false);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={{
        rotateX: isActive && tilt.x === 0 ? 5 : tilt.x,
        rotateY: isActive && tilt.y === 0 ? -3 : tilt.y,
        borderColor: isActive ? "var(--color-primary)" : "var(--color-card-border)",
        boxShadow: isActive
          ? "0 20px 45px -10px var(--color-primary-glow), 0 10px 20px -5px color-mix(in srgb, var(--color-black) 5%, transparent)"
          : "0 8px 20px -8px var(--color-card-border)",
        backgroundColor: isActive
          ? "color-mix(in srgb, var(--color-white) 98%, transparent)"
          : "color-mix(in srgb, var(--color-white) 70%, transparent)",
      }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      // `grow` (flex-grow only, basis untouched) lets the card fill whatever
      // height the stretched grid column has, so every card in the row ends
      // flush regardless of a label wrapping to two lines. Natural height is
      // still the floor — nothing is clamped, nothing is clipped.
      className="relative mt-8 w-full grow overflow-hidden rounded-frame border p-8 backdrop-blur-md"
    >

      <div
        className="relative text-4xl font-black leading-[1.15] tracking-tight text-heading lg:text-5xl"
        style={{ transform: "translateZ(20px)" }}
      >
        <Counter target={item.value} suffix={item.suffix} />
      </div>

      <div
        className="relative mt-2 text-sm font-semibold uppercase tracking-wider text-gray-muted"
        style={{ transform: "translateZ(15px)" }}
      >
        {item.label}
      </div>

      <p
        className="relative mt-3 text-xs leading-relaxed text-gray-muted"
        style={{ transform: "translateZ(10px)" }}
      >
        {item.body}
      </p>

      <div
        className="relative mt-6 h-1 rounded-full transition-all duration-500"
        style={{
          transform: "translateZ(10px)",
          width: isActive ? "80px" : "40px",
          backgroundColor: isActive
            ? "var(--color-primary)"
            : "color-mix(in srgb, var(--color-primary) 25%, transparent)",
        }}
      />
    </motion.div>
  );
}

/* ----------------------------------------------------------------- main */

export function Stats() {
  const t = useTranslations("stats");
  const reduce = useReducedMotion();
  const items = t.raw("items") as StatItem[];
  const len = items.length;

  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || len <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % len), CYCLE_MS);
    return () => clearInterval(id);
  }, [held, len]);

  /** Half a column in from each edge, so the wire spans medallion centres. */
  const edge = `${50 / len}%`;

  const Medallion = ({ i, isActive }: { i: number; isActive: boolean }) => {
    const Icon = ICONS[i % ICONS.length];
    return (
      <div className="relative h-28 w-28">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full opacity-70 blur-[2px]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, var(--color-primary), transparent 65%)",
          }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{
            duration: isActive ? 4.5 : 12,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <div className="absolute inset-[3px] rounded-full bg-white" />
        <motion.div
          className="absolute inset-[3px] grid place-items-center rounded-full bg-gradient-to-b from-primary to-primary-deep shadow-[var(--shadow-medallion)] ring-1 ring-white/10"
          animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.05 : 1 }}
        >
          {Icon(
            isActive
              ? "h-10 w-10 text-[var(--color-primary-on-dark)] transition-colors duration-300"
              : "h-10 w-10 text-white transition-colors duration-300",
          )}
        </motion.div>

      </div>
    );
  };

  return (
    <section id="stats" className="relative overflow-hidden bg-white section-y">
      {/* soft spheres */}
      <div className="pointer-events-none absolute start-10 top-12 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 end-10 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />

      {/* dotted grid, faded at the edges */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-grid-dot) 1.2px, transparent 0)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(80% 60% at 50% 40%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(80% 60% at 50% 40%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative container-page">
        <div className="mb-14 text-center">
          <SectionHeading eyebrow={t("tag")} title={t("title")} />
        </div>

        {/* ---------- desktop: connected steps ---------- */}
        <div className="relative hidden lg:block">
          <div
            className="pointer-events-none absolute top-14 z-0 h-[3.5px] -translate-y-1/2 overflow-hidden rounded-full bg-primary/5"
            style={{ left: edge, right: edge }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />
            <motion.div
              className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
              animate={reduce ? undefined : { left: ["-130px", "100%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
            />
            <motion.span
              className="absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[var(--shadow-ring)]"
              animate={{
                left: len > 1 ? `${(active / (len - 1)) * 100}%` : "50%",
              }}
              transition={{ type: "spring", stiffness: 60, damping: 14 }}
            />
          </div>

          <div
            className="relative z-10 grid gap-8"
            style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}
          >
            {items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  type: "spring",
                  stiffness: 90,
                  damping: 16,
                  delay: i * 0.18,
                }}
                className="group flex h-full flex-col items-center text-center"
              >
                <Medallion i={i} isActive={active === i} />
                <StatCard
                  item={item}
                  isActive={active === i}
                  onHoverState={(hovered) => {
                    if (hovered) {
                      setActive(i);
                      setHeld(true);
                    } else {
                      setHeld(false);
                    }
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ---------- mobile: vertical timeline ---------- */}
        <div className="relative lg:hidden">
          <div className="absolute bottom-6 top-6 start-[27px] w-[3px] rounded-full bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10" />
          <div className="space-y-8">
            {items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  type: "spring",
                  stiffness: 90,
                  damping: 15,
                  delay: i * 0.12,
                }}
                className="relative flex items-center gap-5"
              >
                <div className="relative z-10 grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-gradient-to-b from-primary to-primary-deep shadow-[var(--shadow-medallion-sm)] ring-4 ring-white">
                  {ICONS[i % ICONS.length](
                    active === i
                      ? "h-6 w-6 text-[var(--color-primary-on-dark)] transition-colors duration-300"
                      : "h-6 w-6 text-white transition-colors duration-300",
                  )}
                </div>

                <div className="flex-1 rounded-ui border border-black/5 bg-off-white p-5">
                  <div className="text-3xl font-black text-heading">
                    <Counter target={item.value} suffix={item.suffix} />
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-muted">
                    {item.label}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-muted">
                    {item.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
