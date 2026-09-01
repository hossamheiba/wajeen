"use client";

/**
 * GSAP plus the plugins the whole site uses.
 *
 * Flip is deliberately NOT here. It is used by one component on one route, but
 * registering it alongside the rest meant every page that touched a heading
 * reveal or the scroll driver also downloaded it — Lighthouse's treemap showed
 * a ~30KB chunk that was 99% unused on the homepage. It lives in `gsapFlip`
 * instead, so only the projects grid pays for it.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };
