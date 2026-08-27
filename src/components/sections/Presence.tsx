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
  const trackRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  const active = pins[activeIdx];
  const highlightedRegion = hoveredRegion ?? active?.regionId;

  // Clicking a pin selects that project immediately, and — on desktop,
  // where the scroll track exists — scrolls to its step too.
  const jumpToPin = (i: number) => {
    setActiveIdx(i);
    trackRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section id="presence" className="bg-white">
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-24 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>

        <div className="mt-10 grid max-w-md grid-cols-2 gap-6">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-[var(--radius-md)] border border-black/5 bg-off-white p-6">
              <div className="text-3xl font-extrabold text-heading">{m.value}</div>
              <div className="mt-1 text-xs text-gray-muted">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 pb-24 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Map — pinned in place while the project steps scroll past */}
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
              </svg>

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
