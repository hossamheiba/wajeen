"use client";

/**
 * Leadership — a row of large portraits, and a name that rises from beneath each
 * one when it is pointed at.
 *
 * Modelled on the company's reference: a light section; a quiet heading with a
 * slanted block of colour behind its first letter and nothing else above the
 * portraits; and under that a slider of tall portraits, each the same size, side by side. Nothing is written on a photograph. A white panel with the person's name
 * and role waits just below the bottom edge of each portrait, clipped away, and
 * slides up over the foot of the picture when the portrait is pointed at or takes
 * keyboard focus. A screen with no pointer to point (a phone, a tablet) cannot
 * hover, so there the panel is simply always shown.
 *
 * The portraits are a slider: a swipe or the two round arrows moves it by one
 * portrait. The arrows appear only when there are more portraits than fit; with
 * fewer the group sits in the middle and there is nothing to move. The first person
 * shown stands at the start edge (the right, in Arabic).
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

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LeaderPhoto, useLeaders } from "./leadership-shared";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: "-40px" } as const;
const STILL = "motion-reduce:opacity-100! motion-reduce:[transform:none]!";

/** The panel slides on the reference's curve, over its 0.4 s. */
const SLIDE = "transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none";

function Arrow({
  dir,
  disabled,
  label,
  onClick,
}: {
  dir: "left" | "right";
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-[2.6rem] place-items-center rounded-full bg-primary text-white transition-[background-color,opacity] duration-300 hover:bg-primary-hover disabled:cursor-default disabled:opacity-35"
    >
      <svg width="13" height="12" viewBox="0 0 13 12" fill="none" aria-hidden="true">
        {dir === "left" ? (
          <path
            fill="currentColor"
            d="M12.598 5.75c0 .383-.301.684-.657.684H2.645L6.28 9.879a.653.653 0 0 1 .028.93c-.247.273-.657.273-.93.027L.566 6.242a.659.659 0 0 1-.191-.492.64.64 0 0 1 .191-.465L5.38.691c.273-.246.684-.246.93.028a.653.653 0 0 1-.028.93L2.645 5.093h9.296c.383 0 .657.3.657.656Z"
          />
        ) : (
          <path
            fill="currentColor"
            d="M.402 5.75c0 .383.301.684.657.684h9.296L6.72 9.879a.653.653 0 0 0-.028.93c.247.273.657.273.93.027l4.813-4.594a.659.659 0 0 0 .191-.492.64.64 0 0 0-.191-.465L7.62.691c-.273-.246-.684-.246-.93.028a.653.653 0 0 0 .028.93l3.636 3.445H1.06c-.383 0-.657.3-.657.656Z"
          />
        )}
      </svg>
    </button>
  );
}

export function Leadership({ as: Heading = "h2" }: { as?: "h1" | "h2" } = {}) {
  const { people, title } = useLeaders();
  const track = useRef<HTMLUListElement>(null);
  // What the slider can do, measured after the page is up. The server and the first
  // client render agree (nothing to scroll), and the arrows appear once there is.
  const [reach, setReach] = useState({ scrolls: false, canLeft: false, canRight: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const rtl = getComputedStyle(el).direction === "rtl";
      setReach({
        scrolls: max > 2,
        canLeft: rtl ? el.scrollLeft > -(max - 2) : el.scrollLeft > 2,
        canRight: rtl ? el.scrollLeft < -2 : el.scrollLeft < max - 2,
      });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [people.length]);

  const move = (dir: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section id="leadership" className="bg-off-white">
      <div className="container-page content-measure flex flex-col gap-10 py-16 sm:gap-14 sm:py-20 lg:gap-[4.5rem] lg:py-[6.75rem]">
        <div className="flex items-end justify-between gap-6">
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

          {reach.scrolls ? (
            <div className="flex shrink-0 gap-3">
              <Arrow dir="left" label="←" disabled={!reach.canLeft} onClick={() => move(-1)} />
              <Arrow dir="right" label="→" disabled={!reach.canRight} onClick={() => move(1)} />
            </div>
          ) : null}
        </div>

        <ul
          ref={track}
          className="m-0 flex list-none snap-x snap-mandatory gap-[1.875rem] overflow-x-auto p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>li:first-child]:ms-auto [&>li:last-child]:me-auto"
        >
          {people.map(({ member: m, index }, k) => (
            <motion.li
              key={m.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEW}
              transition={{ duration: 0.8, ease: EASE, delay: Math.min(k, 3) * 0.1 }}
              className={`group relative aspect-[299/463] w-[86%] shrink-0 snap-start overflow-hidden sm:aspect-[299/408] sm:w-[40%] xl:w-[28%] ${STILL}`}
            >
              <figure className="m-0 size-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary" tabIndex={0}>
                <LeaderPhoto
                  index={index}
                  name={m.name}
                  sizes="(min-width: 1280px) 29vw, (min-width: 640px) 41vw, 86vw"
                  className="absolute inset-0"
                />
                {/* Clipped away below the picture until it is pointed at or focused —
                    and always shown where there is nothing to point with. */}
                <figcaption
                  className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-[0.15rem] bg-white p-[1.4rem] ${SLIDE} translate-y-0 [@media(hover:hover)]:translate-y-full [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-hover:translate-y-0`}
                >
                  <strong className="text-[0.94rem] font-medium leading-6 text-heading">{m.name}</strong>
                  <span className="text-xs leading-[1.2rem] text-gray-muted">{m.role}</span>
                </figcaption>
              </figure>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
