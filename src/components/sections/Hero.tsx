"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import heroBg from "../../../public/images/hero_bg.jpg";

export function Hero() {
  const t = useTranslations("hero");
  const slides = t.raw("slides") as { line1: string; highlight: string; line2: string }[];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section id="hero" className="relative flex h-screen min-h-[720px] w-full items-end overflow-hidden bg-primary">
      <div className="absolute inset-0">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-28 pt-40 lg:px-10">
        <div className="relative min-h-[9rem] sm:min-h-[11rem]">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-all duration-700 ${
                i === active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
              }`}
            >
              <h1 className="text-5xl font-extrabold leading-[1.05] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
                {slide.line1}{" "}
                <span className="text-white underline decoration-white/40 underline-offset-8">
                  {slide.highlight}
                </span>
              </h1>
              <h2 className="mt-1 text-4xl font-extrabold leading-[1.05] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
                {slide.line2}
              </h2>
            </div>
          ))}
        </div>

        <SplitReveal
          as="p"
          type="words"
          className="mt-8 max-w-xl text-base leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]"
          eager
        >
          {t("subtitle")}
        </SplitReveal>

        <div className="mt-10 flex flex-wrap gap-4">
          <MagneticButton href="/business">{t("ctaPrimary")}</MagneticButton>
          <MagneticButton href="/projects" variant="outline">
            {t("ctaSecondary")}
          </MagneticButton>
        </div>
      </div>

      <div className="absolute bottom-8 end-8 z-10 hidden flex-col items-center gap-3 text-white/80 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)] sm:flex">
        <span className="text-xs tracking-widest">{t("scroll")}</span>
        <div className="h-12 w-px animate-pulse bg-white/60" />
      </div>
    </section>
  );
}
