"use client";

/**
 * Shared scroll-reveal primitives — the same whileInView pattern Stats.tsx
 * already used, extracted so every "bare" section (no entrance animation)
 * can opt in without re-deriving the easing/timing/viewport values per file.
 * Text headings keep using SplitReveal (GSAP) — this covers everything else
 * (images, cards, grids).
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

interface FadeUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  /** Forwarded to the wrapper — for the rare case a block needs a forced
   * reading direction (e.g. a marquee track), independent of page dir. */
  dir?: "ltr" | "rtl";
}

/** Single block fading/sliding up as it enters the viewport. */
export function FadeUp({ children, className, delay = 0, y = 28, once = true, dir }: FadeUpProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} dir={dir}>{children}</div>;

  return (
    <motion.div
      className={className}
      dir={dir}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  once?: boolean;
}

/** Wraps a group of StaggerItem children, revealing them in sequence. */
export function StaggerContainer({
  children,
  className,
  stagger = 0.1,
  delay = 0,
  once = true,
}: StaggerContainerProps) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay } },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  y?: number;
}

/** One entry in a StaggerContainer. */
export function StaggerItem({ children, className, y = 24 }: StaggerItemProps) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce ? {} : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
