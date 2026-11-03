"use client";

/**
 * Leadership — the panels.
 *
 * A light, editorial section: the heading on one side and its paragraph on the
 * other, a hairline under them, then the people as tall panels that share the
 * row. Point at one and it widens while its neighbours give way, so the
 * photograph itself opens up — the crop changes as it grows. Beneath each panel
 * sits its own rule, a short navy stroke that runs the whole width on hover, and
 * then the name and role. Nothing is written on a photograph.
 *
 * Three stand in a row. Anyone beyond three continues in a row of their own, on
 * the same columns — a short last row keeps each panel at a third of the width
 * instead of stretching one person across the page.
 *
 * The widening is for a pointer; nothing is lost without one. Below `sm` the
 * panels stack at full width, and a reader who has asked for less motion gets
 * the finished page: that is forced in CSS (`motion-reduce:`) rather than by
 * branching on the reduced-motion hook, which is unknown on the server — a
 * branch there makes the server's page and the first client render differ, and
 * React then discards the page and builds it again.
 *
 * The portraits belong to the media library, bound at
 * `aboutPage.leadership.members[n]` by the row's place in the list, so the
 * editor adds each one beside the person's name in the studio. The CMS never
 * deletes a row: an editor takes someone off the page by clearing their name,
 * and a row with no name is skipped here — keeping its stored position, so the
 * people after it still find their own portraits. A person with no portrait yet,
 * or whose file cannot be loaded, gets the first letter of their name on the
 * site's zigzag surface.
 */

import { motion } from "framer-motion";
import { LeaderPhoto, useLeaders } from "./leadership-shared";

const EASE = [0.22, 1, 0.36, 1] as const;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let at = 0; at < items.length; at += size) rows.push(items.slice(at, at + size));
  return rows;
}

export function Leadership({ as: Heading = "h2" }: { as?: "h1" | "h2" } = {}) {
  const { people, tag, title, description } = useLeaders();
  const rows = chunk(people, 3);

  return (
    <section id="leadership" className="bg-off-white section-y">
      <div className="container-page content-measure">
        <div className="flex flex-col gap-8 border-b border-black/10 pb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-primary" />
              <p className="text-xs font-semibold text-primary ltr:uppercase ltr:tracking-[0.28em] rtl:text-sm">
                {tag}
              </p>
            </div>
            <Heading className="mt-5 text-4xl font-black leading-[1.15] text-heading sm:text-5xl lg:text-6xl">
              {title}
            </Heading>
          </div>
          <p className="max-w-md leading-8 text-gray-muted">{description}</p>
        </div>

        <div className="mt-14 space-y-14">
          {rows.map((row, r) => (
            <div key={r} className="flex flex-col gap-14 sm:flex-row sm:gap-4 lg:gap-5">
              {row.map(({ member: m, index }, k) => (
                <motion.figure
                  key={m.name}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, ease: EASE, delay: k * 0.14 }}
                  className={[
                    "group m-0 flex min-w-0 flex-col motion-reduce:opacity-100! motion-reduce:[transform:none]!",
                    // A full row shares the width and widens the panel pointed at; a
                    // short last row keeps each panel at a third and stays still.
                    row.length === 3
                      ? "flex-1 sm:transition-[flex-grow] sm:duration-700 sm:ease-[cubic-bezier(0.22,1,0.36,1)] sm:hover:flex-[1.55] motion-reduce:transition-none"
                      : "sm:w-[calc((100%-2rem)/3)] sm:flex-none lg:w-[calc((100%-2.5rem)/3)]",
                  ].join(" ")}
                >
                  <div className="relative h-[26rem] sm:h-[30rem] lg:h-[36rem]">
                    <LeaderPhoto
                      index={index}
                      name={m.name}
                      sizes="(min-width: 1024px) 40vw, (min-width: 640px) 45vw, 100vw"
                      className="absolute inset-0 rounded-2xl shadow-[var(--shadow-lift)]"
                    />
                  </div>

                  <figcaption className="mt-7">
                    <div className="relative h-px bg-black/12" aria-hidden="true">
                      <span className="absolute inset-y-0 start-0 w-12 bg-primary transition-[width] duration-700 ease-out group-hover:w-full motion-reduce:transition-none" />
                    </div>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold leading-snug text-heading">{m.name}</h3>
                        <p className="mt-2 text-xs font-semibold text-gray-muted ltr:uppercase ltr:tracking-[0.18em] rtl:text-sm">
                          {m.role}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="font-mono text-xs font-bold tabular-nums text-primary/60"
                      >
                        {String(r * 3 + k + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
