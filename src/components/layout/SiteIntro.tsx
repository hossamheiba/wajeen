"use client";

/**
 * The opening: the mark on white, then the curtain lifts.
 *
 * One implementation for the whole site. It used to live on the home page
 * alone as a server component; it now sits in the site layout and plays on
 * every route and every navigation, for three seconds.
 *
 * `"use client"` buys exactly one thing: `usePathname`. The markup is still
 * server-rendered into the HTML of every page, so the curtain is painted on
 * the first frame rather than after hydration, and the animation is still two
 * CSS keyframes rather than a library — an intro must not spend main-thread
 * time while the page behind it is still doing real work.
 *
 * The pathname is the key, which is what makes it replay. Under the App Router
 * a layout is not remounted between pages, so a plain element here would
 * animate once on the first load and never again; re-keying it unmounts the
 * old node and mounts a new one, and a new node starts its CSS animation from
 * zero. The pathname is also the *only* thing it keys on, deliberately:
 *
 *   - it carries the locale (`/en/story`), so switching language replays it;
 *   - it carries no search string and no hash, so a filter, a tab or an
 *     in-page anchor does not;
 *   - the component holds no state of its own, so nothing re-rendering
 *     around it can start the curtain a second time.
 *
 * React commits the new pathname and the new page in the same pass, so the
 * curtain is already covering the frame the incoming page first paints in —
 * there is no flash of the destination before it.
 *
 * Two things it deliberately does NOT do:
 *
 *   - it never blocks. `pointer-events: none` from the first frame, so a click
 *     or a tap during the intro reaches the page underneath rather than being
 *     swallowed, and navigation stays possible while it plays.
 *   - it never argues with an accessibility preference. `prefers-reduced-motion`
 *     removes it outright in CSS, not by shortening it — so for anyone who
 *     asked for less motion, navigation is simply instant.
 *
 * `aria-hidden` keeps it out of the accessibility tree: it carries no
 * information a screen reader needs, and the page behind it is already there.
 */

import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

export function SiteIntro() {
  const pathname = usePathname();

  return (
    <div key={pathname} id="site-intro" aria-hidden="true">
      <div className="site-intro-mark">
        {/* The navy mark on white — the logo as it is drawn everywhere else,
            rather than a reversed copy of it. */}
        <Logo variant="full" className="h-auto w-[min(72vw,420px)]" />
      </div>
    </div>
  );
}
