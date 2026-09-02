/**
 * The one panel in the studio.
 *
 * Everything that sits on the off-white ground is this: white, one hairline
 * border, `rounded-ui`, and the site's brand-tinted card shadow. Having a
 * single surface is what stops a dashboard drifting into six different card
 * treatments — the same failure the site's Chip and Button were built to fix.
 */

import type { ElementType, ReactNode } from "react";

export function Surface({
  as: Tag = "div",
  padded = true,
  className = "",
  children,
}: {
  as?: ElementType;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`rounded-ui border border-black/[0.07] bg-white shadow-[var(--shadow-card)] ${
        padded ? "p-5" : ""
      } ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

/** A quiet heading above a group of rows. Not a page title. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-muted">
      {children}
    </h2>
  );
}
