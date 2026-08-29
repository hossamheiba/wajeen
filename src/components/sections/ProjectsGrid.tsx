"use client";

/**
 * Projects — bento grid.
 *
 * The layout is ported from the Al-Dawaa departments page: a 12-column grid
 * where cards take varying spans and heights so each row still sums to 12.
 * The pattern cycles, so any number of visible projects tiles cleanly after
 * a filter change. GSAP Flip animates the reflow; each card carries a
 * cursor-tracking glow.
 */

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { Flip, gsap } from "@/lib/gsap";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const images: Record<string, typeof infrastructure> = {
  infrastructure,
  energy,
  buildings,
};

/** Row rhythm: 8+4 · 4+4+4 · 6+6 — every row fills the 12 columns.
 *  Classes are written out in full: Tailwind only emits what it can see
 *  literally in the source, so these must never be built by concatenation. */
const BENTO = [
  { span: "lg:col-span-8", h: "lg:h-[460px]" },
  { span: "lg:col-span-4", h: "lg:h-[460px]" },
  { span: "lg:col-span-4", h: "lg:h-[420px]" },
  { span: "lg:col-span-4", h: "lg:h-[420px]" },
  { span: "lg:col-span-4", h: "lg:h-[420px]" },
  { span: "lg:col-span-6", h: "lg:h-[360px]" },
  { span: "lg:col-span-6", h: "lg:h-[360px]" },
] as const;

interface ProjectItem {
  category: "infrastructure" | "energy" | "buildings";
  title: string;
  location: string;
  value: string;
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
    () =>
      filter === "all" ? items : items.filter((item) => item.category === filter),
    [items, filter],
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
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.4, stagger: 0.03 },
        ),
      onLeave: (els) =>
        gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.3 }),
    });
  };

  /** Feed the cursor position to the card's radial glow. */
  const trackCursor = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
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
                  ? "bg-primary text-white"
                  : "bg-off-white text-black hover:bg-black/5"
              }`}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>

        <div
          ref={gridRef}
          className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12"
        >
          {visible.map((item, i) => {
            const cell = BENTO[i % BENTO.length];
            return (
              <article
                key={item.title}
                data-flip-id={item.title}
                onMouseMove={trackCursor}
                className={`bento-hover group relative overflow-hidden rounded-3xl border border-black/5 bg-off-white shadow-[0_20px_50px_rgba(15,21,95,0.04)] ${cell.span} ${cell.h} h-[340px] sm:col-span-1`}
              >
                <Image
                  src={images[item.category]}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width: 1024px) 60vw, (min-width: 640px) 45vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* cursor glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(350px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(151,158,247,0.16), transparent 80%)",
                  }}
                />

                <div className="absolute inset-0 z-20 flex flex-col justify-end p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      {t(`filters.${item.category}`)}
                    </span>
                    <span className="w-fit rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white/90">
                      {item.value}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-snug text-white">
                    {item.title}
                  </h3>

                  <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                    <span>{item.location}</span>
                    <span>{item.year}</span>
                  </div>

                  <div className="mt-4 h-1 w-10 rounded-full bg-[var(--color-primary-on-dark)] transition-all duration-500 group-hover:w-20" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
