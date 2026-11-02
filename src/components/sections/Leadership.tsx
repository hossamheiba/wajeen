"use client";

/**
 * Leadership — an editorial masthead, not a slider.
 *
 * The people stand side by side: a portrait in its arch, then a name and a
 * role beneath it, three to a row from the `sm` breakpoint up and one above the
 * other below it. Everything is visible at once with nothing to navigate:
 * hovering a person is the only interaction, in the spirit of a printed
 * masthead rather than a UI carousel. Hairlines between the columns are what
 * make three people read as one masthead and not as three cards.
 *
 * The portraits belong to the media library, bound at
 * `aboutPage.leadership.members[n]`, so the editor adds each one beside the
 * person's name in the studio. A person with no portrait yet — or whose file
 * cannot be loaded — gets the first letter of their name in the same frame, so
 * the columns stay the same height and the line-up never looks half-finished
 * while pictures arrive one at a time.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ContentImage } from "@/components/ui/ContentImage";
import { useCover } from "@/components/layout/MediaProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { shownLeaders, type LeaderRow } from "@/lib/leadershipRows";

/**
 * Honorifics that open a name without being part of it. The letter shown for a
 * person is the first of their *name*: "Eng. Ismail" is an I, and
 * "المهندس إسماعيل" an إ — not the E and the ا of the title, which is what
 * taking the first character of the string gave.
 */
const TITLE =
  /^(?:eng|mr|mrs|ms|miss|dr|prof|sheikh|sh)\.?\s+|^(?:المهندس|المهندسة|الأستاذ|الأستاذة|الاستاذ|الاستاذة|الدكتور|الدكتورة|الشيخ|السيد|السيدة)\s+/i;

function initial(name: string) {
  let rest = name.trim();
  // A name can carry more than one ("Dr. Eng. …"), so peel until none is left,
  // bounded so a pathological string can never loop.
  for (let guard = 0; guard < 4 && TITLE.test(rest); guard += 1) {
    rest = rest.replace(TITLE, "");
  }
  return rest[0] ?? "";
}

/**
 * A faint zigzag, for a frame with nothing in it yet.
 *
 * Rows of triangles, the pattern Najdi walls are painted with, so an empty
 * frame reads as a deliberate surface and not as a missing image. Drawn with
 * `color-mix` on the brand variable, the way the rest of the site tints it.
 */
const TINT = "color-mix(in srgb, var(--color-primary) 8%, transparent)";
const LATTICE = {
  backgroundImage: [
    `linear-gradient(135deg, ${TINT} 25%, transparent 25%)`,
    `linear-gradient(225deg, ${TINT} 25%, transparent 25%)`,
    `linear-gradient(315deg, ${TINT} 25%, transparent 25%)`,
    `linear-gradient(45deg, ${TINT} 25%, transparent 25%)`,
  ].join(", "),
  backgroundSize: "18px 18px",
  backgroundPosition: "9px 0, 9px 0, 0 0, 0 0",
} as const;

/**
 * The frame is an arch.
 *
 * A window head is the oldest shape a builder draws, and the one this country's
 * buildings are known by, so the portrait is set into one the way a person is
 * seen in a doorway. Three lines carry it:
 *
 *   - the photograph, clipped to the arch;
 *   - an outline that stands off from it, as a mount does in a gallery frame,
 *     so the picture sits inside a second, larger arch;
 *   - a diamond at the crown of that outline, where a keystone sits — the shape
 *     of the mark in the logo, and the stone that holds an arch up.
 *
 * On hover the outline opens a little wider and the keystone turns, and a band
 * of light crosses the photograph once. None of it is needed to read the page,
 * so none of it is announced and all of it stops for a reader who has asked
 * for reduced motion.
 *
 * The outline stands 12px off the photograph at the sides and 16px off it
 * above (16 and 20 when it opens), and the keystone is small. The numbers are
 * measured, not chosen by eye: a keystone is centred on the outline and its
 * white ring reaches about 8px either side of it. At 6px off all round, the
 * diamond overlapped the top of the photograph by a few pixels, which on a
 * portrait whose head reaches the crown of the arch covered part of the head.
 * The extra height is only above, where the head is; the sides stay at 12px so
 * the outline does not crowd the name beside it.
 * `tests/site/public.spec.ts` keeps a clear gap between keystone and photograph
 * at rest and on hover.
 *
 * The photograph does not grow on hover. Growing crops a head that is already
 * close to the crown, which is the thing the space above is there to prevent.
 *
 * The radii are written out per breakpoint rather than as `rounded-t-full` — the
 * photograph is 176px wide below `lg` (a top radius of 88) and 208px from `lg`
 * up (104), and the outline's is the photograph's plus its 12px offset: an
 * arch is a semicircle only when its top radius is exactly half its width, and
 * CSS scales *every* corner down by the same factor when two radii overrun a
 * side — so a large top radius would have flattened the small bottom ones too.
 */
function Portrait({ index, name }: { index: number; name: string }) {
  const path = `leadership.members[${index}]`;
  const bound = useCover("aboutPage", path);

  return (
    <div className="relative mx-auto w-44 shrink-0 lg:w-52">
      {/* The outline, standing off from the photograph. Its keystone is a child
          so it travels with the outline when that opens on hover. */}
      <span
        aria-hidden="true"
        data-portrait-outline
        className="pointer-events-none absolute -inset-3 -top-4 rounded-b-[32px] rounded-t-[100px] border border-primary/25 transition-all duration-500 ease-out group-hover:-inset-4 group-hover:-top-5 group-hover:rounded-b-[36px] group-hover:rounded-t-[104px] group-hover:border-primary/60 motion-reduce:transition-none lg:rounded-t-[116px] lg:group-hover:rounded-t-[120px]"
      >
        <span
          data-portrait-keystone
          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-primary ring-2 ring-white transition-all duration-500 ease-out group-hover:rotate-[225deg] group-hover:scale-125 group-hover:ring-off-white motion-reduce:transition-none"
        />
      </span>

      <div
        // 4:5 is a portrait crop: taller than wide, so a head-and-shoulders
        // photo fills the arch without the face reaching its curve.
        className="relative aspect-[4/5] overflow-hidden rounded-b-[18px] rounded-t-[88px] bg-primary/[0.05] shadow-[var(--shadow-card)] lg:rounded-t-[104px]"
        style={LATTICE}
      >
        {/* Always drawn, underneath: it is the whole portrait until a picture
            is bound, and it is what shows if that picture fails to load. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 grid select-none place-items-center pt-5 text-5xl font-black text-primary/45 lg:text-6xl"
        >
          {initial(name)}
        </span>

        {bound ? (
          <>
            <ContentImage
              namespace="aboutPage"
              path={path}
              fallbackSrc={null}
              alt={name}
              preferAlt
              fill
              sizes="(min-width: 1024px) 208px, 176px"
              // `object-top`: the face is in the upper part of nearly every
              // portrait, so a crop that has to lose something loses the
              // shoulders.
              className="object-cover object-top"
            />
            {/* The brand's navy, rising from the foot of the photograph: it
                seats the picture in the frame and keeps a light shirt from
                dissolving into a light page. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/35 via-primary/0 to-transparent"
            />
          </>
        ) : null}

        {/* One pass of light on hover. Parked off to the start side at rest. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-full inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-[1100ms] ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
        />
      </div>
    </div>
  );
}

export function Leadership({ as: as_ = "h2" }: { as?: "h1" | "h2" } = {}) {
  const t = useTranslations("aboutPage.leadership");
  const reduce = useReducedMotion();

  // `t.raw` answers with the key itself when a namespace is missing, which the
  // studio's preview can genuinely send — so the shape is checked, not assumed.
  // A row with no name is a person the editor has taken off the page.
  const people = shownLeaders<LeaderRow>(t.raw("members"));

  return (
    <section id="leadership" className="bg-white section-y">
      <div className="container-page content-measure">
        <div className="max-w-2xl">
          <SectionHeading
            eyebrow={t("tag")}
            title={t("title")}
            description={t("description")}
            as={as_}
          />
        </div>

        {/* ---------------- masthead ----------------
            The hairlines belong to the columns, not to the grid: a column in
            the second or third place of its row takes a line on its inline-start
            side (which flips by itself in Arabic), and a row after the first
            takes one above it. `divide-x` draws on every child but the last,
            which is wrong as soon as there are more than three people — the
            third of six would carry a line on the outer edge — and
            `divide-x-reverse`, added for Arabic, put every line on the wrong
            side. `tests/site/public.spec.ts` measures them. */}
        <div className="mt-14 grid grid-cols-1 overflow-hidden rounded-frame border border-black/5 bg-white sm:grid-cols-3">
          {people.map(({ member: m, index }, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.6, delay: i * 0.12 }}
              className="group relative flex flex-col items-center border-black/5 px-6 pb-12 pt-16 [&:not(:first-child)]:border-t sm:border-t-0 sm:[&:nth-child(n+4)]:border-t sm:[&:not(:nth-child(3n+1))]:border-s text-center transition-colors duration-300 hover:bg-off-white sm:px-8 lg:px-12 lg:pb-14 lg:pt-20"
            >
              <span className="absolute start-6 top-6 font-mono text-xs font-bold tabular-nums text-gray-muted">
                {String(i + 1).padStart(2, "0")}
              </span>

              <Portrait index={index} name={m.name} />

              <div className="relative mt-10 flex min-w-0 flex-1 flex-col items-center">
                <h3 className="t-h3 text-heading transition-colors duration-300 group-hover:text-primary">
                  {m.name}
                </h3>
                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-muted sm:text-sm">
                  {m.role}
                </div>
                {/* Pushed to the foot of the column, so the three rules sit on one
                    line even when one role wraps onto a second. */}
                <div className="mt-auto pt-6">
                  <span className="block h-0.5 w-12 bg-primary/25 transition-all duration-500 group-hover:w-24 group-hover:bg-primary" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
