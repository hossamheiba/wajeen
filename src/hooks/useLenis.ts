"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Owns the single Lenis instance and returns a ref to it.
 *
 * The ref exists only so the mobile menu can lock background scrolling with
 * `lenis.stop()`, which is the one thing that actually works: Lenis calls
 * preventDefault() on wheel/touch while stopped, whereas `overflow: hidden`
 * on the document fights Lenis for the scroll position and shifts the layout
 * when the scrollbar disappears. (Lenis' `prevent` and `virtualScroll` options
 * both bail out *before* preventDefault, so they let native scrolling through
 * — they are for nested scrollers, not for locking.)
 *
 * The effect body below is unchanged from the audited version: one instance,
 * one ticker callback added and removed by the same reference, destroyed on
 * unmount. Publishing the ref is additive.
 */
export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Lenis' own rAF loop stays off (`autoRaf` defaults to false) — GSAP's
    // ticker drives it below, so Lenis and ScrollTrigger share one loop.
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    // gsap.ticker.remove() matches by reference, so the callback has to be the
    // same function object that was added. This previously added an inline
    // arrow and removed `lenis.raf` — a different function — so remove() was a
    // no-op: every mount left a live ticker callback driving a destroyed Lenis
    // instance, one more per client-side navigation, for the life of the tab.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      // Unhook from the ticker *before* destroying, so the loop can never call
      // raf() on a torn-down instance in the frame the cleanup lands on.
      gsap.ticker.remove(raf);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}
