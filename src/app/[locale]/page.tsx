import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { AboutPreview } from "@/components/sections/AboutPreview";
import { Presence } from "@/components/sections/Presence";
import { ServicesShowcase } from "@/components/sections/ServicesShowcase";
import { Gallery } from "@/components/sections/Gallery";
import { CareersPreview } from "@/components/sections/CareersPreview";
import { Sustainability } from "@/components/sections/Sustainability";
import { Ticker } from "@/components/sections/Ticker";
import { News } from "@/components/sections/News";
import { CtaBanner } from "@/components/sections/CtaBanner";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /**
   * The homepage is the summary of the site: one section per destination in the
   * nav, in the order a first-time visitor needs them — who we are, where we
   * work, what we do, the proof, then the ways in.
   */
  return (
    <>
      <Hero />
      <Stats />
      <AboutPreview />
      <Presence />
      <ServicesShowcase />
      <Gallery />
      <CareersPreview />
      <Sustainability />
      <Ticker />
      <News />
      <CtaBanner />
    </>
  );
}
