"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { Counter } from "@/components/ui/Counter";
import {
  SAUDI_MAP_VIEWBOX,
  SAUDI_REGIONS,
  SAUDI_CITY_PINS,
  CITY_REGION,
} from "@/lib/saudiMap";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const VIEW_W = 730;
const VIEW_H = 600;

/** Cursor-magnetism tuning for the pins — see the mousemove handler below. */
const MAGNET_RADIUS = 90; // svg user-units a pin must be within to react
const MAGNET_STRENGTH = 0.35;

const categoryImages: Record<string, typeof infrastructure> = {
  infrastructure,
  energy,
  buildings,
};

/** "13" -> {target: 13, suffix: ""}, "50+" -> {target: 50, suffix: "+"} */
function parseMetric(value: string): { target: number; suffix: string } {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return { target: 0, suffix: value };
  return { target: Number(match[1]), suffix: match[2] };
}

const METRIC_ICONS = [
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={c} aria-hidden>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.6" />
    </svg>
  ),
  (c: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={c} aria-hidden>
      <path d="M4 21V9l6-4v16M14 21V13l6-3v11" />
      <path d="M4 21h16M8 9h.01M8 13h.01M8 17h.01" />
    </svg>
  ),
];

interface ProjectItem {
  city: string;
  category: "infrastructure" | "energy" | "buildings";
  title: string;
  location: string;
  value: string;
  year: string;
}

export function Presence() {
  const t = useTranslations("presence");
  const tProjects = useTranslations("projectsPage");
  const metrics = t.raw("metrics") as { value: string; label: string }[];
  const items = tProjects.raw("items") as ProjectItem[];

  const pins = items
    .filter((item) => SAUDI_CITY_PINS[item.city])
    .map((item) => ({
      ...item,
      pos: SAUDI_CITY_PINS[item.city],
      regionId: CITY_REGION[item.city],
    }));

  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const trackRefs = useRef<Array<HTMLDivElement | null>>([]);

  // ---- cursor-driven map: spotlight + magnetic pins + a radar ping ----
  // A quiet 2D "living map" effect — the torch sweeps with the pointer, pins
  // lean toward it, and a ping keeps pulsing from wherever the cursor last
  // sat. Deliberately not another 3D tilt (that language is already used for
  // the Hero/Governance/SaudiReachMap elsewhere) — this map stays flat and
  // reacts through light and gentle motion instead.
  const svgRef = useRef<SVGSVGElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pingRef = useRef<SVGCircleElement>(null);
  const pinGroupRefs = useRef<Array<SVGGElement | null>>([]);
  const pinSetters = useRef<
    Array<{
      x: (v: number) => void;
      y: (v: number) => void;
      scale: (v: number) => void;
    } | null>
  >([]);
  const fxEnabled = useRef(false);
  const rafId = useRef<number | null>(null);
  const pendingPointer = useRef<{ x: number; y: number } | null>(null);

  // Scroll drives which project is active: whichever track step sits in the
  // center band wins. The step itself renders nothing — it's just a scroll
  // cue — the visible card stays put and fades between projects.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );
    trackRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pins.length]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    fxEnabled.current = !reduceMotion && !coarsePointer;
    if (!fxEnabled.current) return;

    const els = pinGroupRefs.current.filter(
      (el): el is SVGGElement => el !== null,
    );
    gsap.set(els, { transformOrigin: "0px 0px" });
    pinSetters.current = pinGroupRefs.current.map((el) => {
      if (!el) return null;
      return {
        x: gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" }),
        y: gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" }),
        scale: gsap.quickTo(el, "scale", { duration: 0.35, ease: "power3" }),
      };
    });

    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [pins.length]);

  const active = pins[activeIdx];
  const highlightedRegion = hoveredRegion ?? active?.regionId;

  // Clicking a pin selects that project immediately, and — on desktop,
  // where the scroll track exists — scrolls to its step too.
  const jumpToPin = (i: number) => {
    setActiveIdx(i);
    trackRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!fxEnabled.current) return;
    pendingPointer.current = { x: e.clientX, y: e.clientY };
    if (rafId.current != null) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const svg = svgRef.current;
      const pointer = pendingPointer.current;
      if (!svg || !pointer) return;

      const rect = svg.getBoundingClientRect();
      const fracX = (pointer.x - rect.left) / rect.width;
      const fracY = (pointer.y - rect.top) / rect.height;

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.setProperty("--mx", `${fracX * 100}%`);
        overlay.style.setProperty("--my", `${fracY * 100}%`);
        overlay.style.opacity = "1";
      }

      const svgX = fracX * VIEW_W;
      const svgY = fracY * VIEW_H;

      const ping = pingRef.current;
      if (ping) {
        ping.setAttribute("cx", String(svgX));
        ping.setAttribute("cy", String(svgY));
        ping.style.opacity = "1";
      }

      pins.forEach((pin, i) => {
        const setter = pinSetters.current[i];
        if (!setter) return;
        const dx = svgX - pin.pos.x;
        const dy = svgY - pin.pos.y;
        const dist = Math.hypot(dx, dy);
        const pull = Math.max(0, 1 - dist / MAGNET_RADIUS);
        setter.x(dx * pull * MAGNET_STRENGTH);
        setter.y(dy * pull * MAGNET_STRENGTH);
        setter.scale(1 + pull * 0.5);
      });
    });
  };

  const handleMapMouseLeave = () => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (overlayRef.current) overlayRef.current.style.opacity = "0";
    if (pingRef.current) pingRef.current.style.opacity = "0";
    pinSetters.current.forEach((setter) => {
      if (!setter) return;
      setter.x(0);
      setter.y(0);
      setter.scale(1);
    });
  };

  return (
    <section id="presence" className="relative bg-white">
      {/* Scoped to this wrapper (not the whole section) — overflow-hidden on
          an ancestor of the sticky map below would break its position:sticky. */}
      <div className="relative overflow-hidden">
      {/* breathing glow orbs — re-fire every time the block scrolls into
          view, since this is the site's flattest, least-decorated header
          zone right before the map */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -start-32 top-0 h-80 w-80 rounded-full bg-primary/[0.07] blur-3xl"
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -end-20 top-44 h-64 w-64 rounded-full bg-primary/[0.06] blur-3xl"
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[480px] opacity-[0.3]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,21,95,0.10) 1.2px, transparent 0)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(70% 60% at 20% 20%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 20% 20%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 pb-16 pt-24 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>

        <div className="mt-10 grid max-w-md grid-cols-2 gap-6">
          {metrics.map((m, i) => {
            const { target, suffix } = parseMetric(m.value);
            const Icon = METRIC_ICONS[i % METRIC_ICONS.length];
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 36, scale: 0.88 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, margin: "-60px" }}
                transition={{ type: "spring", stiffness: 130, damping: 15, delay: 0.12 + i * 0.14 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-[var(--radius-md)] border border-black/5 bg-off-white p-6"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                {Icon("relative h-5 w-5 text-primary/50")}
                <div className="relative mt-3 text-3xl font-extrabold text-heading">
                  <Counter target={target} suffix={suffix} />
                </div>
                <div className="relative mt-1 text-xs text-gray-muted">{m.label}</div>
                <div className="relative mt-4 h-[3px] w-8 overflow-hidden rounded-full bg-primary/10">
                  <motion.div
                    className="h-full origin-left rounded-full bg-primary rtl:origin-right"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: false, margin: "-60px" }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 + i * 0.14 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 pb-24 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Map — pinned in place while the project steps scroll past */}
          <div className="flex h-[50vh] w-full shrink-0 items-center justify-center lg:sticky lg:top-[88px] lg:h-[calc(100vh-88px)] lg:w-auto lg:flex-1 lg:self-start">
            <div
              className="relative w-full max-w-xl"
              onMouseMove={handleMapMouseMove}
              onMouseLeave={handleMapMouseLeave}
            >
              <svg
                ref={svgRef}
                viewBox={SAUDI_MAP_VIEWBOX}
                className="block h-auto w-full overflow-visible"
                xmlns="http://www.w3.org/2000/svg"
              >
                {SAUDI_REGIONS.map((region) => (
                  <path
                    key={region.id}
                    d={region.path}
                    fill={
                      highlightedRegion === region.id
                        ? "rgba(15,21,95,0.14)"
                        : "rgba(15,21,95,0.04)"
                    }
                    stroke="rgba(15,21,95,0.28)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className="cursor-pointer transition-colors duration-300"
                    onMouseEnter={() => setHoveredRegion(region.id)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />
                ))}

                {pins.map((pin, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <g
                      key={`${pin.city}-${i}`}
                      ref={(el) => {
                        pinGroupRefs.current[i] = el;
                      }}
                      transform={`translate(${pin.pos.x}, ${pin.pos.y})`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredRegion(pin.regionId)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => jumpToPin(i)}
                    >
                      {isActive && (
                        <circle r="10" fill="none" stroke="#0F155F" strokeWidth="1.5" opacity="0.5">
                          <animate attributeName="r" values="6;19;6" dur="2.2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        r={isActive ? 5.5 : 3.2}
                        fill={isActive ? "#0F155F" : "rgba(15,21,95,0.4)"}
                        className="transition-[r] duration-300 ease-out"
                      />
                      {/* generous invisible hit-area for easier hover/tap */}
                      <circle r="14" fill="transparent" />
                    </g>
                  );
                })}

                {/* radar ping — pulses on a loop from wherever the cursor
                    last sat over the map */}
                <circle
                  ref={pingRef}
                  r="4"
                  fill="none"
                  stroke="rgba(15,21,95,0.5)"
                  strokeWidth="1.5"
                  className="pointer-events-none opacity-0 [animation:mapPing_1.6s_ease-out_infinite]"
                />
              </svg>

              {/* cursor spotlight — a soft torch of brand light that
                  follows the pointer across the map */}
              <div
                ref={overlayRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [mix-blend-mode:multiply]"
                style={{
                  background:
                    "radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(15,21,95,0.14), transparent 70%)",
                }}
              />

              {active && (
                <div
                  className="pointer-events-none absolute z-10 hidden w-max max-w-[190px] rounded-[var(--radius-md)] border border-black/5 bg-white px-4 py-3 shadow-2xl transition-all duration-300 lg:block"
                  style={{
                    left: `${(active.pos.x / VIEW_W) * 100}%`,
                    top: `${(active.pos.y / VIEW_H) * 100}%`,
                    transform:
                      active.pos.x / VIEW_W > 0.72
                        ? "translate(-100%, calc(-100% - 14px))"
                        : "translate(-50%, calc(-100% - 14px))",
                  }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {tProjects(`filters.${active.category}`)}
                  </div>
                  <div className="mt-1 text-xs font-bold leading-snug text-heading">{active.title}</div>
                  <div className="mt-1 text-[11px] text-gray-muted">{active.location}</div>
                </div>
              )}
            </div>
          </div>

          {/* Project card — stays put and fades between projects as the
              (invisible) scroll steps pass behind it */}
          <div className="grid w-full shrink-0 lg:w-[420px] lg:ps-10">
            <div className="col-start-1 row-start-1 hidden lg:block">
              {pins.map((item, i) => (
                <div
                  key={item.title}
                  ref={(el) => {
                    trackRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="h-[60vh]"
                />
              ))}
            </div>

            <div className="col-start-1 row-start-1 flex items-center py-10 lg:sticky lg:top-[88px] lg:h-[calc(100vh-88px)] lg:self-start lg:py-0">
              <div className="relative h-[420px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-black/5 bg-off-white shadow-sm">
                {pins.map((item, i) => (
                  <div
                    key={item.title}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                      i === activeIdx ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <div className="relative h-48 w-full">
                      <Image
                        src={categoryImages[item.category]}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="420px"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between text-xs text-gray-muted">
                        <span className="font-semibold text-primary">
                          {tProjects(`filters.${item.category}`)}
                        </span>
                        <span>{item.value}</span>
                        <span>{item.year}</span>
                      </div>
                      <h3 className="mt-3 text-base font-bold leading-snug text-heading">{item.title}</h3>
                      <div className="mt-1 text-xs text-gray-muted">{item.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
