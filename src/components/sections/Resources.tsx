"use client";

/**
 * Resources — the company profile's establishment pages (32–38) put on the
 * site: the 230-strong workforce broken down by trade, and the owned plant by
 * category. These are the numbers a prequalifying client actually checks.
 *
 * The bars are drawn against a fixed round ceiling — the next fifty above the
 * largest trade — not against the largest trade itself. Measuring against the
 * largest made every bar depend on every other one: raising one figure past
 * another visibly shrank all the rest, which reads as a fault when a single
 * number is edited in the studio. A ceiling only moves when a figure crosses
 * it, so an ordinary edit now changes one bar and leaves the others still.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Row {
  label: string;
  count: number;
}

export function Resources() {
  const t = useTranslations("resources");
  const reduce = useReducedMotion();
  const trades = t.raw("trades") as Row[];
  const equipment = t.raw("equipment") as Row[];
  const largest = Math.max(...trades.map((x) => x.count));
  const scale = Math.max(50, Math.ceil(largest / 50) * 50);

  return (
    <section className="section-y bg-white">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("tag")}
          title={t("title")}
          description={t("description")}
          className="max-w-3xl"
        />

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Manpower by trade */}
          <div className="card">
            <h3 className="t-h4 text-heading">{t("manpowerTitle")}</h3>
            <p className="t-small mt-1.5 text-gray-muted">{t("manpowerNote")}</p>

            <ul className="mt-7 space-y-3.5">
              {trades.map((row, i) => (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="t-small text-heading">{row.label}</span>
                    <span className="t-small tabular-nums text-gray-muted">
                      {row.count} <span className="text-xs">{t("staffLabel")}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-ui bg-black/5">
                    <motion.div
                      initial={reduce ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{
                        duration: reduce ? 0 : 0.7,
                        delay: reduce ? 0 : i * 0.04,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ width: `${Math.min(100, (row.count / scale) * 100)}%` }}
                      className="bar-fill h-full rounded-ui bg-primary"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Owned plant */}
          <div className="card">
            <h3 className="t-h4 text-heading">{t("equipmentTitle")}</h3>
            <p className="t-small mt-1.5 text-gray-muted">{t("equipmentNote")}</p>

            <ul className="mt-7 divide-y divide-black/5">
              {equipment.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="t-small text-heading">{row.label}</span>
                  <span className="t-small shrink-0 tabular-nums text-primary">
                    {row.count}{" "}
                    <span className="text-xs text-gray-muted">{t("unitsLabel")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
