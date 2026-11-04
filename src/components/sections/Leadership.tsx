"use client";

/**
 * Leadership — the chairman above, the two who answer to him beneath, and power
 * flowing between them as the page is scrolled.
 *
 * Light and quiet at rest. The chairman stands alone in the middle, in a portrait
 * a little larger than the others'; the two beneath him are side by side and
 * balanced about the same centre. Photographs are modest in size, with a slight
 * radius, and nothing is written on one: the name and role sit below each, under a
 * divider.
 *
 * The motion is one story, told by the scroll. A portrait wakes as it comes into
 * view — it starts dim and grey and a little small, and as it rises it warms to
 * colour, grows to full size and is edged by a ring of light, while the picture
 * inside drifts a few pixels against the page like a view through a window. When
 * the chairman has woken, a line leaves his role and runs down, splitting in two
 * smooth curves: it is drawn by the scroll, a soft glow underneath it, a bright
 * lit head leading it, and a point of light riding the head. Each diamond it
 * reaches ignites — a ripple and a scatter of sparks — and when the line arrives at
 * the top of a portrait that portrait wakes in turn. Scroll back and it all
 * rewinds; scroll forward and it ignites again. On a phone, where the two stand one
 * beneath the other, the same line runs straight down between the portraits.
 *
 * Everything follows a spring on the scroll, not the scroll itself, so it moves
 * the way water does rather than the way a scrollbar does.
 *
 * Reduced motion is forced in CSS (`motion-reduce:`) rather than by branching on
 * the reduced-motion hook, which is unknown on the server — a branch there makes
 * the server's page and the first client render differ, and React then discards
 * the page and builds it again. A reader who asked for less sees every portrait
 * awake and every line drawn, and no moving light.
 *
 * Anyone beyond the first three continues in rows of two under the first two,
 * without a line of their own. The portraits belong to the media library, bound
 * at `aboutPage.leadership.members[n]` by the row's place in the list, so the
 * editor adds each one beside the person's name in the studio. The CMS never
 * deletes a row: an editor takes someone off the page by clearing their name, and
 * a row with no name is skipped here — keeping its stored position, so the people
 * after it still find their own portraits. The first person shown is the chairman.
 */

import { Fragment, useEffect, useId, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { LeaderPhoto, useLeaders } from "./leadership-shared";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: "-60px" } as const;
const STILL = "motion-reduce:opacity-100! motion-reduce:[transform:none]!";
/** What the scroll is smoothed with: a soft spring, so nothing ever snaps. */
const SPRING = { stiffness: 70, damping: 22, mass: 0.6 } as const;
const ZOOM =
  "absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none";

/** How much of a path the lit head covers. */
const HEAD = 0.15;
const INK = "rgba(15,21,95,0.55)";
const TRACK = "rgba(15,21,95,0.13)";
const GLOW = "#6f78ee";
const BLOOM = "#8f97ff";

/** The geometry, in a 320 × 176 box whose width is the distance between the two centres. */
const H = 176;
const STEM = "M160 0 V76";
const ARMS = ["M160 76 C160 130 0 130 0 176", "M160 76 C160 130 320 130 320 176"];
const SINGLE = `M160 0 V${H}`;

/** True while `v` is at or past `at` — and false again when scrolled back, so it can ignite twice. */
function useIgnited(v: MotionValue<number>, at: number) {
  const [on, setOn] = useState(false);
  useMotionValueEvent(v, "change", (x) => setOn(x >= at));
  return on;
}

/** A ripple and a scatter of sparks, centred on whatever it is placed in. */
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  return { x: Math.cos(a) * 34, y: Math.sin(a) * 34 };
});

function Burst({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      <motion.span
        initial={false}
        animate={on ? { scale: [0.5, 4.5], opacity: [0.9, 0] } : { scale: 0.5, opacity: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6f78ee]"
      />
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={
            on
              ? { x: [0, s.x], y: [0, s.y], opacity: [1, 0], scale: [1.2, 0.2] }
              : { x: 0, y: 0, opacity: 0, scale: 1 }
          }
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8f97ff] shadow-[0_0_6px_#6f78ee]"
        />
      ))}
    </span>
  );
}

/** A diamond that lights, and bursts, when the line reaches it. */
function Node({
  className,
  p,
  at,
  span = 0.1,
}: {
  className: string;
  p: MotionValue<number>;
  at: number;
  span?: number;
}) {
  const lit = useTransform(p, [at - span, at], [0, 1]);
  const scale = useTransform(lit, [0, 1], [0.2, 1]);
  const on = useIgnited(p, at);
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute z-10 h-2 w-2 ${className}`}>
      <motion.span
        style={{ opacity: lit, scale }}
        className={`absolute inset-0 rotate-45 bg-primary shadow-[0_0_12px_rgba(111,120,238,0.9)] ${STILL}`}
      />
      <Burst on={on} />
    </span>
  );
}

/** The point of light that rides the head of a drawn path. */
function Orb({ d, drawn }: { d: string; drawn: MotionValue<number> }) {
  const ref = useRef<SVGPathElement>(null);
  const cx = useMotionValue(-50);
  const cy = useMotionValue(-50);
  const opacity = useTransform(drawn, [0, 0.03, 0.94, 1], [0, 1, 1, 0]);

  const place = (v: number) => {
    const path = ref.current;
    if (!path) return;
    const point = path.getPointAtLength(path.getTotalLength() * v);
    cx.set(point.x);
    cy.set(point.y);
  };
  useMotionValueEvent(drawn, "change", place);
  useEffect(() => place(drawn.get()));

  return (
    <>
      <path ref={ref} d={d} fill="none" stroke="none" />
      <motion.circle
        cx={cx}
        cy={cy}
        r={11}
        fill="rgba(111,120,238,0.34)"
        style={{ opacity }}
        className="[filter:blur(5px)] motion-reduce:hidden"
        data-orb
      />
      <motion.circle
        cx={cx}
        cy={cy}
        r={3.4}
        fill="#ffffff"
        style={{ opacity }}
        className="[filter:drop-shadow(0_0_6px_#6f78ee)_drop-shadow(0_0_14px_#8f97ff)] motion-reduce:hidden"
        data-orb
      />
    </>
  );
}

function Beam({
  d,
  drawn,
  tag,
  gradient,
}: {
  d: string;
  drawn: MotionValue<number>;
  tag: string;
  gradient: string;
}) {
  const head = useTransform(drawn, (v) => v * (1 + HEAD) - HEAD);
  const whole = "motion-reduce:[stroke-dasharray:none]! motion-reduce:[stroke-dashoffset:0]!";
  return (
    <>
      <path d={d} fill="none" stroke={TRACK} strokeWidth="1.25" />
      {/* the glow it lays down */}
      <motion.path
        d={d}
        fill="none"
        stroke={GLOW}
        strokeWidth="9"
        strokeLinecap="round"
        style={{ pathLength: drawn, opacity: 0.2 }}
        className={`[filter:blur(5px)] ${whole}`}
      />
      {/* the line itself */}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        data-thread={tag}
        style={{ pathLength: drawn }}
        className={whole}
      />
      {/* its lit head: a halo with a bright core */}
      <motion.path
        d={d}
        fill="none"
        stroke={BLOOM}
        strokeWidth="6"
        strokeLinecap="round"
        data-head
        style={{ pathLength: HEAD, pathOffset: head }}
        className="[filter:drop-shadow(0_0_8px_#6f78ee)] motion-reduce:hidden"
      />
      <motion.path
        d={d}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        data-head
        style={{ pathLength: HEAD * 0.7, pathOffset: head }}
        className="motion-reduce:hidden"
      />
      <Orb d={d} drawn={drawn} />
    </>
  );
}

/** The line from the chairman to the two beneath him, drawn by the scroll. */
function Thread({ arms }: { arms: 1 | 2 }) {
  const ref = useRef<HTMLDivElement>(null);
  const gradient = useId().replace(/:/g, "");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.88", "end 0.42"] });
  const p = useSpring(scrollYProgress, SPRING);

  const stem = useTransform(p, [0, 0.32], [0, 1]);
  const fan = useTransform(p, [0.3, 1], [0, 1]);
  const single = useTransform(p, [0, 1], [0, 1]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-leadership-thread
      className="relative mt-6 hidden h-44 w-[20rem] sm:block"
    >
      <svg viewBox={`0 0 320 ${H}`} className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
            <stop offset="0" stopColor={INK} />
            <stop offset="0.45" stopColor="#4f58df" />
            <stop offset="1" stopColor={BLOOM} />
          </linearGradient>
        </defs>
        {arms === 2 ? (
          <>
            <Beam d={STEM} drawn={stem} tag="stem" gradient={gradient} />
            <Beam d={ARMS[0]} drawn={fan} tag="arm" gradient={gradient} />
            <Beam d={ARMS[1]} drawn={fan} tag="arm" gradient={gradient} />
          </>
        ) : (
          <Beam d={SINGLE} drawn={single} tag="stem" gradient={gradient} />
        )}
      </svg>
      <Node p={p} at={0.04} className="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" />
      {arms === 2 ? (
        <>
          <Node p={p} at={0.32} className="left-1/2 top-[76px] -translate-x-1/2 -translate-y-1/2" />
          <Node p={p} at={0.97} span={0.06} className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Node p={p} at={0.97} span={0.06} className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        </>
      ) : (
        <Node p={p} at={0.97} span={0.06} className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
      )}
    </div>
  );
}

/** The same line on a phone, between two portraits that stand one above the other. */
function Rise() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "end 0.55"] });
  const p = useSpring(scrollYProgress, SPRING);
  const scaleY = useTransform(p, [0, 1], [0, 1]);
  const head = useTransform(p, [0, 1], ["-25%", "100%"]);
  const orb = useTransform(p, [0, 0.04, 0.95, 1], [0, 1, 1, 0]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-leadership-rise
      className="relative my-3 h-20 w-px bg-primary/13 sm:hidden"
    >
      <motion.span
        style={{ scaleY }}
        className="absolute inset-0 origin-top bg-gradient-to-b from-primary/60 to-[#6f78ee] [filter:drop-shadow(0_0_5px_rgba(111,120,238,0.6))] motion-reduce:[transform:none]!"
      />
      <motion.span
        style={{ top: head }}
        className="absolute -left-px h-8 w-[3px] rounded-full bg-gradient-to-b from-transparent to-[#8f97ff] [filter:drop-shadow(0_0_8px_#6f78ee)] motion-reduce:hidden"
      />
      <motion.span
        style={{ top: head, opacity: orb }}
        className="absolute -left-[3px] z-10 size-[7px] -translate-y-1/2 rounded-full bg-white [box-shadow:0_0_8px_#6f78ee,0_0_16px_#8f97ff] motion-reduce:hidden"
      />
      <Node p={p} at={0.97} span={0.06} className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
    </div>
  );
}

/**
 * One portrait. It wakes as it rises into view, and its picture drifts against the page.
 * `size` gives the frame its height; the frame inside is what scales and greys.
 */
function Portrait({
  index,
  name,
  sizes,
  size,
  wake,
}: {
  index: number;
  name: string;
  sizes: string;
  size: string;
  /** Where in the viewport it wakes: from where its top edge enters to where it is fully awake. */
  wake: readonly [number, number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: rising } = useScroll({ target: ref, offset: [`start ${wake[0]}`, `start ${wake[1]}`] });
  const { scrollYProgress: passing } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const awake = useSpring(rising, SPRING);

  const scale = useTransform(awake, [0, 1], [0.93, 1]);
  const filter = useTransform(awake, (v) => `grayscale(${(1 - v) * 0.9}) brightness(${0.88 + 0.12 * v})`);
  const ring = useTransform(awake, [0, 0.55, 1], [0, 1, 0.4]);
  const drift = useTransform(passing, [0, 1], [14, -14]);

  return (
    <div ref={ref} className={`relative ${size}`}>
      <motion.div
        style={{ scale, filter }}
        className="absolute inset-0 overflow-hidden rounded-lg shadow-[var(--shadow-lift)] ring-1 ring-black/5 motion-reduce:[filter:none]! motion-reduce:[transform:none]!"
      >
        <motion.div style={{ y: drift, scale: 1.1 }} className="absolute inset-0 motion-reduce:[transform:none]!">
          <LeaderPhoto index={index} name={name} sizes={sizes} className={ZOOM} />
        </motion.div>
      </motion.div>
      <motion.span
        aria-hidden="true"
        style={{ opacity: ring }}
        className="pointer-events-none absolute -inset-1 rounded-[0.8rem] border border-[#6f78ee]/70 shadow-[0_0_30px_rgba(111,120,238,0.55)] motion-reduce:hidden"
      />
    </div>
  );
}

function Caption({ name, role, big }: { name: string; role: string; big?: boolean }) {
  return (
    // Wider than the photograph, so a full name keeps to one line.
    <figcaption className={`mt-8 text-center ${big ? "-mx-4 sm:-mx-10" : "-mx-2 sm:-mx-8"}`}>
      <div className="relative mx-auto h-px w-full max-w-[14rem] bg-black/12" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-primary" />
      </div>
      <h3 className={`mt-5 font-bold leading-snug text-heading ${big ? "text-xl" : "text-base"}`}>{name}</h3>
      <p className="mt-2 text-xs font-semibold text-gray-muted ltr:uppercase ltr:tracking-[0.16em] rtl:text-sm">
        {role}
      </p>
    </figcaption>
  );
}

export function Leadership({ as: Heading = "h2" }: { as?: "h1" | "h2" } = {}) {
  const { people, tag, title, description } = useLeaders();
  const [chair, ...rest] = people;

  return (
    <section id="leadership" className="bg-off-white section-y">
      <div className="container-page content-measure">
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary/40" />
            <p className="text-xs font-semibold text-primary ltr:uppercase ltr:tracking-[0.28em] rtl:text-sm">
              {tag}
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary/40" />
          </div>
          <Heading className="mt-5 text-4xl font-black leading-[1.15] text-heading sm:text-5xl lg:text-6xl">
            {title}
          </Heading>
          <p className="mt-6 leading-8 text-gray-muted">{description}</p>
        </header>

        {chair ? (
          <div className="mt-14 flex flex-col items-center sm:mt-20">
            <motion.figure
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEW}
              transition={{ duration: 0.9, ease: EASE }}
              className={`group m-0 w-full max-w-[19rem] ${STILL}`}
            >
              <Portrait
                index={chair.index}
                name={chair.member.name}
                sizes="(min-width: 640px) 19rem, 90vw"
                size="h-[23rem] sm:h-[26rem] lg:h-[28rem]"
                wake={[0.96, 0.5]}
              />
              <Caption name={chair.member.name} role={chair.member.role} big />
            </motion.figure>

            {rest.length > 0 ? (
              <>
                <Thread arms={rest.length > 1 ? 2 : 1} />
                <Rise />
                {/* Two to a row, however wide the page: 2 × 15rem and the 5rem between them. */}
                <div className="flex w-full flex-col items-center sm:max-w-[35rem] sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-20 sm:gap-y-16">
                  {rest.map(({ member: m, index }, k) => (
                    <Fragment key={m.name}>
                      {k > 0 ? <Rise /> : null}
                      <motion.figure
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={VIEW}
                        transition={{ duration: 0.9, ease: EASE, delay: (k % 2) * 0.14 }}
                        className={`group m-0 w-full max-w-[17rem] sm:w-[15rem] sm:max-w-none ${STILL}`}
                      >
                        <Portrait
                          index={index}
                          name={m.name}
                          sizes="(min-width: 640px) 15rem, 90vw"
                          size="h-[21rem] sm:h-[19rem] lg:h-[20rem]"
                          wake={[0.62, 0.44]}
                        />
                        <Caption name={m.name} role={m.role} />
                      </motion.figure>
                    </Fragment>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
