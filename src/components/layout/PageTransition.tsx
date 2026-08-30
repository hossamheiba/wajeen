"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Skip the page-transition fade on the very first load (no "the whole
  // page slides in" moment), but only via this motion.div's own `initial`
  // — not AnimatePresence's `initial={false}`, which cascades through
  // context to every nested motion component and silently disables their
  // whileInView scroll reveals on first load too (Stats' cards, and every
  // section's entrance animation, never fire on a fresh visit otherwise).
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={isFirstRender.current ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
