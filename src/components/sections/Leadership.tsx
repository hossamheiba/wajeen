"use client";

/**
 * Leadership — an editorial masthead, not a slider.
 *
 * Each row is a portrait, a name and a role, and everything is visible at once
 * with nothing to navigate: hovering a row is the only interaction, in the
 * spirit of a printed masthead rather than a UI carousel.
 *
 * The portraits belong to the media library, bound at
 * `aboutPage.leadership.members[n]`, so the editor adds each one beside the
 * person's name in the studio. A person with no portrait yet — or whose file
 * cannot be loaded — gets the first letter of their name in the same frame, so
 * the rows stay the same height and the list never looks half-finished while
 * pictures arrive one at a time.
 */

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ContentImage } from "@/components/ui/ContentImage";
import { useCover } from "@/components/layout/MediaProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Member {
  name: string;
  role: string;
}

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

function Portrait({ index, name }: { index: number; name: string }) {
  const path = `leadership.members[${index}]`;
  const bound = useCover("aboutPage", path);

  return (
    <div
      // 4:5 is a portrait crop: taller than wide, so a head-and-shoulders photo
      // fills it without the face being cut at the top.
      className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-ui bg-primary/[0.06] ring-1 ring-black/5 transition-shadow duration-300 group-hover:ring-primary/30 sm:w-28"
    >
      {/* Always drawn, underneath: it is the whole portrait until a picture is
          bound, and it is what shows if that picture fails to load. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 grid select-none place-items-center text-3xl font-black text-primary/35 sm:text-5xl"
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
          sizes="(min-width: 640px) 112px, 80px"
          // `object-top`: the face is in the upper part of nearly every
          // portrait, so a crop that has to lose something loses the shoulders.
          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : null}
    </div>
  );
}

export function Leadership({ as: as_ = "h2" }: { as?: "h1" | "h2" } = {}) {
  const t = useTranslations("aboutPage.leadership");
  const reduce = useReducedMotion();

  // `t.raw` answers with the key itself when a namespace is missing, which the
  // studio's preview can genuinely send — so the shape is checked, not assumed.
  const raw = t.raw("members");
  const members: Member[] = Array.isArray(raw) ? (raw as Member[]) : [];

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

        {/* ---------------- masthead ---------------- */}
        <div className="mt-14 divide-y divide-black/5 overflow-hidden rounded-frame border border-black/5 bg-white">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: reduce ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0 : 0.5, delay: i * 0.07 }}
              className="group relative flex items-center gap-5 px-5 py-6 transition-colors duration-300 hover:bg-off-white sm:gap-8 sm:px-10 sm:py-8"
            >
              <span className="hidden w-8 shrink-0 font-mono text-xs font-bold tabular-nums text-gray-muted sm:block">
                {String(i + 1).padStart(2, "0")}
              </span>

              <Portrait index={i} name={m.name} />

              <div className="relative min-w-0 flex-1">
                <h3 className="t-h3 text-heading transition-colors duration-300 group-hover:text-primary">
                  {m.name}
                </h3>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-muted sm:text-sm">
                  {m.role}
                </div>
                <span className="mt-4 block h-0.5 w-12 bg-primary/25 transition-all duration-500 ltr:origin-left rtl:origin-right group-hover:w-24 group-hover:bg-primary" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
