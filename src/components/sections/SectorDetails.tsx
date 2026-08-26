"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const images: Record<string, typeof infrastructure> = { infrastructure, energy, buildings };

interface Sector {
  key: string;
  title: string;
  summary: string;
  capabilities: string[];
  stat: { value: string; label: string };
}

export function SectorDetails() {
  const t = useTranslations("businessPage");
  const sectors = t.raw("sectors") as Sector[];

  return (
    <div className="divide-y divide-black/5">
      {sectors.map((sector, i) => (
        <section key={sector.key} id={sector.key} className="py-24">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className={i % 2 === 1 ? "lg:order-2" : "lg:order-1"}>
                <div className="relative h-[380px] overflow-hidden rounded-[var(--radius-lg)]">
                  <Image
                    src={images[sector.key]}
                    alt={sector.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 45vw, 90vw"
                  />
                </div>
              </div>

              <div className={i % 2 === 1 ? "lg:order-1" : "lg:order-2"}>
                <SplitReveal as="h2" type="words" className="text-3xl font-extrabold text-heading lg:text-4xl">
                  {sector.title}
                </SplitReveal>
                <p className="mt-4 text-sm leading-relaxed text-gray-muted">{sector.summary}</p>

                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sector.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-2.5 text-sm text-black">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {cap}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 inline-flex items-baseline gap-3 rounded-[var(--radius-md)] bg-off-white px-6 py-4">
                  <span className="text-2xl font-extrabold text-primary">{sector.stat.value}</span>
                  <span className="text-xs text-gray-muted">{sector.stat.label}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
