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
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "framer-motion";
import { Chip, chipClasses } from "@/components/ui/Chip";

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
  /** Basename of the photo in /public/images/projects. Present only where the
   *  company profile's own captioned pages prove which project a photo shows;
   *  the rest render the panel treatment below rather than borrow a picture
   *  from a different job. */
  image?: string;
  /** Free-form: the filter list is derived from whatever values appear. */
  category: string;
  title: string;
  location: string;
  /** Absent for the one showcased project the profile gives no contract value. */
  value?: string;
  year?: string;
  /** Average manpower and plant on site, as recorded in the profile. */
  manpower?: number;
  equipment?: number;
}

type FilterKey = string;

/**
 * Backdrop for a card that has no photograph of its own.
 *
 * These are Wjeen's own site photographs, but from the profile's uncaptioned
 * sets — nothing ties them to one job, so they are not presented as one. They
 * sit under the navy wash at low opacity, reading as texture rather than as a
 * claim that this is the project pictured. A card with a verified photograph
 * still shows it full strength.
 */
const CATEGORY_TEXTURE: Record<string, string> = {
  industrial: "khurais-structure",
  buildings: "tanajib-facility-exterior",
  renovation: "khursaniyah-renovation",
};

export function ProjectsGrid() {
  const reduce = useReducedMotion() === true;
  const t = useTranslations("projectsPage");
  const items = t.raw("items") as ProjectItem[];
  const [filter, setFilter] = useState<FilterKey>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  // Derived from the content rather than hard-coded: the categories are part
  // of the data, and listing them here as well meant renaming one in the
  // translations silently broke the other. Memoised alongside the visible set
  // so both read `items` once, in the same pass.
  const filters: FilterKey[] = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );

  const visible = useMemo(
    () =>
      filter === "all" ? items : items.filter((item) => item.category === filter),
    [items, filter],
  );

  // Flip is 48KB and this is the only place on the site that uses it, so it is
  // fetched on demand rather than shipped with every page. Warming it when a
  // pointer reaches the filter row means the first click still animates
  // immediately — the module is already there by the time it is needed.
  const warmFlip = () => {
    void import("@/lib/gsapFlip");
  };

  const handleFilter = async (key: FilterKey) => {
    const grid = gridRef.current;
    if (!grid || typeof window === "undefined") {
      setFilter(key);
      return;
    }

    // Reduced motion: filtering is functional, not decorative, so it still has
    // to happen — the cards just arrive in place instead of flying there.
    // Skipping Flip entirely (rather than running it at duration 0) avoids its
    // `absolute: true` pass, which lifts every card out of the grid mid-
    // transition and would flash the layout.
    if (reduce) {
      setFilter(key);
      return;
    }

    // Awaited before the state snapshot, which must be taken while the DOM
    // still shows the outgoing set — `setFilter` below is what changes it.
    const { Flip } = await import("@/lib/gsapFlip");

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
    <section className="bg-white section-y">
      <div className="container-page">
        <div
          className="flex flex-wrap gap-3"
          onPointerEnter={warmFlip}
          onFocusCapture={warmFlip}
        >
          {filters.map((key) => (
            <button
              key={key}
              onClick={() => handleFilter(key)}
              aria-pressed={filter === key}
              className={chipClasses({
                tone: filter === key ? "solid" : "muted",
                size: "md",
                // The tones carry a card shadow because most chips sit over
                // photography; a filter row sits on a flat panel, so the
                // unselected state drops it.
                className:
                  "transition-all duration-300 " +
                  (filter === key
                    ? "shadow-[var(--shadow-lift)]"
                    : "hover:bg-black/5"),
              })}
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
                className={`bento-hover group relative overflow-hidden rounded-ui border border-black/5 bg-off-white shadow-[var(--shadow-card-flat)] ${cell.span} ${cell.h} h-[340px] sm:col-span-1`}
              >
                {item.image ? (
                  <>
                    <Image
                      src={`/images/projects/${item.image}.jpg`}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(min-width: 1024px) 60vw, (min-width: 640px) 45vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  </>
                ) : (
                  // No verified photograph for this job. Rather than reuse
                  // another project's picture, the card becomes a brand panel
                  // and spends the space on figures the profile does record.
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-deep)] to-primary">
                    {CATEGORY_TEXTURE[item.category] ? (
                      <Image
                        src={`/images/projects/${CATEGORY_TEXTURE[item.category]}.jpg`}
                        alt=""
                        aria-hidden="true"
                        fill
                        className="object-cover opacity-25 mix-blend-luminosity"
                        sizes="(min-width: 1024px) 60vw, (min-width: 640px) 45vw, 100vw"
                      />
                    ) : null}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-[0.18]"
                      style={{
                        // --color-grid-dot is a 10% navy tint meant for the
                        // light surfaces; on navy it disappears.
                        backgroundImage:
                          "radial-gradient(rgb(255 255 255 / 0.55) 1px, transparent 1px)",
                        backgroundSize: "22px 22px",
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  </div>
                )}

                {/* cursor glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(350px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), color-mix(in srgb, var(--color-primary-on-dark) 16%, transparent), transparent 80%)",
                  }}
                />

                <div className="absolute inset-0 z-20 flex flex-col justify-end p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="solid" elevated>
                      {t(`filters.${item.category}`)}
                    </Chip>
                    {item.value ? (
                      <Chip tone="onDark" elevated>
                        {item.value}
                      </Chip>
                    ) : null}
                  </div>

                  {/* h2, not h3: these cards are the page's top-level content,
                      sitting directly under the PageHeader's h1. */}
                  <h2 className="t-h4 mt-3 text-white">{item.title}</h2>

                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/70">
                    <span>{item.location}</span>
                    {item.year ? <span className="shrink-0">{item.year}</span> : null}
                  </div>

                  {!item.image && item.manpower ? (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/60">
                      <span>
                        {t("manpowerLabel")}{" "}
                        <span className="font-semibold text-white/90">{item.manpower}</span>
                      </span>
                      <span>
                        {t("equipmentLabel")}{" "}
                        <span className="font-semibold text-white/90">{item.equipment}</span>
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-4 h-1 w-10 rounded-ui bg-[var(--color-primary-on-dark)] transition-all duration-500 group-hover:w-20" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
