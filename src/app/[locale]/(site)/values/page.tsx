import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { MissionVision } from "@/components/sections/MissionVision";
import { Values } from "@/components/sections/Values";
import { QualityPolicy } from "@/components/sections/QualityPolicy";
import { Certificates } from "@/components/sections/Certificates";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/values" });
}

/**
 * Our values: what the work is held to — the mission, the seven values the
 * profile sets out, the quality policy, and the certificates that evidence
 * them.
 */
export default async function ValuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "aboutPage.values.header" });

  return (
    <>
      <PageHeader
        tag={t.has("tag") ? t("tag") : ""}
        title={t.has("title") ? t("title") : ""}
        description={t("description")}
        namespace="aboutPage"
        path="values.header"
        image="/images/values.jpg"
        minHeight="min-h-[55vh]"
      />

      <MissionVision />
      <Values as="h1" />
      <QualityPolicy />
      <Certificates />
    </>
  );
}
