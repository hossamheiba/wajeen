"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const icons: Record<string, React.ReactNode> = {
  infrastructure: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3" />
  ),
  energy: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
  ),
  buildings: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M4 20V8l8-6 8 6v12M9 20v-5h6v5" />
  ),
};

const images: Record<string, typeof infrastructure> = { infrastructure, energy, buildings };

interface BusinessCard {
  key: string;
  title: string;
  desc: string;
  cta: string;
}

export function BusinessSectors() {
  const t = useTranslations("business");
  const cards = t.raw("cards") as BusinessCard[];
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("vanilla-tilt").then(({ default: VanillaTilt }) => {
      const els = gridRef.current?.querySelectorAll<HTMLElement>("[data-tilt]");
      if (!els?.length) return;
      VanillaTilt.init(Array.from(els), {
        max: 8,
        speed: 400,
        glare: true,
        "max-glare": 0.15,
        scale: 1.02,
      });
      cleanup = () => els.forEach((el) => (el as HTMLElement & { vanillaTilt?: { destroy(): void } }).vanillaTilt?.destroy());
    });
    return () => cleanup?.();
  }, []);

  return (
    <section id="business" className="bg-off-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
            <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-black lg:text-4xl">
              {t("title")}
            </SplitReveal>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>

        <div ref={gridRef} className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.key}
              href={`/business#${card.key}`}
              data-tilt
              className="group relative block h-[420px] overflow-hidden rounded-[var(--radius-lg)]"
            >
              <Image
                src={images[card.key]}
                alt={card.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-orange text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    {icons[card.key]}
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{card.desc}</p>
                <div className="mt-4 text-sm font-semibold text-orange opacity-0 transition-opacity group-hover:opacity-100">
                  {card.cta} →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
