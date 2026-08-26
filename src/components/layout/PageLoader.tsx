"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";

export function PageLoader() {
  const fillRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        fill.style.width = "100%";
        clearInterval(interval);
        setTimeout(() => setLoaded(true), 250);
      } else {
        fill.style.width = `${progress}%`;
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-6 bg-dark-green transition-opacity duration-700 ${
        loaded ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Logo onDark className="h-8 w-auto" />
      <div className="h-[2px] w-40 overflow-hidden bg-white/15">
        <div ref={fillRef} className="h-full w-0 bg-orange" />
      </div>
    </div>
  );
}
