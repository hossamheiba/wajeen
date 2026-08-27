"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { Link } from "@/i18n/navigation";

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

  const handleMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;

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
    if (!el) return;
    gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  };

  const base =
    "inline-flex items-center justify-center rounded-full px-9 py-4 text-sm font-semibold tracking-wide transition-shadow";
  const styles =
    variant === "solid"
      ? "bg-primary text-white shadow-[0_10px_25px_var(--color-primary-glow)] hover:shadow-[0_15px_35px_var(--color-primary-glow)]"
      : "border border-white/40 text-white";

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
        className={`${base} ${styles} ${className}`}
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
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}
