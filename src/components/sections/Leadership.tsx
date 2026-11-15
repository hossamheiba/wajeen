"use client";

/**
 * Leadership — three large portraits arranged as a triangle: the first person
 * (the chairman) alone on top, centred, and the next two side by side beneath
 * him, each the same size. Nothing is written on a photograph. A white panel with
 * the person's name and role waits just below the bottom edge of each portrait,
 * clipped away, and slides up over the foot of the picture when it is pointed at
 * or takes keyboard focus. A screen with no pointer to point (a phone, a tablet)
 * cannot hover, so there the panel is simply always shown.
 *
 * The layout is a two-column grid at every width, so the triangle holds from a
 * phone to a wide desktop: the first card spans both columns at exactly one
 * column's width, centred; the rest fill the columns two to a row (an odd one out
 * at the end is centred too). Only the size of the cards and the gap change.
 *
 * The portraits belong to the media library, bound at
 * `aboutPage.leadership.members[n]` by the row's place in the list, so the editor
 * adds each one beside the person's name in the studio. The CMS never deletes a
 * row: an editor takes someone off the page by clearing their name, and a row with
 * no name is skipped here — keeping its stored position, so the people after it
 * still find their own portraits. A person with no portrait yet, or whose file
 * cannot be loaded, gets the first letter of their name on the site's zigzag
 * surface.
 *
 * Reduced motion is forced in CSS (`motion-reduce:`) rather than by branching on
 * the reduced-motion hook, which is unknown on the server — a branch there makes
 * the server's page and the first client render differ, and React then discards
 * the page and builds it again.
 */

import { motion } from "framer-motion";
import { LeaderPhoto, useLeaders } from "./leadership-shared";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: "-40px" } as const;
const STILL = "motion-reduce:opacity-100! motion-reduce:[transform:none]!";

/** The panel slides on the reference's curve, over its 0.4 s. */
const SLIDE =
  "transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none";

/**
 * The triangle. The first card, and a last one that would otherwise sit alone,
 * span both columns at exactly one column's width and stand in the middle.
 */
const ALONE =
  "[&>li:first-child]:col-span-2 [&>li:first-child]:mx-auto [&>li:first-child]:w-[calc(50%-var(--g)/2)] [&>li:last-child:nth-child(even)]:col-span-2 [&>li:last-child:nth-child(even)]:mx-auto [&>li:last-child:nth-child(even)]:w-[calc(50%-var(--g)/2)]";

export function Leadership({ as: Heading = "h2" }: { as?: "h1" | "h2" } = {}) {
  const { people, title } = useLeaders();
  return (
    <section id="leadership" className="bg-off-white">
      <div className="container-page content-measure flex flex-col gap-10 py-16 sm:gap-14 sm:py-20 lg:gap-[4.5rem] lg:py-[6.75rem]">
        <div className="relative">
          {/* The slanted block behind the heading's first letter. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 99 96"
            className="pointer-events-none absolute -start-3 -top-3 h-[4.5rem] w-[4.7rem] ltr:-scale-x-100"
          >
            <path fill="#979ef7" d="M99 38.677V0L0 57.323V96l99-57.323Z" />
          </svg>
          <Heading className="relative text-4xl font-normal leading-[1.2] text-heading lg:text-[2.6rem]">
            {title}
          </Heading>
        </div>
        <ul
          className={`m-0 mx-auto grid w-full max-w-[44rem] list-none grid-cols-2 gap-[var(--g)] p-0 [--g:0.75rem] sm:[--g:1.875rem] lg:max-w-[46rem] ${ALONE}`}
        >
          {people.map(({ member: m, index }, k) => (
            <motion.li
              key={m.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEW}
              transition={{
                duration: 0.8,
                ease: EASE,
                delay: Math.min(k, 3) * 0.1,
              }}
              className={`group relative aspect-[3/4.2] w-full overflow-hidden sm:aspect-[299/408] ${STILL}`}
            >
              <figure
                className="m-0 size-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
                tabIndex={0}
              >
                <LeaderPhoto
                  index={index}
                  name={m.name}
                  sizes="(min-width: 1024px) 23rem, 46vw"
                  className="absolute inset-0"
                />
                {/* Clipped away below the picture until it is pointed at or focused —
                    and always shown where there is nothing to point with. */}
                <figcaption
                  className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-[0.15rem] bg-white p-3 sm:p-[1.4rem] ${SLIDE} translate-y-0 [@media(hover:hover)]:translate-y-full [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-hover:translate-y-0`}
                >
                  <strong className="text-[0.8rem] font-medium leading-5 text-heading sm:text-[0.94rem] sm:leading-6">
                    {m.name}
                  </strong>
                  <span className="text-[0.7rem] leading-4 text-gray-muted sm:text-xs sm:leading-[1.2rem]">
                    {m.role}
                  </span>
                </figcaption>
              </figure>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
