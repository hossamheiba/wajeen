/**
 * Our Clients — a single-line glass marquee of sector tiles with logos,
 * looping continuously left-to-right regardless of page direction (same
 * technique Ticker.tsx uses) while everything else in the section still
 * follows the page's own reading direction.
 */

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { FadeUp } from "@/components/ui/Reveal";

interface ClientItem {
  label: string;
  category: string;
  code: string;
}

const CLIENT_IMAGES = [
  "/images/clients/gov.jpg",
  "/images/clients/energy.jpg",
  "/images/clients/dev.jpg",
  "/images/clients/ind.jpg",
  "/images/clients/fin.jpg",
  "/images/clients/reg.jpg",
  "/images/clients/utl.jpg",
  "/images/clients/inv.jpg",
];

export async function OurClients() {
  const t = await getTranslations("clients");
  const items = t.raw("items") as ClientItem[];

  const renderCard = (item: ClientItem, itemIndex: number, keyPrefix: string) => {
    const logoSrc = CLIENT_IMAGES[itemIndex % CLIENT_IMAGES.length];
    return (
      <div
        key={`${keyPrefix}-${itemIndex}`}
        className="group relative flex w-[300px] shrink-0 items-center gap-4 rounded-[var(--radius-md)] border border-primary/10 bg-white/80 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:border-primary/40 hover:bg-white hover:shadow-[0_20px_40px_-15px_var(--color-primary-glow)] sm:w-[340px] sm:p-5"
      >
        {/* Glowing top line highlight */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Company logo */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-black/10 bg-white p-1.5 shadow-sm transition-all duration-500 group-hover:scale-105 group-hover:border-primary/40 group-hover:shadow-[0_0_20px_var(--color-primary-glow)]">
          <Image
            src={logoSrc}
            alt={item.label}
            width={64}
            height={64}
            className="h-full w-full rounded-[var(--radius-md)] object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-[var(--radius-md)] border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary/80 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {item.code}
            </span>
            <span className="text-[10px] font-medium text-gray-muted/80">{item.category}</span>
          </div>

          <h3 className="mt-1.5 truncate text-sm font-extrabold text-heading transition-colors group-hover:text-primary">
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
    <section id="clients" className="relative overflow-hidden bg-gradient-to-b from-white via-off-white/80 to-white py-24">
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
      <FadeUp className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
          <SplitReveal
            as="h2"
            type="words"
            className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl"
          >
            {t("title")}
          </SplitReveal>
          <p className="mt-4 text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>
      </FadeUp>

      {/* Single-line marquee track — forced ltr so the seamless back-to-back
          loop math stays simple regardless of page direction; the section
          around it still follows the page's own reading direction. */}
      <FadeUp delay={0.15} className="relative mt-12 overflow-hidden py-4" dir="ltr">
        {/* Cinematic gradient fade vignetting on sides */}
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
