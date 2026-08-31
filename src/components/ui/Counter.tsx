"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useReducedMotion } from "framer-motion";

interface CounterProps {
  target: number;
  suffix?: string;
  /** Stats' cards sit on white, so the default reads fine there; sections on
   * a dark/primary background need to override this or the suffix disappears
   * against it. */
  suffixClassName?: string;
}

export function Counter({ target, suffix = "", suffixClassName = "text-primary" }: CounterProps) {
  // toLocaleString() with no argument follows the *browser's* locale, so two
  // visitors on the same Arabic page could see "70,000" and "٧٠٬٠٠٠". Pin it
  // to the page's locale so the number reads the same for everyone.
  const locale = useLocale();
  const reduce = useReducedMotion() === true;
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;

            // Reduced motion: land on the number instead of counting to it.
            // Done here rather than during render so the first client render
            // still matches the server's (both 0) and hydration stays clean.
            if (reduce) {
              setValue(target);
              return;
            }
            const duration = 2000;
            const startTime = performance.now();

            const tick = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(target * eased));
              if (progress < 1) requestAnimationFrame(tick);
              else setValue(target);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, reduce]);

  return (
    <span ref={ref}>
      {value.toLocaleString(locale)}
      <span className={suffixClassName}>{suffix}</span>
    </span>
  );
}
