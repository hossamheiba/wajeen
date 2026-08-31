"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
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
  eager: boolean,
  reduce: boolean
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: do not split at all. Every heading on the site passes
    // through here, and the animation works by hiding the text
    // (`opacity: 0`) before revealing it — so merely cancelling the tween, or
    // killing the animation from CSS, would leave the whole site's headings
    // permanently invisible. Skipping the split entirely leaves the markup
    // exactly as authored: visible, in place, with no work done.
    if (reduce) return;

    const ctx = gsap.context(() => {
      // Always mask by "lines" (even when animating chars/words) — masking by
      // the smaller unit clips descenders (g, y, j, p) because GSAP sizes the
      // mask box to that unit's own bounding box, not the full line height.
      const split = SplitText.create(el, {
        type: type === "lines" ? "lines" : `lines, ${type}`,
        mask: "lines",
        // Without an explicit class GSAP leaves the generated elements
        // unclassed, so the `.split-line` rule in globals.css never matched.
        // Naming the lines also names the mask wrapper (`split-line-mask`),
        // which is what gives descenders room to render — see globals.css.
        linesClass: "split-line",
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
  }, [type, stagger, delay, eager, reduce]);
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
  // `useReducedMotion` returns null before hydration; treat that as "animate",
  // which matches the server-rendered markup.
  const reduce = useReducedMotion() === true;
  useSplitAnimation(ref, type, stagger, delay, eager, reduce);

  switch (as) {
    case "p":
      // SplitText names the element it splits with `aria-label` and hides the
      // generated line spans, so the text is still announced once rather than
      // fragment by fragment. That is valid on a heading, which takes a name —
      // but `aria-label` is prohibited on a paragraph, so here the split runs
      // on an inner element and the paragraph carries a readable copy instead.
      return (
        <p className={className}>
          <span className="sr-only">{children}</span>
          <span
            ref={ref as React.RefObject<HTMLSpanElement | null>}
            aria-hidden="true"
            className="block"
          >
            {children}
          </span>
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
