"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, SplitText } from "@/lib/gsap";

type SplitUnit = "chars" | "words" | "lines";
type SplitTag = "div" | "p" | "h1" | "h2" | "h3" | "span";

interface SplitRevealProps {
  children: ReactNode;
  as?: SplitTag;
  type?: SplitUnit;
  stagger?: number;
  delay?: number;
  className?: string;
  /** Animate immediately on mount instead of waiting for scroll */
  eager?: boolean;
}

function useSplitAnimation(
  ref: React.RefObject<HTMLElement | null>,
  type: SplitUnit,
  stagger: number,
  delay: number,
  eager: boolean
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const split = SplitText.create(el, {
        type,
        mask: type,
        autoSplit: true,
      });

      const targets =
        type === "chars" ? split.chars : type === "lines" ? split.lines : split.words;

      gsap.set(targets, { yPercent: 110, opacity: 0 });

      const anim = gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power4.out",
        stagger,
        delay,
        scrollTrigger: eager
          ? undefined
          : {
              trigger: el,
              start: "top 85%",
              once: true,
            },
      });

      return () => {
        anim.kill();
        split.revert();
      };
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, stagger, delay, eager]);
}

export function SplitReveal({
  children,
  as = "div",
  type = "words",
  stagger = 0.035,
  delay = 0,
  className,
  eager = false,
}: SplitRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  useSplitAnimation(ref, type, stagger, delay, eager);

  switch (as) {
    case "p":
      return (
        <p ref={ref as React.RefObject<HTMLParagraphElement | null>} className={className}>
          {children}
        </p>
      );
    case "h1":
      return (
        <h1 ref={ref as React.RefObject<HTMLHeadingElement | null>} className={className}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 ref={ref as React.RefObject<HTMLHeadingElement | null>} className={className}>
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 ref={ref as React.RefObject<HTMLHeadingElement | null>} className={className}>
          {children}
        </h3>
      );
    case "span":
      return (
        <span ref={ref as React.RefObject<HTMLSpanElement | null>} className={className}>
          {children}
        </span>
      );
    default:
      return (
        <div ref={ref as React.RefObject<HTMLDivElement | null>} className={className}>
          {children}
        </div>
      );
  }
}
