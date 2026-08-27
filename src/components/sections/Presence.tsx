"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
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

const categoryImages: Record<string, typeof infrastructure> = {
  infrastructure,
  energy,
  buildings,
};

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
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Scroll drives the active pin: whichever card sits in the center band wins.
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
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pins.length]);

  const active = pins[activeIdx];
  const highlightedRegion = hoveredRegion ?? active?.regionId;

  // Clicking a pin scrolls its card into view — the observer above then
  // confirms the selection once the card settles in the center band.
  const jumpToPin = (i: number) => {
    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section id="presence" className="bg-primary">
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-24 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-white lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{t("description")}</p>
        </div>

        <div className="mt-10 grid max-w-md grid-cols-2 gap-6">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-[var(--radius-md)] border border-white/10 p-6">
              <div className="text-3xl font-extrabold text-white">{m.value}</div>
              <div className="mt-1 text-xs text-white/60">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 pb-24 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Map — pinned in place while the project list scrolls past */}
          <div className="flex h-[50vh] w-full shrink-0 items-center justify-center lg:sticky lg:top-[88px] lg:h-[calc(100vh-88px)] lg:w-auto lg:flex-1 lg:self-start">
            <div className="relative w-full max-w-xl">
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
                      onMouseEnter={() => setHoveredRegion(pin.regionId)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => jumpToPin(i)}
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
                  className="pointer-events-none absolute z-10 hidden w-max max-w-[190px] rounded-[var(--radius-md)] bg-white px-4 py-3 shadow-2xl transition-all duration-300 lg:block"
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

          {/* Scrolling project list — drives the active pin above */}
          <div className="w-full shrink-0 pt-10 lg:w-[420px] lg:ps-10 lg:pt-0">
            <div className="flex flex-col gap-6">
              {pins.map((item, i) => (
                <div
                  key={item.title}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  data-index={i}
                  className={`overflow-hidden rounded-[var(--radius-lg)] bg-white/5 transition-all duration-500 ${
                    i === activeIdx ? "opacity-100 ring-1 ring-white/30" : "opacity-55"
                  }`}
                >
                  <div className="relative h-40 w-full">
                    <Image
                      src={categoryImages[item.category]}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="420px"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{tProjects(`filters.${item.category}`)}</span>
                      <span>{item.value}</span>
                      <span>{item.year}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-snug text-white">{item.title}</h3>
                    <div className="mt-1 text-xs text-white/50">{item.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
