"use client";

import { useEffect, useRef, useState } from "react";

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
      <div className="flex items-center gap-3 text-white">
        <svg width="40" height="35" fill="none" viewBox="0 0 43 37">
          <path
            fill="#FF801E"
            d="m29.856 0-19.11.005-.037.061L0 18.504v.002L10.754 37l21.5-.005L43 18.495 32.246 0h-2.39ZM9.896 18.503l5.8-9.985 11.603-.003 5.805 9.982-5.8 9.985-11.603.003-5.805-9.982Z"
          />
        </svg>
        <span className="text-sm font-bold tracking-[0.2em]">WJEEN & PARTNERS</span>
      </div>
      <div className="h-[2px] w-40 overflow-hidden bg-white/15">
        <div ref={fillRef} className="h-full w-0 bg-orange" />
      </div>
    </div>
  );
}
