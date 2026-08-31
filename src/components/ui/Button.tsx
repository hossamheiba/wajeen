import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * The site's one button. Before this there were six call-to-action styles;
 * four of them shared the *same* semantic role (a solid primary CTA) and
 * differed only in height and font weight, which is what made the pages read
 * as separately designed.
 *
 * Styling lives in `buttonClasses` rather than only in the component so
 * MagneticButton — which adds a GSAP cursor-follow effect — can render the
 * same surface without duplicating it or losing its animation.
 *
 * Variants are deliberately few. `outline` and `outlineOnDark` are separate
 * because they are not the same button on different backgrounds: one draws in
 * brand navy and fills on hover, the other draws in white over photography.
 */

export type ButtonVariant = "solid" | "outline" | "outlineOnDark";
export type ButtonSize = "sm" | "md" | "lg";

const SIZES: Record<ButtonSize, string> = {
  // Compact, for a CTA sitting inside a row of content.
  sm: "px-6 py-2.5 text-sm",
  // The default for a section-level CTA.
  md: "px-7 py-3.5 text-sm",
  // Hero and form submit — the page's single most important action.
  lg: "px-9 py-4 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  // The transparent border is load-bearing: the outline variants carry a 1px
  // border, so without a matching one here a solid button sitting next to an
  // outline button in the same row would be 2px shorter for no visible reason.
  solid:
    "border border-transparent bg-primary text-white shadow-[var(--shadow-badge)] hover:bg-primary-hover hover:shadow-[var(--shadow-lift)]",
  outline:
    "border border-primary text-primary hover:bg-primary hover:text-white",
  outlineOnDark:
    "border border-white/40 text-white hover:border-white hover:bg-white/10",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-ui font-semibold tracking-wide transition-all duration-300 disabled:pointer-events-none disabled:opacity-60";

export function buttonClasses({
  variant = "solid",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`.trim();
}

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type ButtonProps = CommonProps & {
  /** Internal route, or an external/protocol URL. Omit for a real button. */
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  /** For links that leave the site. `rel` is filled in automatically. */
  target?: "_blank";
  "aria-label"?: string;
};

/** Protocol links must not go through the locale-aware router. */
const isExternal = (href: string) => /^(mailto:|tel:|https?:)/.test(href);

export function Button({
  children,
  href,
  type = "button",
  disabled,
  onClick,
  target,
  variant,
  size,
  className,
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, className });

  if (href) {
    // Opening in a new tab without `noopener` hands the new page a reference
    // back to this one, so the two travel together.
    const external = target === "_blank" ? { target, rel: "noopener noreferrer" } : {};
    return isExternal(href) ? (
      <a href={href} className={classes} {...external} {...rest}>
        {children}
      </a>
    ) : (
      <Link href={href} className={classes} {...external} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes} {...rest}>
      {children}
    </button>
  );
}
