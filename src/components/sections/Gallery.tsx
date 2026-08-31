"use client";

/**
 * Coverflow gallery — a 3D carousel where the centre card sits upright and the
 * neighbours fall away in depth. Autoplays, pauses on hover, and answers the
 * arrow keys. Mirrored for RTL.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Chip } from "@/components/ui/Chip";

const EASE = [0.22, 1, 0.36, 1] as const;
const VISIBLE = 3; // cards rendered each side of the centre
const AUTOPLAY_MS = 4500;

interface GalleryItem {
  image: string;
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

export function Gallery() {
  const reduce = useReducedMotion() === true;
  const t = useTranslations("gallery");
  const locale = useLocale();
  const ar = locale === "ar";
  const items = t.raw("items") as GalleryItem[];
  const total = items.length;

  // Open on the middle card so the deck reads as a spread, not an edge.
  const [active, setActive] = useState(() => Math.floor(items.length / 2));
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const go = (dir: number) =>
    setActive((p) => Math.min(total - 1, Math.max(0, p + dir)));

  const jump = (i: number) => {
    setActive(i);
    setIsAutoPlaying(false);
  };

  // Arrow-key navigation, mirrored for RTL. Bound to the deck rather than the
  // window: on the window it stole every arrow press on the page, so reading
  // any other section with the keyboard silently shuffled this carousel.
  // The deck is focusable (tabIndex below) so it can receive the keys at all.
  const deckRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(ar ? -1 : 1);
      else if (e.key === "ArrowLeft") go(ar ? 1 : -1);
      else return;
      e.preventDefault();
    };
    deck.addEventListener("keydown", onKey);
    return () => deck.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, ar]);

  // Autoplay, paused while the pointer is over the deck.
  useEffect(() => {
    if (!isAutoPlaying || total <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isAutoPlaying, total]);

  if (total === 0) return null;

  return (
    <section id="gallery" className="bg-off-white section-y">
      <div className="container-page">
        <div className="flex items-end justify-between gap-6">
          <div>
            <SectionHeading eyebrow={t("tag")} title={t("title")} />
          </div>
          <Link
            href="/business"
            className="hidden text-sm font-semibold text-primary sm:block"
          >
            {t("viewAll")} {ar ? "←" : "→"}
          </Link>
        </div>

        {/* ---------- the deck ---------- */}
        <div
          ref={deckRef}
          tabIndex={0}
          role="group"
          aria-roledescription={ar ? "معرض" : "carousel"}
          aria-label={t("title")}
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
          className="relative mt-12 h-[540px] w-full overflow-hidden [perspective:2000px]"
        >
          {/* floating glass arrows — hidden below sm: the card is nearly
              viewport-width there, so these would overlap its content; the
              control row under the deck already covers prev/next on mobile */}
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-40 hidden -translate-y-1/2 justify-between sm:flex">
            <button
              onClick={() => {
                go(-1);
                setIsAutoPlaying(false);
              }}
              disabled={active === 0}
              className="pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/60 text-primary shadow-[var(--shadow-lift)] backdrop-blur-md transition-all duration-300 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
              className="pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/60 text-primary shadow-[var(--shadow-lift)] backdrop-blur-md transition-all duration-300 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{
                    x: `calc(-50% + ${off * 260}px)`,
                    z: -abs * 220,
                    rotateY: off * -32,
                    scale: 1 - abs * 0.08,
                    opacity: abs > VISIBLE - 1 ? 0 : 1,
                    zIndex: 20 - abs,
                  }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 110, damping: 20, mass: 0.6 }
                  }
                  style={{ transformStyle: "preserve-3d" }}
                  className={`absolute left-1/2 top-1/2 h-[460px] w-[min(360px,calc(100vw-3rem))] -translate-y-1/2 ${
                    isCentre ? "" : "cursor-pointer"
                  }`}
                >
                  <div
                    className={`group relative flex h-full flex-col overflow-hidden rounded-frame border border-black/5 bg-white text-black transition-shadow duration-500 ${
                      isCentre
                        ? "shadow-[var(--shadow-glow-strong)] ring-1 ring-primary"
                        : "shadow-[var(--shadow-lift)] ring-1 ring-black/5"
                    }`}
                  >
                    <div className="relative h-48 w-full overflow-hidden border-b border-black/5 bg-off-white">
                      <Image
                        src={`/images/projects/${item.image}.jpg`}
                        alt={item.title}
                        fill
                        sizes="360px"
                        className="object-cover"
                      />
                    </div>

                    <div className="pointer-events-none absolute -bottom-20 -end-16 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
                    <span
                      className={`absolute inset-x-0 top-0 h-1.5 transition-opacity duration-500 ${
                        isCentre
                          ? "bg-gradient-to-r from-transparent via-primary to-transparent opacity-100"
                          : "bg-primary/40 opacity-0"
                      }`}
                    />

                    <span className="pointer-events-none absolute end-4 top-44 select-none text-[8rem] font-black leading-none text-black/[0.04]">
                      {num}
                    </span>

                    <div className="relative z-10 flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone="solid" elevated>
                          <LayersIcon className="h-3.5 w-3.5" />
                          {item.category}
                        </Chip>
                        <Chip tone="muted" elevated>
                          <PinIcon className="h-3.5 w-3.5" />
                          {item.location}
                        </Chip>
                      </div>

                      <h3 className="t-h4 mt-5 line-clamp-2 text-heading transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <div className="mt-3.5 h-1 w-12 rounded-full bg-primary" />

                      <AnimatePresence>
                        {isCentre && (
                          <motion.div
                            initial={reduce ? false : { opacity: 0, y: 14 }}
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
                            <MagneticButton href="/projects" className="mt-5 gap-2 hover:gap-3">
                              {t("cta")}
                              <ArrowIcon
                                className={`h-4 w-4 ${ar ? "rotate-180" : ""}`}
                              />
                            </MagneticButton>
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
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-black/10 bg-white text-black shadow-[var(--shadow-card)] transition-all hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={ar ? "السابق" : "Previous"}
          >
            <ArrowIcon className={`h-5 w-5 ${ar ? "" : "rotate-180"}`} />
          </button>

          <div className="relative h-1 w-56 overflow-hidden rounded-full bg-black/10">
            <motion.div
              className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-primary to-primary-surface"
              animate={{ width: `${((active + 1) / total) * 100}%` }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 24 }}
            />
          </div>

          <button
            onClick={() => {
              go(1);
              setIsAutoPlaying(false);
            }}
            disabled={active === total - 1}
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-black/10 bg-white text-black shadow-[var(--shadow-card)] transition-all hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
    </section>
  );
}
