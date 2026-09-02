/**
 * Small state labels.
 *
 * Two shapes, mirroring the site's own split: a rectangle names a thing, a
 * pill with a dot reports a state. Keeping that distinction here means a
 * "Draft" badge cannot be mistaken for a category at a glance.
 */

import type { ReactNode } from "react";

export type BadgeTone = "draft" | "live" | "neutral" | "warning" | "danger" | "brand";

const TONES: Record<BadgeTone, string> = {
  draft: "bg-primary/[0.08] text-primary",
  live: "bg-emerald-500/10 text-emerald-700",
  neutral: "bg-black/[0.05] text-gray-muted",
  warning: "bg-amber-500/12 text-amber-800",
  danger: "bg-red-500/10 text-red-700",
  brand: "bg-primary text-white",
};

const DOTS: Record<BadgeTone, string> = {
  draft: "bg-primary",
  live: "bg-emerald-600",
  neutral: "bg-gray-muted",
  warning: "bg-amber-600",
  danger: "bg-red-600",
  brand: "bg-white",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-ui px-2 py-0.5 text-[11px] font-bold tracking-wide ${TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />
      {children}
    </span>
  );
}
