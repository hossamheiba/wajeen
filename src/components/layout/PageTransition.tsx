"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Fades each page in as you navigate.
 *
 * There is deliberately no AnimatePresence here. It was used with
 * `mode="wait"` and an `exit` animation, which does not work under the App
 * Router: on navigation React replaces `children` in place with the incoming
 * page, so the child AnimatePresence is holding for its exit animation is no
 * longer the old page — it is already the new one. The new page therefore
 * animated *out* to opacity 0, the enter half never ran, and every
 * client-side navigation left a blank white page with the content present in
 * the DOM but invisible. (Verified against the pre-existing implementation:
 * the same thing happened there, so this is a long-standing bug rather than
 * something a recent change introduced.)
 *
 * Keying a plain motion.div on the pathname gives the same entrance without
 * the broken half: the key change remounts it, so `initial` runs again on
 * every navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // No fade on the very first load — the page should simply be there, rather
  // than sliding in as a whole. Captured once in a lazy initialiser: never
  // written again, so this component renders exactly once per navigation.
  const [entryPathname] = useState(pathname);
  const reduce = useReducedMotion() === true;

  return (
    <motion.div
      key={pathname}
      initial={reduce || pathname === entryPathname ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
