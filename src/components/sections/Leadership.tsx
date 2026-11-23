"use client";

/**
 * Leadership — large portraits stacked in one column, one above the next, with
 * the person's name and role written beside each one, always visible: the words
 * first, then the portrait (right-then-left in Arabic, left-then-right in
 * English).
 *
 * The pair (portrait + words) is centred on the page, and the portraits all sit
 * on one vertical line: the text column has a fixed width, so a long name does
 * not push its own portrait off the line the others are on. Where the screen is
 * too narrow for the two side by side (below `sm`) the words move beneath the
 * portrait instead. Nothing is written on a photograph, and nothing waits for a
 * hover — the earlier slide-up panel was removed at the client's request
 * (2026-11-22).
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
        <ul className="m-0 flex w-full list-none flex-col items-center gap-10 p-0 sm:gap-12">
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
              className={`flex w-full max-w-[22rem] flex-col items-center gap-5 sm:max-w-none sm:flex-row sm:justify-center sm:gap-10 lg:gap-14 ${STILL}`}
            >
              {/* A fixed width, so every portrait stands on the same line however
                  long the name beside it is. The words come first (on the start
                  side: the right in Arabic, the left in English) and the portrait
                  after them; on a phone the portrait keeps the top. */}
              <div className="order-2 flex w-full flex-col gap-2 border-primary text-center sm:order-1 sm:w-[13rem] sm:border-e-4 sm:pe-5 sm:text-start lg:w-[18rem] lg:pe-7">
                <strong className="text-xl font-bold leading-snug text-heading lg:text-2xl">
                  {m.name}
                </strong>
                <span className="text-sm leading-6 text-gray-muted lg:text-base">
                  {m.role}
                </span>
              </div>
              <figure className="relative order-1 m-0 aspect-[299/408] w-full shrink-0 overflow-hidden sm:order-2 sm:w-[16rem] lg:w-[23.5rem]">
                <LeaderPhoto
                  index={index}
                  name={m.name}
                  sizes="(min-width: 1024px) 23.5rem, (min-width: 640px) 16rem, 92vw"
                  className="absolute inset-0"
                />
              </figure>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
