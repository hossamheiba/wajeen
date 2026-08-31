import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { FromThePresident } from "@/components/sections/FromThePresident";
import { AboutStory } from "@/components/sections/AboutStory";
import { MissionVision } from "@/components/sections/MissionVision";
import { Values } from "@/components/sections/Values";
import { QualityPolicy } from "@/components/sections/QualityPolicy";
import { Awards } from "@/components/sections/Awards";
import { Leadership } from "@/components/sections/Leadership";
import { Testimonials } from "@/components/sections/Testimonials";
import { Governance } from "@/components/sections/Governance";
import { OrgChart } from "@/components/sections/OrgChart";
import { Certificates } from "@/components/sections/Certificates";
import heroBg from "../../../../public/images/hero_bg.jpg";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/about" });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "aboutPage" });

  return (
    <>
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={heroBg}
        minHeight="min-h-[55vh]"
      />

      <FromThePresident />
      <AboutStory />
      <MissionVision />
      <Values />
      <QualityPolicy />
      <Awards />
      <Leadership />
      <Testimonials />
      <Governance />
      <OrgChart />
      <Certificates />
    </>
  );
}
