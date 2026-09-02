"use client";

/**
 * Saudi Reach — the Kingdom as a lit slab, tilted back, with connection arcs
 * running from the Eastern Province out to the regions Wjeen works in.
 *
 * The depth is faked and that is the point: seven copies of the same
 * silhouette, each nudged down two units and lightened a step, read as an
 * extruded plate under a CSS `rotateX`. No WebGL, no map library, no second
 * copy of the geography — every layer draws the same `SAUDI_REGIONS` paths the
 * flat map draws.
 *
 * Because the whole thing is one SVG under one transform, anything placed in
 * that coordinate space — a node, a pin, a label — tilts with the plate and
 * stays registered for free.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  SAUDI_REGIONS,
  SAUDI_REGION_CENTERS,
  SAUDI_MAP_VIEWBOX,
} from "@/lib/saudiMap";

type Pt = { x: number; y: number };

export interface ReachPin {
  city: string;
  title: string;
  location: string;
  pos: Pt;
  regionId: string;
}

/** The Eastern Province: where the bulk of the delivered work sits. */
const HUB: Pt & { id: string } = { x: 545, y: 351, id: "eastern-province" };

/** The regions the hub reaches, picked for an even spread across the map. */
const SPOKES = ["ryiadh", "mecca", "medina", "tabuk", "asir"] as const;

/** Hub plus spokes get the drawn-in neon outline. */
const GLOW = [HUB.id, ...SPOKES];

/** Stacked silhouette copies standing in for slab thickness. */
const EXTRUDE = 7;

const [, , VIEW_W, VIEW_H] = SAUDI_MAP_VIEWBOX.split(" ").map(Number);

/** A quadratic arc bowing upward between two points. */
function arcPath(a: Pt, b: Pt) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const lift = Math.min(dist * 0.28, 150);
  return `M ${a.x} ${a.y} Q ${mx} ${my - lift} ${b.x} ${b.y}`;
}

export function SaudiReach({
  pins,
  activeIdx,
  highlightedRegion,
  onSelect,
  onHoverRegion,
}: {
  pins: ReachPin[];
  /** Driven by the scroll track, so the lit region follows the reader. */
  activeIdx: number;
  highlightedRegion: string | null;
  onSelect: (index: number) => void;
  onHoverRegion: (regionId: string | null) => void;
}) {
  const reduce = useReducedMotion() === true;

  const byId = new Map(SAUDI_REGIONS.map((r) => [r.id, r]));
  const glowPaths = GLOW.map((id) => byId.get(id)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r),
  );

  const nodes = SPOKES.map((id) => ({
    id,
    ...(SAUDI_REGION_CENTERS[id] as Pt),
  }));
  const arcs = nodes.map((n) => ({ ...n, d: arcPath(HUB, n) }));

  /** Held still for anyone who asked for less motion; the plate still tilts. */
  const settle = { rotateX: 46, rotateZ: -12, opacity: 1, y: 0, scale: 1 };

  return (
    <div className="relative w-full [perspective:1100px] [transform-style:preserve-3d]">
      <div className="flex w-full items-center justify-center">
        <motion.div
          className="w-full"
          initial={
            reduce
              ? false
              : { opacity: 0, y: 30, scale: 0.9, rotateX: 60, rotateZ: -12 }
          }
          animate={settle}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }
          }
          style={{ transformStyle: "preserve-3d" }}
        >
          <svg
            viewBox={`-20 -20 ${VIEW_W + 40} ${VIEW_H + 60}`}
            className="block h-auto w-full overflow-visible [filter:drop-shadow(0_32px_48px_rgba(15,21,95,0.28))]"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="wj-reach-face" cx="35%" cy="25%" r="85%">
                <stop offset="0%" stopColor="#2c3596" />
                <stop offset="55%" stopColor="#161d66" />
                <stop offset="100%" stopColor="#080b33" />
              </radialGradient>
              <linearGradient id="wj-reach-glowfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#979ef7" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#3d47b8" stopOpacity="0.05" />
              </linearGradient>
              <filter id="wj-reach-neon" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="wj-reach-softshadow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>

            {/* ground shadow */}
            <g
              transform="translate(6 26)"
              fill="#000"
              opacity="0.45"
              filter="url(#wj-reach-softshadow)"
            >
              {SAUDI_REGIONS.map((r) => (
                <path key={`sh-${r.id}`} d={r.path} />
              ))}
            </g>

            {/* slab: stacked silhouettes, dark at the bottom to lighter on top */}
            {Array.from({ length: EXTRUDE }).map((_, i) => {
              const depth = EXTRUDE - i;
              return (
                <g
                  key={`ex-${i}`}
                  transform={`translate(0 ${depth * 2})`}
                  fill={`hsl(236, 46%, ${8 + i * 4}%)`}
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
                  fill="url(#wj-reach-face)"
                  // The region holding the active project takes a brighter
                  // edge, so scrolling the track visibly moves the light
                  // across the Kingdom rather than only swapping a card.
                  stroke={r.id === highlightedRegion ? "#979ef7" : "#3d47b8"}
                  strokeWidth={r.id === highlightedRegion ? 1.4 : 0.6}
                  strokeLinejoin="round"
                  className="transition-all duration-500 ease-out"
                />
              ))}
            </g>

            {/* interior tint on the linked regions */}
            {glowPaths.map((r) => (
              <path key={`tint-${r.id}`} d={r.path} fill="url(#wj-reach-glowfill)" />
            ))}

            {/* arcs out of the hub */}
            <g>
              {arcs.map((a, i) => (
                <g key={`arc-${a.id}`}>
                  <motion.path
                    d={a.d}
                    fill="none"
                    stroke="#7d86ef"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 3px #7d86ef)" }}
                    initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.75 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 1.4, delay: 1 + i * 0.35, ease: "easeInOut" }
                    }
                  />
                  {/* travelling packet — SMIL, so it costs no JavaScript */}
                  {reduce ? null : (
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
                  )}
                </g>
              ))}
            </g>

            {/* neon outlines, drawn in then breathing */}
            <g className={reduce ? undefined : "reach-pulse"}>
              {glowPaths.map((r, i) => (
                <motion.path
                  key={`glow-${r.id}`}
                  d={r.path}
                  fill="none"
                  stroke="#979ef7"
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  filter="url(#wj-reach-neon)"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          pathLength: { duration: 2.2, delay: 0.4 + i * 0.5, ease: "easeInOut" },
                          opacity: { duration: 0.5, delay: 0.4 + i * 0.5 },
                        }
                  }
                />
              ))}
            </g>

            {/* regional nodes */}
            {nodes.map((n) => (
              <g key={`node-${n.id}`}>
                <circle cx={n.x} cy={n.y} r="4" fill="#979ef7">
                  {reduce ? null : (
                    <>
                      <animate attributeName="r" values="4;10;4" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
                    </>
                  )}
                </circle>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="2.6"
                  fill="#ffffff"
                  style={{ filter: "drop-shadow(0 0 5px #979ef7)" }}
                />
              </g>
            ))}

            {/* Project pins. Inside this SVG on purpose: they inherit the
                plate's tilt from the one CSS transform above, so they sit on
                the land with no projection maths anywhere. Still real controls
                — role, tabIndex, key handling and a name — because they are
                the only keyboard route into the map. */}
            {pins.map((pin, i) => {
              const isActive = i === activeIdx;
              return (
                <g
                  key={`${pin.city}-${i}`}
                  transform={`translate(${pin.pos.x}, ${pin.pos.y})`}
                  className="cursor-pointer [&:focus-visible>.pin-ring]:opacity-100"
                  role="button"
                  tabIndex={0}
                  aria-label={`${pin.location} — ${pin.title}`}
                  aria-current={isActive ? "true" : undefined}
                  onMouseEnter={() => onHoverRegion(pin.regionId)}
                  onMouseLeave={() => onHoverRegion(null)}
                  onFocus={() => onHoverRegion(pin.regionId)}
                  onBlur={() => onHoverRegion(null)}
                  onClick={() => onSelect(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(i);
                    }
                  }}
                >
                  {/* The global focus outline does not apply inside SVG, so the
                      indicator is drawn as part of the graphic. */}
                  <circle
                    className="pin-ring opacity-0"
                    r="14"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {/* CSS, not SMIL: SMIL ignores prefers-reduced-motion, and
                      branching the markup on it made the server and client
                      render different trees — a hydration mismatch. */}
                  {isActive && (
                    <circle
                      className="pin-pulse"
                      r="10"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.55"
                    />
                  )}
                  <circle
                    r={isActive ? 5.5 : 3.2}
                    fill={isActive ? "#ffffff" : "#979ef7"}
                    style={isActive ? { filter: "drop-shadow(0 0 7px #ffffff)" } : undefined}
                    className="transition-[r] duration-300 ease-out"
                  />
                  {/* generous invisible hit-area for easier hover and tap */}
                  <circle r="14" fill="transparent" />
                </g>
              );
            })}

            {/* the hub */}
            <g>
              <circle cx={HUB.x} cy={HUB.y} r="6" fill="#ffffff">
                {reduce ? null : (
                  <>
                    <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                  </>
                )}
              </circle>
              <circle
                cx={HUB.x}
                cy={HUB.y}
                r="4.5"
                fill="#ffffff"
                stroke="#5761d8"
                strokeWidth="1.5"
                style={{ filter: "drop-shadow(0 0 9px #ffffff)" }}
              />
            </g>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
