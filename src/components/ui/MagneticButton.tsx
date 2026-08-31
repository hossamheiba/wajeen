"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { useReducedMotion } from "framer-motion";

interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline";
  className?: string;
}

export function MagneticButton({
  href,
  children,
  variant = "solid",
  className = "",
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  // The button keeps every interactive state; only the cursor-follow goes.
  const reduce = useReducedMotion() === true;

  const handleMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || reduce || window.matchMedia("(pointer: coarse)").matches) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(el, {
      x: x * 0.3,
      y: y * 0.3,
      scale: 1.04,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el || reduce) return;
    gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  };

  // Styling comes from Button so the two can never drift apart; this component
  // only adds the magnetic cursor-follow on top.
  const classes = buttonClasses({
    variant: variant === "solid" ? "solid" : "outlineOnDark",
    size: "lg",
    className,
  });

  // External protocols (mailto:, tel:, http...) shouldn't go through the
  // locale-aware router — a plain anchor keeps them untouched.
  const isExternal = /^(mailto:|tel:|https?:)/.test(href);

  if (isExternal) {
    return (
      <a
        ref={ref}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={classes}
    >
      {children}
    </Link>
  );
}
