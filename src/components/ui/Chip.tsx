import type { ReactNode } from "react";

/**
 * The site's small labels. Before this there were twenty distinct chip
 * treatments across 139 rendered instances — the same ISO badge carried
 * `py-1.5` on the about page and `py-2` on the business page, and the two
 * chips that sit side by side on every project card differed by one font
 * weight for no reason anyone could name.
 *
 * Two families, deliberately kept apart:
 *
 * - `Chip` is a rectangular label (`rounded-ui`, like every other box on the
 *   site). It names a thing: a category, a contract value, a place, a
 *   certificate.
 * - `StatusPill` is fully rounded and carries a dot. It reports a *state* —
 *   "certified", "approved vendor". The round shape is what separates the two
 *   at a glance, so it is a decision rather than a leftover.
 *
 * Classes live in `chipClasses` as well as the component so a call site that
 * needs its own element (a `<button>` filter, an animated wrapper) gets the
 * identical surface without re-typing it.
 */

export type ChipTone =
  /** Brand fill. A category over a photo, or the selected filter. */
  | "solid"
  /** Over photography: frosted, so the picture still reads through it. */
  | "onDark"
  /** On a light card: the quiet counterpart to `solid`. */
  | "muted"
  /** On white: an outlined credential, e.g. an ISO certificate. */
  | "outline"
  /** Dense metadata — vendor numbers in the client wall. Use with size `xs`. */
  | "micro";

export type ChipSize = "xs" | "sm" | "md";

// Weight lives here rather than in BASE because `xs` types itself with the
// `t-eyebrow` scale class, and adding a font-weight utility on top of a type
// class is exactly the drift the type scale exists to prevent.
const SIZES: Record<ChipSize, string> = {
  // Dense metadata that sits inside another card — vendor numbers.
  xs: "px-2 py-0.5 t-eyebrow",
  // The dominant size: card metadata.
  sm: "px-3.5 py-1.5 text-xs font-bold",
  // Interactive filters, which need a real touch target.
  md: "px-5 py-2.5 text-sm font-bold",
};

const TONES: Record<ChipTone, string> = {
  solid: "border border-transparent bg-primary text-white",
  onDark: "border border-white/30 bg-white/10 text-white/90 backdrop-blur-md",
  muted: "border border-black/10 bg-off-white text-primary",
  outline: "border border-primary/20 bg-white text-primary",
  // Pair with size `xs`; `t-eyebrow` already supplies the caps and tracking.
  micro: "border border-primary/10 bg-primary/5 text-primary/80",
};

/** Lift is contextual, not a property of a tone: a chip over photography needs
 *  to separate from the image, the same chip on a flat panel does not. Passing
 *  it as a flag beats a `shadow-none` override, which loses to the tone's own
 *  utility — Tailwind orders box-shadow rules by its layer, not by the order
 *  they appear in the class string. */
const ELEVATED = "shadow-[var(--shadow-card)]";

// `border-transparent` on `solid` matches Button.tsx: without it a filled chip
// sitting next to an outlined one is 2px shorter for no visible reason.
const BASE =
  "inline-flex w-fit items-center gap-1.5 rounded-ui whitespace-nowrap";

export function chipClasses({
  tone = "solid",
  size = "sm",
  elevated = false,
  className = "",
}: {
  tone?: ChipTone;
  size?: ChipSize;
  /** Adds the card shadow. Use when the chip sits over a photograph. */
  elevated?: boolean;
  className?: string;
} = {}) {
  return `${BASE} ${SIZES[size]} ${TONES[tone]} ${elevated ? ELEVATED : ""} ${className}`
    .replace(/\s+/g, " ")
    .trim();
}

export function Chip({
  children,
  tone,
  size,
  elevated,
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  elevated?: boolean;
  className?: string;
}) {
  return (
    <span className={chipClasses({ tone, size, elevated, className })}>
      {children}
    </span>
  );
}

/**
 * A state marker: a dot and an uppercase label. `pulse` is for a live claim
 * ("certified, currently held"); a static dot suits a settled fact.
 */
export function StatusPill({
  children,
  dot = "brand",
  pulse = false,
  className = "",
}: {
  children: ReactNode;
  dot?: "brand" | "positive";
  pulse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur-md ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          dot === "positive" ? "bg-emerald-500" : "bg-primary"
        } ${pulse ? "animate-pulse motion-reduce:animate-none" : ""}`.trim()}
      />
      <span>{children}</span>
    </div>
  );
}
