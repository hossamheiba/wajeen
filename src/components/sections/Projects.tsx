"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";
import infrastructure from "../../../public/images/infrastructure.jpg";
import energy from "../../../public/images/energy.jpg";
import buildings from "../../../public/images/buildings.jpg";
import "swiper/css";
import "swiper/css/navigation";

const images = [infrastructure, energy, buildings];

interface ProjectItem {
  category: string;
  title: string;
  location: string;
}

export function Projects() {
  const t = useTranslations("projects");
  const items = t.raw("items") as ProjectItem[];

  return (
    <section id="projects" className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
            <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-black lg:text-4xl">
              {t("title")}
            </SplitReveal>
          </div>
          <Link href="/projects" className="hidden text-sm font-semibold text-orange sm:block">
            {t("viewAll")} →
          </Link>
        </div>

        <Swiper
          modules={[Navigation, A11y]}
          navigation
          spaceBetween={24}
          slidesPerView={1.1}
          breakpoints={{
            640: { slidesPerView: 1.4 },
            1024: { slidesPerView: 2.3 },
          }}
          className="!mt-12 [&_.swiper-button-next]:!text-orange [&_.swiper-button-prev]:!text-orange"
        >
          {items.map((item, i) => (
            <SwiperSlide key={item.title}>
              <div className="group relative h-[440px] overflow-hidden rounded-[var(--radius-lg)]">
                <Image
                  src={images[i % images.length]}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <span className="mb-3 w-fit rounded-full bg-orange px-3 py-1 text-xs font-semibold text-white">
                    {item.category}
                  </span>
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <div className="mt-2 text-sm text-white/70">📍 {item.location}</div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
