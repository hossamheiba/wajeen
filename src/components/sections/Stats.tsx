"use client";

import { useTranslations } from "next-intl";
import { Counter } from "@/components/ui/Counter";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  body: string;
}

export function Stats() {
  const t = useTranslations("stats");
  const items = t.raw("items") as StatItem[];

  return (
    <section id="stats" className="bg-white py-24">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="rounded-[var(--radius-lg)] border border-black/5 bg-off-white p-8 transition-transform hover:-translate-y-1.5 hover:shadow-xl"
          >
            <div className="text-4xl font-extrabold text-black lg:text-5xl">
              <Counter target={item.value} suffix={item.suffix} />
            </div>
            <SplitReveal as="div" type="words" delay={i * 0.05} className="mt-3 text-sm font-semibold text-black">
              {item.label}
            </SplitReveal>
            <p className="mt-2 text-sm leading-relaxed text-gray-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
