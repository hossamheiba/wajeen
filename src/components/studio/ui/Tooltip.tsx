"use client";

/**
 * A label for an icon that has lost its text.
 *
 * Only used by the collapsed sidebar, and deliberately not a hover-only
 * affordance: the trigger keeps its `aria-label`, so a screen reader and a
 * keyboard user get the name whether or not this ever appears. It shows on
 * focus as well as hover for the same reason.
 */

import { useState, type ReactNode } from "react";

export function Tooltip({
  label,
  disabled = false,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (disabled) return <>{children}</>;

  return (
    <span
      className="relative flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="presentation"
          className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 -translate-y-1/2 whitespace-nowrap rounded-ui bg-primary-deep px-2.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-lift)]"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
