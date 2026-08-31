"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeUp } from "@/components/ui/Reveal";
import {
  SAUDI_MAP_VIEWBOX,
  SAUDI_REGIONS,
  SAUDI_CITY_PINS,
  CITY_REGION,
} from "@/lib/saudiMap";


const VIEW_W = 730;
const VIEW_H = 600;

interface ProjectItem {
  image?: string;
  city: string;
  /** Free-form: the filter list is derived from whatever values appear. */
  category: string;
  title: string;
  location: string;
  value?: string;
  year?: string;
}

export function Presence() {
  const t = useTranslations("presence");
  const tProjects = useTranslations("projectsPage");
  const metrics = t.raw("metrics") as { value: string; label: string }[];
  const items = tProjects.raw("items") as ProjectItem[];

  const pins = items
    .filter((item) => SAUDI_CITY_PINS[item.city])
    .map((item) => ({
      ...item,
      pos: SAUDI_CITY_PINS[item.city],
      regionId: CITY_REGION[item.city],
    }));

  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const trackRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Scroll drives which project is active: whichever track step sits in the
  // center band wins. The step itself renders nothing — it's just a scroll
  // cue — the visible card stays put and fades between projects.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );
    trackRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pins.length]);

  const active = pins[activeIdx];
  const highlightedRegion = hoveredRegion ?? active?.regionId;

  // Clicking a pin selects that project immediately, and — on desktop,
  // where the scroll track exists — scrolls to its step too.
  const jumpToPin = (i: number) => {
    setActiveIdx(i);
    trackRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section id="presence" className="bg-white">
      <div className="container-page pb-16 pt-24">
        <div className="max-w-2xl">
          <SectionHeading eyebrow={t("tag")} title={t("title")} />
          <p className="mt-4 max-w-md t-small text-gray-muted">{t("description")}</p>
        </div>

        <FadeUp className="mt-10 grid max-w-md grid-cols-1 gap-6 sm:grid-cols-2" y={20}>
          {metrics.map((m) => (
            <div key={m.label} className="rounded-ui border border-black/5 bg-off-white p-6 shadow-[var(--shadow-card)]">
              <div className="text-3xl font-extrabold text-heading">{m.value}</div>
              <div className="mt-1 text-xs text-gray-muted">{m.label}</div>
            </div>
          ))}
        </FadeUp>
      </div>

      <div className="container-wide pb-24">
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Map — pinned in place while the project steps scroll past */}
          <div className="flex h-[50vh] w-full shrink-0 items-center justify-center lg:sticky lg:top-[88px] lg:h-[calc(100vh-88px)] lg:w-auto lg:flex-1 lg:self-start">
            <div className="relative w-full max-w-xl">
              <svg
                viewBox={SAUDI_MAP_VIEWBOX}
                className="block h-auto w-full overflow-visible"
                xmlns="http://www.w3.org/2000/svg"
              >
                {SAUDI_REGIONS.map((region) => (
                  <path
                    key={region.id}
                    d={region.path}
                    fill={
                      highlightedRegion === region.id
                        ? "color-mix(in srgb, var(--color-primary) 14%, transparent)"
                        : "color-mix(in srgb, var(--color-primary) 4%, transparent)"
                    }
                    stroke="color-mix(in srgb, var(--color-primary) 28%, transparent)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className="cursor-pointer transition-colors duration-300"
                    onMouseEnter={() => setHoveredRegion(region.id)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />
                ))}

                {pins.map((pin, i) => {
                  const isActive = i === activeIdx;
                  // A real control rather than a decorated <g>: role and
                  // tabIndex make it reachable and announced, the key handler
                  // gives Enter/Space the same effect as a click, and
                  // aria-label names the place — to a screen reader the pin is
                  // otherwise just a dot on a map.
                  return (
                    <g
                      key={`${pin.city}-${i}`}
                      transform={`translate(${pin.pos.x}, ${pin.pos.y})`}
                      className="cursor-pointer [&:focus-visible>.pin-ring]:opacity-100"
                      role="button"
                      tabIndex={0}
                      aria-label={`${pin.location} — ${pin.title}`}
                      aria-current={isActive ? "true" : undefined}
                      onMouseEnter={() => setHoveredRegion(pin.regionId)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onFocus={() => setHoveredRegion(pin.regionId)}
                      onBlur={() => setHoveredRegion(null)}
                      onClick={() => jumpToPin(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          jumpToPin(i);
                        }
                      }}
                    >
                      {/* The global focus outline does not apply inside SVG, so
                          the indicator is drawn as part of the graphic. */}
                      <circle
                        className="pin-ring opacity-0"
                        r="14"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                      />
                      {/* The pulse is a CSS animation, not SMIL: SMIL ignores
                          prefers-reduced-motion, and branching the markup on it
                          made the server and client render different trees —
                          a hydration mismatch. As CSS it is switched off by the
                          reduced-motion block in globals.css, with identical
                          markup on both sides. */}
                      {isActive && (
                        <circle
                          className="pin-pulse"
                          r="10"
                          fill="none"
                          stroke="var(--color-primary)"
                          strokeWidth="1.5"
                          opacity="0.5"
                        />
                      )}
                      <circle
                        r={isActive ? 5.5 : 3.2}
                        fill={isActive ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 40%, transparent)"}
                        className="transition-[r] duration-300 ease-out"
                      />
                      {/* generous invisible hit-area for easier hover/tap */}
                      <circle r="14" fill="transparent" />
                    </g>
                  );
                })}
              </svg>

              {active && (
                <div
                  className="pointer-events-none absolute z-10 hidden w-max max-w-[190px] rounded-ui border border-black/5 bg-white px-4 py-3 shadow-[var(--shadow-float)] transition-all duration-300 lg:block"
                  style={{
                    left: `${(active.pos.x / VIEW_W) * 100}%`,
                    top: `${(active.pos.y / VIEW_H) * 100}%`,
                    transform:
                      active.pos.x / VIEW_W > 0.72
                        ? "translate(-100%, calc(-100% - 14px))"
                        : "translate(-50%, calc(-100% - 14px))",
                  }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {tProjects(`filters.${active.category}`)}
                  </div>
                  <div className="mt-1 text-xs font-bold leading-snug text-heading">{active.title}</div>
                  <div className="mt-1 text-[11px] text-gray-muted">{active.location}</div>
                </div>
              )}
            </div>
          </div>

          {/* Project card — stays put and fades between projects as the
              (invisible) scroll steps pass behind it */}
          <div className="grid w-full shrink-0 lg:w-[420px] lg:ps-10">
            <div className="col-start-1 row-start-1 hidden lg:block">
              {pins.map((item, i) => (
                <div
                  key={item.title}
                  ref={(el) => {
                    trackRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="h-[60vh]"
                />
              ))}
            </div>

            <div className="col-start-1 row-start-1 flex items-center py-10 lg:sticky lg:top-[88px] lg:h-[calc(100vh-88px)] lg:self-start lg:py-0">
              <div className="relative h-[420px] w-full overflow-hidden rounded-ui border border-black/5 bg-off-white shadow-[var(--shadow-card)]">
                {pins.map((item, i) => (
                  <div
                    key={item.title}
                    className={`absolute inset-0 flex flex-col transition-opacity duration-700 ease-out ${
                      i === activeIdx ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <div className="relative w-full flex-1">
                      {item.image ? (
                        <Image
                          src={`/images/projects/${item.image}.jpg`}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="420px"
                        />
                      ) : (
                        // Same treatment as the projects grid: a brand panel
                        // rather than another project's photograph.
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-deep)] to-primary">
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 opacity-[0.18]"
                            style={{
                              // --color-grid-dot is a 10% navy tint meant for
                              // the light surfaces; on navy it disappears.
                              backgroundImage:
                                "radial-gradient(rgb(255 255 255 / 0.55) 1px, transparent 1px)",
                              backgroundSize: "22px 22px",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between text-xs text-gray-muted">
                        <span className="font-semibold text-primary">
                          {tProjects(`filters.${item.category}`)}
                        </span>
                        {item.value ? <span>{item.value}</span> : null}
                        {item.year ? <span>{item.year}</span> : null}
                      </div>
                      <h3 className="t-h5 mt-3 text-heading">{item.title}</h3>
                      <div className="mt-1 text-xs text-gray-muted">{item.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
