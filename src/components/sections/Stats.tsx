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
  num,
  isActive,
  onHoverState,
}: {
  item: StatItem;
  num: string;
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
        borderColor: isActive ? "var(--color-primary)" : "rgba(17,24,39,0.08)",
        boxShadow: isActive
          ? "0 20px 45px -10px var(--color-primary-glow), 0 10px 20px -5px rgba(17,24,39,0.05)"
          : "0 8px 20px -8px rgba(17,24,39,0.08)",
        backgroundColor: isActive
          ? "rgba(255,255,255,0.98)"
          : "rgba(255,255,255,0.70)",
      }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className="relative mt-8 w-full overflow-hidden rounded-[2rem] border p-8 backdrop-blur-md"
    >
      <span
        className="pointer-events-none absolute end-5 top-4 select-none text-5xl font-black leading-none text-black/[0.04]"
        style={{ transform: "translateZ(10px)" }}
      >
        {num}
      </span>

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
            : "rgba(15,21,95,0.25)",
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
          className="absolute inset-[3px] grid place-items-center rounded-full bg-gradient-to-b from-primary to-[#070a2e] shadow-[0_18px_40px_-14px_rgba(15,21,95,0.7)] ring-1 ring-white/10"
          animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.05 : 1 }}
        >
          {Icon(
            isActive
              ? "h-10 w-10 text-white"
              : "h-10 w-10 text-[var(--color-primary-on-dark)]",
          )}
        </motion.div>

        <motion.span
          className="absolute -end-1 -top-1 z-20 grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-black text-white ring-4 ring-white"
          animate={{ scale: isActive ? 1.15 : 1 }}
          style={{
            boxShadow: isActive
              ? "0 0 15px var(--color-primary-glow)"
              : "0 6px 16px -4px rgba(15,21,95,0.5)",
          }}
        >
          {String(i + 1).padStart(2, "0")}
        </motion.span>
      </div>
    );
  };

  return (
    <section id="stats" className="relative overflow-hidden bg-white py-28">
      {/* soft spheres */}
      <div className="pointer-events-none absolute left-10 top-12 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 right-10 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />

      {/* dotted grid, faded at the edges */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,21,95,0.10) 1.2px, transparent 0)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(80% 60% at 50% 40%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(80% 60% at 50% 40%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("tag")}
          </span>
          <h2 className="mt-5 text-3xl font-black leading-[1.15] text-heading sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
          <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>

        {/* ---------- desktop: connected steps ---------- */}
        <div className="relative hidden md:block">
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
              className="absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_6px_var(--color-primary-glow)]"
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
                className="group flex flex-col items-center text-center"
              >
                <Medallion i={i} isActive={active === i} />
                <StatCard
                  item={item}
                  num={String(i + 1).padStart(2, "0")}
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
        <div className="relative md:hidden">
          <div className="absolute bottom-6 top-6 w-[3px] rounded-full bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10 ltr:left-[27px] rtl:right-[27px]" />
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
                <div className="relative z-10 grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-gradient-to-b from-primary to-[#070a2e] shadow-[0_10px_26px_-10px_rgba(15,21,95,0.7)] ring-4 ring-white">
                  {ICONS[i % ICONS.length](
                    "h-6 w-6 text-[var(--color-primary-on-dark)]",
                  )}
                  <span className="absolute -end-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] font-black text-white ring-2 ring-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex-1 rounded-2xl border border-black/5 bg-off-white p-5">
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
