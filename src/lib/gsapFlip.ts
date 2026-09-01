"use client";

/**
 * Flip on its own, registered on import. Split out of `lib/gsap` so it is
 * fetched only by the route that animates a filtered grid — see the note
 * there.
 */

import gsap from "gsap";
import { Flip } from "gsap/Flip";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Flip);
}

export { Flip };
