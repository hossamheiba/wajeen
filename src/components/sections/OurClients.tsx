"use client";

// Converted from a server component for Stage 3A. Nothing about what it
// renders changed — it had no server-only work, no data access and no
// interactivity, only `getTranslations`. As a client component it reads the
// same namespace through the same provider, which is what lets the studio
// preview swap in draft messages and re-render it live. It still renders in
// full in the server HTML, so SSR output and SEO are unaffected.

/**
 * Our Clients — a single-line glass marquee of sector tiles with logos,
 * looping continuously left-to-right regardless of page direction (same
 * technique Ticker.tsx uses) while everything else in the section still
 * follows the page's own reading direction.
 */

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeUp } from "@/components/ui/Reveal";
import { chipClasses } from "@/components/ui/Chip";

interface ClientItem {
  /** Basename of the logo in /public/images/clients. */
  logo: string;
  label: string;
  category: string;
  code: string;
}

export function OurClients() {
  const t = useTranslations("clients");
  const items = t.raw("items") as ClientItem[];

  const renderCard = (item: ClientItem, itemIndex: number, keyPrefix: string) => {
    const logoSrc = `/images/clients/${item.logo}.jpg`;
    return (
      <div
        key={`${keyPrefix}-${itemIndex}`}
        className="group relative flex w-[300px] shrink-0 items-center gap-4 rounded-ui border border-primary/10 bg-white/80 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:border-primary/40 hover:bg-white hover:shadow-[var(--shadow-glow)] sm:w-[340px] sm:p-5"
      >
        {/* Glowing top line highlight */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Company logo */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-ui border border-black/10 bg-white p-1.5 shadow-[var(--shadow-card)] transition-all duration-500 group-hover:scale-105 group-hover:border-primary/40 group-hover:shadow-[var(--shadow-ring)]">
          <Image
            src={logoSrc}
            alt={item.label}
            width={64}
            height={64}
            className="h-full w-full rounded-ui object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            <span
              className={chipClasses({
                tone: "micro",
                size: "xs",
                className:
                  "transition-colors group-hover:bg-primary/10 group-hover:text-primary",
              })}
            >
              {item.code}
            </span>
            <span className="text-[10px] font-medium text-gray-muted/80">{item.category}</span>
          </div>

          <h3 className="t-h5 mt-1.5 truncate text-heading transition-colors group-hover:text-primary">
            {item.label}
          </h3>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-muted transition-colors group-hover:text-heading">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{t("statusLabel")}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="clients" className="relative overflow-hidden bg-gradient-to-b from-white via-off-white/80 to-white section-y">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <style>{`
        @keyframes clientsSeamlessMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .clients-single-track {
          animation: clientsSeamlessMarquee 35s linear infinite;
        }
        .clients-single-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Section header */}
      <FadeUp className="relative z-10 container-page">
        <div className="mx-auto max-w-xl text-center">
          <SectionHeading eyebrow={t("tag")} title={t("title")} />
          <p className="mt-4 t-small text-gray-muted">{t("description")}</p>
        </div>
      </FadeUp>

      {/* Single-line marquee track — forced ltr so the seamless back-to-back
          loop math stays simple regardless of page direction; the section
          around it still follows the page's own reading direction. */}
      <FadeUp delay={0.15} className="relative mt-12 overflow-hidden py-4" dir="ltr">
        {/* Cinematic gradient fade vignetting on sides. Deliberately physical
            (left/right, not start/end): they mask the two ends of the track
            above, which is forced ltr, so they must not mirror with the page. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-white via-white/90 to-transparent sm:w-40 lg:w-64" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-white via-white/90 to-transparent sm:w-40 lg:w-64" />

        {/* Outer track: 2 identical sets side-by-side with gap matching inner cards */}
        <div className="flex w-max gap-5 clients-single-track will-change-transform sm:gap-6">
          {/* Set 1 */}
          <div className="flex shrink-0 gap-5 sm:gap-6">
            {items.map((item, idx) => renderCard(item, idx, "set1"))}
          </div>
          {/* Set 2 (duplicate for the endless back-to-back loop) */}
          <div className="flex shrink-0 gap-5 sm:gap-6" aria-hidden="true">
            {items.map((item, idx) => renderCard(item, idx, "set2"))}
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
