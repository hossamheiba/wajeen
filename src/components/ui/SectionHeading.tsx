import type { ReactNode } from "react";
import { SplitReveal } from "@/components/ui/SplitReveal";

/**
 * The eyebrow + heading pair that opens almost every section on the site. It
 * was copy-pasted 23 times with small unexplained drifts — font-semibold here,
 * font-bold there; text-3xl lg:text-4xl mostly, font-black occasionally — so
 * this owns the canonical combination and the drifts become props.
 *
 * Deliberately small: eyebrow, heading, description, alignment, tone. Anything
 * a section needs beyond that (a side-by-side "view all" link, a counter, a
 * custom layout) composes *around* this rather than being absorbed into it.
 *
 * RTL/LTR comes free — nothing here is direction-aware. `align="start"` uses
 * text-start, which follows the document direction, and the centred variant is
 * symmetric.
 */

type Tone = "light" | "dark";
type Align = "start" | "center";

interface SectionHeadingProps {
  /** Small uppercase label above the heading. */
  eyebrow?: string;
  title: string;
  /** Supporting line under the heading. */
  description?: string;
  /** Heading level — h2 by default; a page's single h1 comes from PageHeader. */
  as?: "h1" | "h2" | "h3";
  /** `feature` is the larger closing/opening statement size (CTA banners). */
  size?: "default" | "feature";
  align?: Align;
  /** `dark` = sitting on the brand navy or a photo. */
  tone?: Tone;
  className?: string;
  /** Rendered directly under the description, inside the same measure. */
  children?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  as = "h2",
  size = "default",
  align = "start",
  tone = "light",
  className = "",
  children,
}: SectionHeadingProps) {
  const centred = align === "center";

  const eyebrowTone = tone === "dark" ? "text-white/70" : "text-primary";
  const titleTone = tone === "dark" ? "text-white" : "text-heading";
  const descTone = tone === "dark" ? "text-white/70" : "text-gray-muted";

  return (
    <div
      className={`${centred ? "text-center" : "text-start"} ${className}`.trim()}
    >
      {eyebrow && <div className={`t-eyebrow ${eyebrowTone}`}>{eyebrow}</div>}

      <SplitReveal
        as={as}
        type="words"
        className={`${size === "feature" ? "t-h2-feature" : "t-h2"} ${titleTone} ${
          eyebrow ? "mt-2" : ""
        }`.trim()}
      >
        {title}
      </SplitReveal>

      {description && (
        <p
          className={`t-small mt-4 max-w-2xl ${descTone} ${centred ? "mx-auto" : ""}`.trim()}
        >
          {description}
        </p>
      )}

      {children}
    </div>
  );
}
