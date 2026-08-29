"use client";

/**
 * Coverflow gallery — a 3D carousel where the centre card sits upright and the
 * neighbours fall away in depth. Autoplays, pauses on hover, and answers the
 * arrow keys. Mirrored for RTL.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";

const photos = [infrastructure, energy, buildings];

const EASE = [0.22, 1, 0.36, 1] as const;
const VISIBLE = 3; // cards rendered each side of the centre
const AUTOPLAY_MS = 4500;

interface GalleryItem {
  category: string;
  title: string;
  location: string;
  description: string;
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LayersIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ExpandIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

export function Gallery() {
  const t = useTranslations("gallery");
  const locale = useLocale();
  const ar = locale === "ar";
  const items = t.raw("items") as GalleryItem[];
  const total = items.length;

  // Open on the middle card so the deck reads as a spread, not an edge.
  const [active, setActive] = useState(() => Math.floor(items.length / 2));
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const go = (dir: number) =>
    setActive((p) => Math.min(total - 1, Math.max(0, p + dir)));

  const jump = (i: number) => {
    setActive(i);
    setIsAutoPlaying(false);
  };

  // Arrow-key navigation, mirrored for RTL. Also answers Escape to close
  // the lightbox when it's open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(ar ? -1 : 1);
      if (e.key === "ArrowLeft") go(ar ? 1 : -1);
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, ar]);

  // Autoplay, paused while the pointer is over the deck or the lightbox is open.
  useEffect(() => {
    if (!isAutoPlaying || lightboxOpen || total <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isAutoPlaying, lightboxOpen, total]);

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

  const activeItem = items[active];

  if (total === 0) return null;

  return (
    <section id="gallery" className="bg-off-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("tag")}
            </div>
            <SplitReveal
              as="h2"
              type="words"
              className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl"
            >
              {t("title")}
            </SplitReveal>
          </div>
          <Link
            href="/projects"
            className="hidden text-sm font-semibold text-primary sm:block"
          >
            {t("viewAll")} {ar ? "←" : "→"}
          </Link>
        </div>

        {/* ---------- the deck ---------- */}
        <div
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
          className="relative mt-12 h-[540px] w-full overflow-hidden [perspective:2000px]"
        >
          {/* floating glass arrows */}
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-40 flex -translate-y-1/2 justify-between">
            <button
              onClick={() => {
                go(-1);
                setIsAutoPlaying(false);
              }}
              disabled={active === 0}
              className="pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-primary/10 bg-white/60 text-primary shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={ar ? "السابق" : "Previous"}
            >
              <ArrowIcon className={`h-5 w-5 ${ar ? "" : "rotate-180"}`} />
            </button>
            <button
              onClick={() => {
                go(1);
                setIsAutoPlaying(false);
              }}
              disabled={active === total - 1}
              className="pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-primary/10 bg-white/60 text-primary shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={ar ? "التالي" : "Next"}
            >
              <ArrowIcon className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className="relative h-full w-full [transform-style:preserve-3d]">
            {items.map((item, i) => {
              const raw = i - active;
              if (Math.abs(raw) > VISIBLE) return null;
              const off = ar ? -raw : raw;
              const abs = Math.abs(off);
              const isCentre = raw === 0;
              const num = String(i + 1).padStart(2, "0");

              return (
                <motion.div
                  key={item.title}
                  onClick={() => !isCentre && jump(i)}
                  initial={{ opacity: 0 }}
                  animate={{
                    x: `calc(-50% + ${off * 260}px)`,
                    z: -abs * 220,
                    rotateY: off * -32,
                    scale: 1 - abs * 0.08,
                    opacity: abs > VISIBLE - 1 ? 0 : 1,
                    zIndex: 20 - abs,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 110,
                    damping: 20,
                    mass: 0.6,
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                  className={`absolute left-1/2 top-1/2 h-[460px] w-[360px] -translate-y-1/2 ${
                    isCentre ? "" : "cursor-pointer"
                  }`}
                >
                  <div
                    className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white text-black transition-shadow duration-500 ${
                      isCentre
                        ? "shadow-[0_45px_90px_-25px_var(--color-primary-glow)] ring-1 ring-primary"
                        : "shadow-[0_30px_60px_-25px_rgba(17,24,39,0.15)] ring-1 ring-black/5"
                    }`}
                  >
                    <div className="relative h-48 w-full overflow-hidden border-b border-black/5 bg-off-white">
                      <Image
                        src={photos[i % photos.length]}
                        alt={item.title}
                        fill
                        sizes="360px"
                        className="object-cover"
                      />
                      {isCentre && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAutoPlaying(false);
                            setLightboxOpen(true);
                          }}
                          aria-label={ar ? "تكبير الصورة" : "Expand image"}
                          className="group/expand absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 hover:bg-black/30"
                        >
                          <span className="flex h-11 w-11 scale-75 items-center justify-center rounded-full bg-white/90 text-primary opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover/expand:scale-100 group-hover/expand:opacity-100">
                            <ExpandIcon className="h-5 w-5" />
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="pointer-events-none absolute -bottom-20 -end-16 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
                    <span
                      className={`absolute inset-x-0 top-0 h-1.5 transition-opacity duration-500 ${
                        isCentre
                          ? "bg-gradient-to-r from-transparent via-primary to-transparent opacity-100"
                          : "bg-primary/40 opacity-0"
                      }`}
                    />

                    <span className="pointer-events-none absolute top-44 select-none text-[8rem] font-black leading-none text-black/[0.04] ltr:right-4 rtl:left-4">
                      {num}
                    </span>

                    <div className="relative z-10 flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                          <LayersIcon className="h-3.5 w-3.5" />
                          {item.category}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-off-white px-3 py-1 text-xs font-bold text-primary">
                          <PinIcon className="h-3.5 w-3.5" />
                          {item.location}
                        </span>
                      </div>

                      <h3 className="mt-5 line-clamp-2 text-xl font-extrabold leading-tight text-heading transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <div className="mt-3.5 h-1 w-12 rounded-full bg-primary" />

                      <AnimatePresence>
                        {isCentre && (
                          <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.35,
                              ease: EASE,
                              delay: 0.1,
                            }}
                            className="mt-auto pt-4"
                          >
                            <p className="line-clamp-3 text-xs leading-relaxed text-gray-muted">
                              {item.description}
                            </p>
                            <Link
                              href="/projects"
                              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white transition-all hover:gap-3 hover:bg-primary-hover hover:shadow-[0_12px_30px_-8px_var(--color-primary-glow)]"
                            >
                              {t("cta")}
                              <ArrowIcon
                                className={`h-4 w-4 ${ar ? "rotate-180" : ""}`}
                              />
                            </Link>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ---------- controls ---------- */}
        <div className="mt-8 flex items-center justify-center gap-5">
          <button
            onClick={() => {
              go(-1);
              setIsAutoPlaying(false);
            }}
            disabled={active === 0}
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-black/10 bg-white text-black shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={ar ? "السابق" : "Previous"}
          >
            <ArrowIcon className={`h-5 w-5 ${ar ? "" : "rotate-180"}`} />
          </button>

          <div className="relative h-1 w-56 overflow-hidden rounded-full bg-black/10">
            <motion.div
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-primary to-primary-surface ltr:left-0 rtl:right-0"
              animate={{ width: `${((active + 1) / total) * 100}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 24 }}
            />
          </div>

          <button
            onClick={() => {
              go(1);
              setIsAutoPlaying(false);
            }}
            disabled={active === total - 1}
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-black/10 bg-white text-black shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={ar ? "التالي" : "Next"}
          >
            <ArrowIcon className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
          </button>

          <span className="ms-2 text-sm font-bold tabular-nums text-gray-muted">
            <span className="text-primary">
              {String(active + 1).padStart(2, "0")}
            </span>{" "}
            / {String(total).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* ---------- lightbox ---------- */}
      <AnimatePresence>
        {lightboxOpen && activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              aria-label={ar ? "إغلاق" : "Close"}
              className="absolute end-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:end-6 sm:top-6"
            >
              <CloseIcon className="h-5 w-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                go(ar ? 1 : -1);
              }}
              disabled={active === 0}
              aria-label={ar ? "السابق" : "Previous"}
              className="absolute start-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 sm:start-6"
            >
              <ArrowIcon className={`h-5 w-5 ${ar ? "" : "rotate-180"}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(ar ? -1 : 1);
              }}
              disabled={active === total - 1}
              aria-label={ar ? "التالي" : "Next"}
              className="absolute end-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 sm:end-6"
            >
              <ArrowIcon className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
            </button>

            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-full w-full max-w-4xl flex-col items-center"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                <Image
                  src={photos[active % photos.length]}
                  alt={activeItem.title}
                  fill
                  sizes="(min-width: 1024px) 900px, 90vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                  <LayersIcon className="h-3.5 w-3.5" />
                  {activeItem.category}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/80">
                  <PinIcon className="h-3.5 w-3.5" />
                  {activeItem.location}
                </span>
              </div>
              <h3 className="mt-3 text-center text-lg font-bold text-white">
                {activeItem.title}
              </h3>
              <span className="mt-1 text-xs font-bold tabular-nums text-white/50">
                {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
