import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { AboutStory } from "@/components/sections/AboutStory";
import { MissionVision } from "@/components/sections/MissionVision";
import { Leadership } from "@/components/sections/Leadership";
import { Governance } from "@/components/sections/Governance";
import heroBg from "../../../../public/images/hero_bg.jpg";

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

      <AboutStory />
      <MissionVision />
      <Leadership />
      <Governance />
    </>
  );
}
