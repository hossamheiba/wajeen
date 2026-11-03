"use client";

/**
 * What both leadership designs draw the same way: the photograph of one person
 * and the list of who is shown.
 *
 * Neither design ever puts text on a photograph — the owner asked for the name
 * to sit apart from the picture, with a divider between — so a photograph here
 * is only a photograph, and falls back to the first letter of the name on the
 * site's zigzag surface when none is bound yet or the file cannot be loaded.
 */

import { useTranslations } from "next-intl";
import { ContentImage } from "@/components/ui/ContentImage";
import { useCover } from "@/components/layout/MediaProvider";
import { shownLeaders, type LeaderRow, type ShownLeader } from "@/lib/leadershipRows";
import { LATTICE, initial } from "@/lib/leadershipDisplay";

export function useLeaders(): {
  people: ShownLeader<LeaderRow>[];
  tag: string;
  title: string;
  description: string;
} {
  const t = useTranslations("aboutPage.leadership");
  return {
    people: shownLeaders<LeaderRow>(t.raw("members")),
    tag: t("tag"),
    title: t("title"),
    description: t("description"),
  };
}

export function LeaderPhoto({
  index,
  name,
  sizes,
  className = "",
}: {
  index: number;
  name: string;
  sizes: string;
  /** Sizing and shape, from the design that uses it. Must make this `relative`. */
  className?: string;
}) {
  const path = `leadership.members[${index}]`;
  const bound = useCover("aboutPage", path);

  return (
    <div className={`overflow-hidden bg-white ${className}`} style={LATTICE}>
      <span
        aria-hidden="true"
        className="absolute inset-0 grid select-none place-items-center text-7xl font-black text-primary/35"
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
          sizes={sizes}
          // `object-top`: the face is in the upper part of nearly every
          // portrait, so a crop that has to lose something loses the shoulders.
          className="object-cover object-top"
        />
      ) : null}
    </div>
  );
}
