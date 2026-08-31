import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { PillarGrid } from "@/components/sections/PillarGrid";
import { OpenPositions } from "@/components/sections/OpenPositions";
import { CareersCta } from "@/components/sections/CareersCta";
import buildings from "../../../../public/images/buildings.jpg";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/careers" });
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "careersPage" });
  const tValues = await getTranslations({ locale, namespace: "careersPage.values" });
  const tBenefits = await getTranslations({ locale, namespace: "careersPage.benefits" });

  return (
    <>
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={buildings}
        minHeight="min-h-[45vh]"
      />

      <PillarGrid
        tag={tValues("tag")}
        title={tValues("title")}
        items={tValues.raw("items")}
        bg="white"
      />

      <PillarGrid
        tag={tBenefits("tag")}
        title={tBenefits("title")}
        items={tBenefits.raw("items")}
        bg="off-white"
      />

      <OpenPositions />

      <CareersCta />
    </>
  );
}
