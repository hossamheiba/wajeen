/**
 * The opening: the mark on white, then the curtain lifts.
 *
 * A server component with no React state and no framer — the whole thing is
 * two CSS keyframes. An intro is the first thing a visitor meets, so it must
 * not wait for hydration to start, and it must not spend main-thread time
 * while the page behind it is still doing real work.
 *
 * It runs on the home page only, and every time that page is entered. Nothing
 * remembers it, because being seen again is the point.
 *
 * Two things it deliberately does NOT do:
 *
 *   - it never blocks. `pointer-events: none` from the first frame, so a click
 *     or a tap during the intro reaches the page underneath rather than being
 *     swallowed.
 *   - it never argues with an accessibility preference. `prefers-reduced-motion`
 *     removes it outright in CSS, not by shortening it.
 *
 * `aria-hidden` keeps it out of the accessibility tree: it carries no
 * information a screen reader needs, and the page behind it is already there.
 */

import { Logo } from "@/components/ui/Logo";

export function SiteIntro() {
  return (
    <div id="site-intro" aria-hidden="true">
      <div className="site-intro-mark">
        {/* The navy mark on white — the logo as it is drawn everywhere else,
            rather than a reversed copy of it. */}
        <Logo variant="full" className="h-auto w-[min(62vw,340px)]" />
      </div>
    </div>
  );
}
