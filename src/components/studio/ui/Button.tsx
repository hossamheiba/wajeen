/**
 * The studio's button.
 *
 * Not the site's `Button`: that one is sized for a marketing page (`px-9 py-4`
 * on a hero CTA) and routes through next-intl's `Link`. A dashboard needs
 * compact, dense actions. What it does share is the brand — the same navy, the
 * same `rounded-ui`, the same focus treatment — so the two read as one product
 * without pretending to be one component.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type StudioButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type StudioButtonSize = "sm" | "md";

const SIZES: Record<StudioButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

const VARIANTS: Record<StudioButtonVariant, string> = {
  primary:
    "bg-primary text-white border border-transparent hover:bg-primary-hover shadow-[var(--shadow-badge)] hover:shadow-[var(--shadow-lift)]",
  // The transparent border on the filled variants keeps a row of mixed
  // buttons on one baseline; without it the outlined ones sit 2px taller.
  secondary:
    "bg-white text-heading border border-black/10 hover:border-primary/40 hover:bg-primary/[0.03]",
  ghost: "bg-transparent text-gray-muted border border-transparent hover:bg-black/[0.04] hover:text-heading",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50 hover:border-red-300",
};

const BASE =
  "inline-flex items-center justify-center rounded-ui font-semibold tracking-wide transition-[background-color,border-color,box-shadow,color] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-off-white " +
  "disabled:pointer-events-none disabled:opacity-45";

export function studioButtonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: StudioButtonVariant;
  size?: StudioButtonSize;
  className?: string;
} = {}) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`.trim();
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: StudioButtonVariant;
  size?: StudioButtonSize;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ...rest
}: Props) {
  return (
    <button type={type} className={studioButtonClasses({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}
