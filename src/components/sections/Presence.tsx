"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import {
  SAUDI_MAP_VIEWBOX,
  SAUDI_REGIONS,
  SAUDI_CITY_PINS,
  CITY_REGION,
} from "@/lib/saudiMap";

const VIEW_W = 730;
const VIEW_H = 600;
const ROTATE_MS = 3400;

interface ProjectItem {
  city: string;
  category: "infrastructure" | "energy" | "buildings";
  title: string;
  location: string;
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
  const [paused, setPaused] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    if (paused || pins.length === 0) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % pins.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, pins.length]);

  const active = pins[activeIdx];
  const highlightedRegion = hoveredRegion ?? active?.regionId;

  const selectPin = (i: number) => {
    setActiveIdx(i);
    setPaused(true);
  };

  return (
    <section className="bg-primary py-24">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-6 lg:grid-cols-2 lg:px-10">
        <div className="flex flex-col justify-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-white lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{t("description")}</p>

          <div className="mt-10 grid grid-cols-2 gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-[var(--radius-md)] border border-white/10 p-6">
                <div className="text-3xl font-extrabold text-white">{m.value}</div>
                <div className="mt-1 text-xs text-white/60">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-xl" onMouseLeave={() => setPaused(false)}>
            <svg
              viewBox={SAUDI_MAP_VIEWBOX}
              className="h-auto w-full overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
            >
              {SAUDI_REGIONS.map((region) => (
                <path
                  key={region.id}
                  d={region.path}
                  fill={
                    highlightedRegion === region.id
                      ? "rgba(255,255,255,0.16)"
                      : "rgba(255,255,255,0.05)"
                  }
                  stroke="rgba(255,255,255,0.3)"
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
                    transform={`translate(${pin.pos.x}, ${pin.pos.y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => selectPin(i)}
                    onClick={() => selectPin(i)}
                  >
                    {isActive && (
                      <circle r="10" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.55">
                        <animate attributeName="r" values="6;19;6" dur="2.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.55;0;0.55" dur="2.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      r={isActive ? 5.5 : 3.2}
                      fill={isActive ? "#ffffff" : "rgba(255,255,255,0.55)"}
                      className="transition-[r] duration-300 ease-out"
                    />
                    {/* generous invisible hit-area for easier hover/tap */}
                    <circle r="14" fill="transparent" />
                  </g>
                );
              })}
            </svg>

            {active && (
              <div
                className="pointer-events-none absolute z-10 w-max max-w-[190px] rounded-[var(--radius-md)] bg-white px-4 py-3 shadow-2xl transition-all duration-300"
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
                <div className="mt-1 text-xs font-bold leading-snug text-black">{active.title}</div>
                <div className="mt-1 text-[11px] text-gray-muted">{active.location}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
