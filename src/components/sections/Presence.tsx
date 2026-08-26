"use client";

import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { SAUDI_MAP_PATH, SAUDI_MAP_VIEWBOX, SAUDI_CITY_PINS } from "@/lib/saudiMap";

export function Presence() {
  const t = useTranslations("presence");
  const metrics = t.raw("metrics") as { value: string; label: string }[];

  const cities = [
    { key: "riyadh", ...SAUDI_CITY_PINS.riyadh, r: 14, textX: 16 },
    { key: "jeddah", ...SAUDI_CITY_PINS.jeddah, r: 12, textX: 16 },
    { key: "dammam", ...SAUDI_CITY_PINS.dammam, r: 12, textX: 16 },
  ];

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
          <svg viewBox={SAUDI_MAP_VIEWBOX} fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg">
            <path
              d={SAUDI_MAP_PATH}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {cities.map((city) => (
              <g key={city.key} transform={`translate(${city.x}, ${city.y})`}>
                <circle cx="0" cy="0" r={city.r} fill="#FFFFFF" opacity="0.3">
                  <animate attributeName="r" values={`${city.r};${city.r + 8};${city.r}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
                <text x={city.textX} y="5" fill="#FFF" fontSize="13" fontWeight="700">
                  {t(`cities.${city.key}`)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
