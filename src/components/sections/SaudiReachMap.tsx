"use client";

/**
 * Saudi Reach — a 3D isometric neon-outline map of the Kingdom with animated
 * connection arcs radiating from the Al-Khobar hub.
 *
 * Ported from the DMSCO world-map treatment and re-aimed at Saudi Arabia:
 * the 13 administrative regions form the top face, a stack of duplicated
 * silhouettes fakes the slab depth, and quadratic arcs carry travelling
 * packets out to each regional node. Pure SVG — no WebGL, no map library.
 *
 * The `Presence` map elsewhere on the page is a separate component and is
 * untouched by this one.
 */

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  SAUDI_REGIONS,
  SAUDI_REGION_CENTERS,
} from "@/lib/saudiMap";

type Pt = { x: number; y: number };

/** Al-Khobar, on the Gulf coast — verified to fall inside the
 *  eastern-province polygon of SAUDI_REGIONS. */
const HUB: Pt & { id: string } = { x: 524, y: 224, id: "eastern-province" };

/** Regions the hub reaches out to, chosen for an even spread. */
const SPOKES = ["ryiadh", "mecca", "medina", "tabuk", "asir"] as const;

/** Regions that get a glowing outline: the hub plus everything it links. */
const GLOW = [HUB.id, ...SPOKES];

const EXTRUDE = 7; // stacked silhouette copies = slab thickness
const VIEW = { w: 730, h: 600 };

/** Quadratic arc bowing upward between two points. */
function arcPath(a: Pt, b: Pt) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const lift = Math.min(dist * 0.28, 150);
  return `M ${a.x} ${a.y} Q ${mx} ${my - lift} ${b.x} ${b.y}`;
}

export function SaudiReachMap() {
  const t = useTranslations("saudiReach");
  const locale = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion();

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = sectionRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: ny * 10, y: -nx * 10 });
  };

  const byId = new Map(SAUDI_REGIONS.map((r) => [r.id, r]));
  const glowPaths = GLOW.map((id) => byId.get(id)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r),
  );

  const nodes = SPOKES.map((id) => ({
    id,
    ...(SAUDI_REGION_CENTERS[id] as Pt),
  }));
  const arcs = nodes.map((n) => ({ ...n, d: arcPath(HUB, n) }));

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative overflow-hidden bg-primary py-20 text-white lg:py-28"
    >
      {/* faint grid backdrop */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.04]" />

      <div className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-12 px-6 lg:grid-cols-12 lg:px-10">
        {/* ---------------- text ---------------- */}
        <div
          className={`lg:col-span-5 ${rtl ? "lg:order-2" : "lg:order-1"}`}
        >
          <span className="inline-flex items-center rounded-full border border-[var(--color-primary-on-dark)]/25 bg-[var(--color-primary-on-dark)]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-[var(--color-primary-on-dark)]">
            {t("tag")}
          </span>

          <h2 className="mt-6 text-4xl font-black leading-[1.15] text-white sm:text-5xl">
            {t("title")}
          </h2>

          <p className="mt-6 text-sm font-medium leading-relaxed text-white/70 sm:text-base">
            {t("description")}
          </p>

          <div className="mt-8 flex items-center gap-4">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary-on-dark)]" />
            </span>
            <span className="text-sm font-bold text-white">
              {t("hubLabel")}
            </span>
            <span className="text-xs font-semibold text-white/45">
              {t("hubCaption")}
            </span>
          </div>
        </div>

        {/* ---------------- map ---------------- */}
        <div
          className={`relative flex items-center justify-center py-4 lg:col-span-7 ${
            rtl ? "lg:order-1" : "lg:order-2"
          }`}
        >
          <motion.div
            style={{ perspective: 1000, transformStyle: "preserve-3d" }}
            animate={{ rotateX: tilt.x, rotateY: tilt.y }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
            className="flex w-full items-center justify-center"
          >
            <div
              className="relative w-full select-none"
              style={{ perspective: "1500px" }}
            >
              <style>{`.sr-pulse{animation:srPulse 3.4s ease-in-out infinite}@keyframes srPulse{0%,100%{opacity:1}50%{opacity:.7}}`}</style>

              <motion.div
                initial={{ opacity: 0, y: 30, rotateX: 60, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 46, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  transformStyle: "preserve-3d",
                  transform: "rotateX(46deg) rotateZ(-12deg)",
                }}
              >
                {/* idle float */}
                <motion.div
                  animate={reduce ? undefined : { y: [0, -10, 0] }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <svg
                    viewBox={`-20 -20 ${VIEW.w + 40} ${VIEW.h + 60}`}
                    className="h-auto w-full overflow-visible"
                  >
                    <defs>
                      <radialGradient id="sr-face" cx="35%" cy="25%" r="85%">
                        <stop offset="0%" stopColor="#232a86" />
                        <stop offset="55%" stopColor="#141a63" />
                        <stop offset="100%" stopColor="#0a0e3d" />
                      </radialGradient>
                      <linearGradient
                        id="sr-glowfill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#979ef7"
                          stopOpacity="0.3"
                        />
                        <stop
                          offset="100%"
                          stopColor="#4c58f0"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                      <filter
                        id="sr-neon"
                        x="-40%"
                        y="-40%"
                        width="180%"
                        height="180%"
                      >
                        <feGaussianBlur stdDeviation="3.2" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter
                        id="sr-softshadow"
                        x="-30%"
                        y="-30%"
                        width="160%"
                        height="160%"
                      >
                        <feGaussianBlur stdDeviation="7" />
                      </filter>
                    </defs>

                    {/* ground shadow */}
                    <g
                      transform="translate(6 26)"
                      fill="#000"
                      opacity="0.5"
                      filter="url(#sr-softshadow)"
                    >
                      {SAUDI_REGIONS.map((r) => (
                        <path key={`sh-${r.id}`} d={r.path} />
                      ))}
                    </g>

                    {/* slab: stacked silhouettes, dark -> lighter */}
                    {Array.from({ length: EXTRUDE }).map((_, i) => {
                      const depth = EXTRUDE - i;
                      const shade = 10 + i * 4;
                      return (
                        <g
                          key={`ex-${i}`}
                          transform={`translate(0 ${depth * 2})`}
                          fill={`rgb(${shade} ${shade + 8} ${shade + 46})`}
                        >
                          {SAUDI_REGIONS.map((r) => (
                            <path key={`${i}-${r.id}`} d={r.path} />
                          ))}
                        </g>
                      );
                    })}

                    {/* top face — every region with its border */}
                    <g>
                      {SAUDI_REGIONS.map((r) => (
                        <path
                          key={`face-${r.id}`}
                          d={r.path}
                          fill="url(#sr-face)"
                          stroke="#4a55b8"
                          strokeWidth={0.6}
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>

                    {/* interior tint on the linked regions */}
                    {glowPaths.map((r) => (
                      <path
                        key={`tint-${r.id}`}
                        d={r.path}
                        fill="url(#sr-glowfill)"
                      />
                    ))}

                    {/* arcs from the Al-Khobar hub */}
                    <g>
                      {arcs.map((a, i) => (
                        <g key={`arc-${a.id}`}>
                          <motion.path
                            d={a.d}
                            fill="none"
                            stroke="#979ef7"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            style={{
                              filter: "drop-shadow(0 0 3px #979ef7)",
                            }}
                            initial={{ pathLength: 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 0.75 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 1.4,
                              delay: 1 + i * 0.35,
                              ease: "easeInOut",
                            }}
                          />
                          {/* travelling packet */}
                          <circle r="3.2" fill="#ffffff">
                            <animateMotion
                              dur={`${3 + i * 0.4}s`}
                              begin={`${1.4 + i * 0.35}s`}
                              repeatCount="indefinite"
                              path={a.d}
                              keyPoints="0;1"
                              keyTimes="0;1"
                              calcMode="linear"
                            />
                            <animate
                              attributeName="opacity"
                              values="0;1;1;0"
                              dur={`${3 + i * 0.4}s`}
                              begin={`${1.4 + i * 0.35}s`}
                              repeatCount="indefinite"
                            />
                          </circle>
                        </g>
                      ))}
                    </g>

                    {/* neon outlines, drawn in then pulsing */}
                    <g className="sr-pulse">
                      {glowPaths.map((r, i) => (
                        <motion.path
                          key={`glow-${r.id}`}
                          d={r.path}
                          fill="none"
                          stroke="#a9b0ff"
                          strokeWidth={2.4}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          filter="url(#sr-neon)"
                          initial={{ pathLength: 0, opacity: 0 }}
                          whileInView={{ pathLength: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            pathLength: {
                              duration: 2.2,
                              delay: 0.4 + i * 0.5,
                              ease: "easeInOut",
                            },
                            opacity: { duration: 0.5, delay: 0.4 + i * 0.5 },
                          }}
                        />
                      ))}
                    </g>

                    {/* regional nodes */}
                    {nodes.map((n) => (
                      <g key={`node-${n.id}`}>
                        <circle cx={n.x} cy={n.y} r="4" fill="#a9b0ff">
                          <animate
                            attributeName="r"
                            values="4;10;4"
                            dur="2.4s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.7;0;0.7"
                            dur="2.4s"
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r="2.6"
                          fill="#ffffff"
                          style={{ filter: "drop-shadow(0 0 5px #a9b0ff)" }}
                        />
                      </g>
                    ))}

                    {/* the hub — Al-Khobar */}
                    <g>
                      <circle cx={HUB.x} cy={HUB.y} r="6" fill="#ffffff">
                        <animate
                          attributeName="r"
                          values="6;16;6"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0;0.8"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={HUB.x}
                        cy={HUB.y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#979ef7"
                        strokeWidth="1.5"
                        style={{ filter: "drop-shadow(0 0 9px #ffffff)" }}
                      />
                    </g>
                  </svg>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
