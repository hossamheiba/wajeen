"use client";

/**
 * Services — the eleven lines of work the company profile lists on its
 * services page, in the profile's own order.
 *
 * The three sector cards above this summarise where the work happens;
 * this is the complete list of what is actually offered, which the site
 * previously did not carry at all. Deliberately a flat, scannable grid: it
 * is a capability list, not a set of features to be sold one by one.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Service {
  title: string;
  desc: string;
}

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** One mark per service, in the profile's order. */
const ICONS = [
  // residential & commercial building
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5" />
    </svg>
  ),
  // steel structure, erection & fabrication
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M4 20 12 4l8 16M7 14h10M9.5 9h5M4 20h16" />
    </svg>
  ),
  // industrial construction
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M3 21h18M4 21V11l5 3V11l5 3V7l5 3v11" />
      <path d="M8 17h.01M13 17h.01M18 17h.01" />
    </svg>
  ),
  // pipeline construction & maintenance
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M3 8h7a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h5M6 5v6M18 13v6" />
      <circle cx="6" cy="8" r="1.4" />
    </svg>
  ),
  // civil maintenance services
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M14.5 3.5a4 4 0 0 0 5.3 5.3l-8.4 8.4a2.5 2.5 0 1 1-3.5-3.5l8.4-8.4Z" />
      <path d="M5 19l2-2" />
    </svg>
  ),
  // manpower & equipment support
  (c: string) => (
    <svg {...ICON} className={c}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M17 11h4M19 9v4M16 20a5 5 0 0 1 5-5" />
    </svg>
  ),
  // site development
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M3 18h18M5 18l3-7 4 3 3-6 4 10" />
      <circle cx="8" cy="11" r="1.2" />
    </svg>
  ),
  // operation & maintenance projects
  (c: string) => (
    <svg {...ICON} className={c}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  ),
  // infrastructure
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M3 20h18M6 20V9M18 20V9M3 9h18l-3-4H6L3 9ZM10 20v-5h4v5" />
    </svg>
  ),
  // building trades
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M3 10h18M3 14h18M3 6h18M3 18h18" />
      <path d="M8 6v12M14 6v12" />
    </svg>
  ),
  // renovation and rehabilitation
  (c: string) => (
    <svg {...ICON} className={c}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />
    </svg>
  ),
];

export function ServicesList() {
  const t = useTranslations("servicesList");
  const reduce = useReducedMotion();
  const items = t.raw("items") as Service[];

  return (
    <section className="section-y bg-off-white">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("tag")}
          title={t("title")}
          description={t("description")}
          className="max-w-3xl"
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: reduce ? 0 : 0.45,
                delay: reduce ? 0 : (i % 3) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="card group flex gap-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ui bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                {ICONS[i % ICONS.length]("h-5 w-5")}
              </span>
              <div>
                <h3 className="t-h5 text-heading">{item.title}</h3>
                <p className="t-small mt-1.5 text-gray-muted">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
