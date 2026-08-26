import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { BusinessSectors } from "@/components/sections/BusinessSectors";
import { Presence } from "@/components/sections/Presence";
import { Projects } from "@/components/sections/Projects";
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

  return (
    <>
      <Hero />
      <Stats />
      <BusinessSectors />
      <Presence />
      <Projects />
      <Sustainability />
      <Ticker />
      <News />
      <CtaBanner />
    </>
  );
}
