"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";
import { SAUDI_MAP_PATH, SAUDI_MAP_VIEWBOX, SAUDI_CITY_PINS } from "@/lib/saudiMap";

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

const PINS = SAUDI_CITY_PINS;

export function ProjectsMap() {
  const t = useTranslations("projectsPage");
  const items = t.raw("items") as ProjectItem[];

  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  const activeCity = items[activeIndex]?.city;

  return (
    <section className="bg-primary">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row lg:items-start">
        {/* Map — pinned in place while the card list scrolls past */}
        <div className="relative h-[50vh] w-full shrink-0 lg:sticky lg:top-[88px] lg:h-[calc(100vh-88px)] lg:w-auto lg:flex-1 lg:self-start">
          <svg
            viewBox={SAUDI_MAP_VIEWBOX}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d={SAUDI_MAP_PATH}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {Object.entries(PINS).map(([city, pos]) => {
              const isActive = city === activeCity;
              return (
                <g
                  key={city}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="transition-transform duration-500"
                >
                  {isActive && (
                    <circle r="18" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5">
                      <animate attributeName="r" values="10;24;10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r={isActive ? 7 : 4} fill={isActive ? "#ffffff" : "rgba(255,255,255,0.45)"} />
                </g>
              );
            })}
          </svg>

          {/* Active city label */}
          <div className="absolute bottom-8 start-8 rounded-[var(--radius-md)] bg-white/10 px-5 py-3 backdrop-blur-sm">
            <div className="text-xs uppercase tracking-widest text-white/50">
              {t("tag")}
            </div>
            <div className="mt-1 text-xl font-bold text-white">{items[activeIndex]?.location}</div>
          </div>
        </div>

        {/* Scrolling project card list */}
        <div className="w-full shrink-0 px-6 py-10 lg:w-[440px] lg:px-8 lg:py-24">
          <div className="flex flex-col gap-6">
            {items.map((item, i) => (
              <div
                key={item.title}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-index={i}
                className={`overflow-hidden rounded-[var(--radius-lg)] bg-primary-surface/40 transition-all duration-500 ${
                  i === activeIndex ? "opacity-100 ring-1 ring-white/30" : "opacity-60"
                }`}
              >
                <div className="relative h-44 w-full">
                  <Image
                    src={categoryImages[item.category]}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="440px"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{t(`filters.${item.category}`)}</span>
                    <span>{item.value}</span>
                    <span>{item.year}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-white">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
