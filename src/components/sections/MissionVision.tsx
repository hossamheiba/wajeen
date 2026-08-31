"use client";

/**
 * Mission · Vision · Purpose · Promise — master/detail.
 *
 * Layout ported from the Al-Dawaa partnerships page: a selectable list on one
 * side, an expanded panel on the other. The active row is marked by a bar that
 * slides between entries on a shared layoutId, and the panel crossfades in
 * from the list's side. Icons stand in for the partner logos the original
 * showed, since these entries are ideas rather than organisations.
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";

interface Card {
  key: string;
  title: string;
  lead: string;
  body: string;
}

const ICON_BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS: Record<string, (c: string) => React.ReactNode> = {
  // mission — target
  mission: (c) => (
    <svg {...ICON_BASE} className={c}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  ),
  // vision — horizon
  vision: (c) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  // purpose — foundation
  purpose: (c) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M3 21h18M5 21V10l7-5 7 5v11" />
      <path d="M10 21v-6h4v6" />
    </svg>
  ),
  // promise — handshake seal
  promise: (c) => (
    <svg {...ICON_BASE} className={c}>
      <path d="M12 2.5 4 6v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V6l-8-3.5Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </svg>
  ),
};

export function MissionVision() {
  const t = useTranslations("aboutPage.mission");
  const locale = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion();

  const cards = t.raw("cards") as Card[];
  const [active, setActive] = useState(0);
  const item = cards[active];

  const icon = (key: string, cls: string) =>
    (ICONS[key] ?? ICONS.mission)(cls);

  return (
    <section id="mission" className="bg-off-white section-y">
      <div className="container-page">
        <div className="t-eyebrow text-primary">
          {t("tag")}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ---------------- list ---------------- */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            {cards.map((c, i) => {
              const isActive = i === active;
              return (
                <button
                  key={c.key}
                  onClick={() => setActive(i)}
                  aria-current={isActive}
                  className={`group relative flex items-start gap-4 overflow-hidden rounded-ui border p-5 text-start transition-all duration-300 ${
                    isActive
                      ? "border-primary bg-white shadow-[var(--shadow-lift)] ring-1 ring-primary/10"
                      : "border-black/5 bg-white/50 hover:bg-white hover:shadow-[var(--shadow-lift)]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mission-pointer"
                      className={`absolute bottom-0 top-0 w-1.5 bg-primary ${
                        "start-0 rounded-s-ui"
                      }`}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 26,
                      }}
                    />
                  )}

                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-ui border transition-all duration-300 group-hover:scale-105 ${
                      isActive
                        ? "border-primary/20 bg-primary text-white"
                        : "border-black/5 bg-off-white text-primary"
                    }`}
                  >
                    {icon(c.key, "h-6 w-6")}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-base font-bold transition-colors ${
                        isActive ? "text-primary" : "text-heading"
                      }`}
                    >
                      {c.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-gray-muted">
                      {c.lead}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ---------------- detail ---------------- */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: reduce ? 0 : rtl ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduce ? 0 : rtl ? 30 : -30 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative flex h-full flex-col overflow-hidden rounded-frame bg-white p-8 shadow-[var(--shadow-lift)] md:p-12"
              >
                <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -start-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

                <div className="relative flex-1">
                  <span className="grid h-16 w-16 place-items-center rounded-ui bg-primary/10 text-primary ring-1 ring-primary/15">
                    {icon(item.key, "h-8 w-8")}
                  </span>

                  <div className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                    {item.lead}
                  </div>

                  <h3 className="t-h3 mt-3 text-heading">
                    {item.title}
                  </h3>

                  <p className="mt-6 max-w-2xl t-body text-gray-muted">
                    {item.body}
                  </p>
                </div>

                <div className="relative mt-10 flex items-center gap-3 border-t border-black/10 pt-6">
                  <span className="font-mono text-xs font-bold tabular-nums text-gray-muted">
                    {String(active + 1).padStart(2, "0")} /{" "}
                    {String(cards.length).padStart(2, "0")}
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {cards.map((c, i) => (
                      <span
                        key={c.key}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          i === active
                            ? "w-10 bg-primary"
                            : "w-4 bg-black/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
