"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useReducedMotion } from "framer-motion";

interface CounterProps {
  /**
   * The figure, and anything the editor typed after it.
   *
   * `230` counts up to 230. `"17+"` counts to 17 and keeps the `+`, which is
   * how a sign is written now that the separate suffix field is gone: it is
   * part of the number an editor types, not a second box to remember. No
   * section carries a separate suffix field any more.
   */
  target: number | string;
  /** Stats' cards sit on white, so the default reads fine there; sections on
   * a dark/primary background need to override this or the sign after the
   * number disappears against it. */
  suffixClassName?: string;
}

export function Counter({ target, suffixClassName = "text-primary" }: CounterProps) {
  // Split "17+" into the 17 that animates and the + that does not. A plain
  // number arrives here unchanged, and something with no digits at all counts
  // from nothing rather than to NaN.
  const written = String(target ?? "").trim();
  const digits = written.match(/-?[\d.]+/)?.[0] ?? "";
  const numeric = digits ? Number(digits) : 0;
  const tail = digits ? written.slice(written.indexOf(digits) + digits.length).trim() : written;
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
              setValue(numeric);
              return;
            }
            const duration = 2000;
            const startTime = performance.now();

            const tick = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(numeric * eased));
              if (progress < 1) requestAnimationFrame(tick);
              else setValue(numeric);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [numeric, reduce]);

  return (
    <span ref={ref}>
      {digits ? value.toLocaleString(locale) : null}
      {tail ? <span className={suffixClassName}>{tail}</span> : null}
    </span>
  );
}
