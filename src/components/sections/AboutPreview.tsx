"use client";

/**
 * Homepage summary of the About page: who we are, plus the milestone spine.
 * Full story lives at /story.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";
import buildings from "../../../public/images/buildings.jpg";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";

const PHOTOS = [buildings, infrastructure, energy];
/** How long each photo holds before the next one fades in. */
const SLIDE_MS = 2_000;
const FADE_S = 0.8;

interface Milestone {
  year: string;
  title: string;
  desc: string;
}

export function AboutPreview() {
  const t = useTranslations("aboutPreview");
  const milestones = t.raw("milestones") as Milestone[];
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  // One timeout per photo rather than a free-running interval, so picking a
  // photo by hand gives it its full two seconds. Held still for anyone who
  // asked for less motion.
  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % PHOTOS.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [active, reduce]);

  return (
    <section id="about" className="bg-primary section-y">
      <div className="container-page grid grid-cols-1 gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow={t("tag")} title={t("title")} tone="dark" />
          <p className="mt-4 max-w-md t-small text-white/70">
            {t("description")}
          </p>

          <StaggerContainer className="mt-10 space-y-0" stagger={0.12}>
            {milestones.map((m, i) => (
              <StaggerItem key={m.year} className="flex gap-5" y={16}>
                {/* spine */}
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-white ring-4 ring-white/20" />
                  {i < milestones.length - 1 && (
                    <span className="w-px flex-1 bg-white/20" />
                  )}
                </div>
                <div className="pb-7">
                  <div className="text-sm font-extrabold text-primary-on-dark">
                    {m.year}
                  </div>
                  {/* The content carries `title` + `desc`; this read `label`,
                      which no milestone has, so the spine showed bare years. */}
                  <div className="mt-0.5 text-sm font-bold text-white">{m.title}</div>
                  <div className="mt-1 t-small text-white/70">{m.desc}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <Link
            href="/story"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline"
          >
            {t("cta")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </Link>
        </div>

        <FadeUp className="relative order-first lg:order-last" y={20}>
          <div className="relative h-[420px] overflow-hidden rounded-frame lg:h-full lg:min-h-[520px]">
            {/* Every photo stays mounted and only its opacity moves, so the
                crossfade never shifts the layout or reloads an image. */}
            {PHOTOS.map((photo, i) => (
              <motion.div
                key={photo.src}
                className="absolute inset-0"
                initial={false}
                animate={{ opacity: i === active ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : FADE_S, ease: "easeInOut" }}
                aria-hidden={i !== active}
              >
                <Image
                  src={photo}
                  alt={i === active ? t("title") : ""}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                />
              </motion.div>
            ))}
            <div className="absolute bottom-4 start-4 z-10 flex gap-1.5">
              {PHOTOS.map((photo, i) => (
                <button
                  key={photo.src}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`${i + 1} / ${PHOTOS.length}`}
                  aria-current={i === active}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    i === active ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="absolute -bottom-6 end-6 rounded-ui bg-white p-5 shadow-[var(--shadow-float)]">
            <div className="text-2xl font-extrabold text-primary">
              {t("badgeNumber")}
            </div>
            <div className="text-xs font-medium text-gray-muted">
              {t("badgeText")}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
