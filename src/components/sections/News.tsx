"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SplitReveal } from "@/components/ui/SplitReveal";
import infrastructure from "../../../public/images/infrastructure.jpg";
import buildings from "../../../public/images/buildings.jpg";
import energy from "../../../public/images/energy.jpg";

const images = [infrastructure, buildings, energy];

interface NewsItem {
  date: string;
  headline: string;
}

export function News() {
  const t = useTranslations("news");
  const items = t.raw("items") as NewsItem[];

  return (
    <section id="news" className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
            <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-black lg:text-4xl">
              {t("title")}
            </SplitReveal>
          </div>
          <Link href="/#news" className="hidden text-sm font-semibold text-orange sm:block">
            {t("viewAll")} →
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item, i) => (
            <article key={item.headline} className="group">
              <div className="relative h-56 overflow-hidden rounded-[var(--radius-lg)]">
                <Image
                  src={images[i % images.length]}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
                <span className="absolute start-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                  {item.date}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold leading-snug text-black">{item.headline}</h3>
              <Link href="/#news" className="mt-3 inline-block text-sm font-semibold text-orange">
                {t("readMore")} →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
