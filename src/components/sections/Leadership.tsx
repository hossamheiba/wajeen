"use client";

/**
 * Leadership — the people, large, side by side.
 *
 * Each person is one tall portrait that fills its column, with softly rounded
 * corners, and the name and role set into the foot of the photograph. There is no frame, no
 * padding and no card around it: three portraits share the row with a gutter
 * between them, so the photographs are the section and nothing else is
 * competing for the width. Below `sm` they stack, one full-width portrait each.
 *
 * The portraits belong to the media library, bound at
 * `aboutPage.leadership.members[n]`, so the editor adds each one beside the
 * person's name in the studio. A person with no portrait yet — or whose file
 * cannot be loaded — gets the first letter of their name on the same surface,
 * so the columns stay the same height and the line-up never looks
 * half-finished while pictures arrive one at a time.
 *
 * The foot of every card carries a navy gradient whether or not there is a
 * photograph, because the name is white and has to stand on something dark:
 * over a picture it also seats a light shirt in the frame.
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
 * surface reads as a deliberate one and not as a missing image. Drawn with
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
 * One person: the photograph, and their name and role laid into its foot.
 *
 * All four corners share one small radius. The top ones used to be an arch;
 * on a portrait this wide that read as a dome and the owner asked for it to be
 * as quiet as the bottom. The photograph does not grow on hover: growing crops
 * a head that is already close to the crown.
 */
function Person({
  index,
  name,
  role,
  order,
}: {
  index: number;
  name: string;
  role: string;
  order: number;
}) {
  const path = `leadership.members[${index}]`;
  const bound = useCover("aboutPage", path);
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: reduce ? 0 : 0.6, delay: order * 0.12 }}
      // `aspect-[3/4]` is a portrait crop: taller than wide, so a
      // head-and-shoulders photo fills it with room above the head.
      className="group relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-primary/[0.05] shadow-[var(--shadow-card)] ring-1 ring-primary/10 transition-shadow duration-500 hover:shadow-[var(--shadow-card-hover,var(--shadow-card))] sm:aspect-[3/4]"
      style={LATTICE}
    >
      {/* Always drawn, underneath: it is the whole portrait until a picture
          is bound, and it is what shows if that picture fails to load. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 grid select-none place-items-center pb-24 text-7xl font-black text-primary/40 lg:text-8xl"
      >
        {initial(name)}
      </span>

      {bound ? (
        <ContentImage
          namespace="aboutPage"
          path={path}
          fallbackSrc={null}
          alt={name}
          preferAlt
          fill
          sizes="(min-width: 1024px) 460px, (min-width: 640px) 33vw, 100vw"
          // `object-top`: the face is in the upper part of nearly every
          // portrait, so a crop that has to lose something loses the
          // shoulders.
          className="object-cover object-top"
        />
      ) : null}

      {/* The brand's navy, rising from the foot: the name stands on it. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-primary via-primary/70 to-transparent"
      />

      {/* One pass of light on hover. Parked off to the start side at rest. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-full inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[1100ms] ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
      />

      <div className="absolute inset-x-0 bottom-0 p-6 text-center sm:p-4 lg:p-8">
        <h3 className="t-h3 text-white sm:!text-lg lg:!text-2xl xl:!text-[2rem]">{name}</h3>
        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 sm:tracking-[0.12em] lg:text-sm lg:tracking-[0.2em]">
          {role}
        </div>
        <span className="mx-auto mt-4 block h-0.5 w-12 bg-white/50 transition-all duration-500 group-hover:w-24 group-hover:bg-white" />
      </div>
    </motion.div>
  );
}

export function Leadership({ as: as_ = "h2" }: { as?: "h1" | "h2" } = {}) {
  const t = useTranslations("aboutPage.leadership");

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

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
          {people.map(({ member: m, index }, i) => (
            <Person key={m.name} index={index} name={m.name} role={m.role} order={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
