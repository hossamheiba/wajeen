"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { Flip, gsap } from "@/lib/gsap";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const images: Record<string, typeof infrastructure> = { infrastructure, energy, buildings };

interface ProjectItem {
  category: "infrastructure" | "energy" | "buildings";
  title: string;
  location: string;
  year: string;
}

type FilterKey = "all" | ProjectItem["category"];

export function ProjectsGrid() {
  const t = useTranslations("projectsPage");
  const items = t.raw("items") as ProjectItem[];
  const [filter, setFilter] = useState<FilterKey>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const filters: FilterKey[] = ["all", "infrastructure", "energy", "buildings"];

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.category === filter)),
    [items, filter]
  );

  const handleFilter = (key: FilterKey) => {
    const grid = gridRef.current;
    if (!grid || typeof window === "undefined") {
      setFilter(key);
      return;
    }

    const state = Flip.getState(grid.querySelectorAll("[data-flip-id]"));
    flushSync(() => setFilter(key));

    Flip.from(state, {
      duration: 0.55,
      ease: "power2.inOut",
      stagger: 0.03,
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.03 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.3 }),
    });
  };

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-wrap gap-3">
          {filters.map((key) => (
            <button
              key={key}
              onClick={() => handleFilter(key)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                filter === key
                  ? "bg-orange text-white"
                  : "bg-off-white text-black hover:bg-black/5"
              }`}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>

        <div ref={gridRef} className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <article
              key={item.title}
              data-flip-id={item.title}
              className="group relative h-[340px] overflow-hidden rounded-[var(--radius-lg)]"
            >
              <Image
                src={images[item.category]}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <span className="mb-2.5 w-fit rounded-full bg-orange px-3 py-1 text-xs font-semibold text-white">
                  {t(`filters.${item.category}`)}
                </span>
                <h3 className="text-lg font-bold leading-snug text-white">{item.title}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                  <span>📍 {item.location}</span>
                  <span>{item.year}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
