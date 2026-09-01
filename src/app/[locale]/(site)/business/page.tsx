import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { SectorDetails } from "@/components/sections/SectorDetails";
import { ServicesList } from "@/components/sections/ServicesList";
import { Resources } from "@/components/sections/Resources";
import { DeliveryProcess } from "@/components/sections/DeliveryProcess";
import { SafetyHSE } from "@/components/sections/SafetyHSE";
import { CtaBanner } from "@/components/sections/CtaBanner";
import energy from "../../../../../public/images/energy.jpg";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/business" });
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "businessPage" });

  return (
    <>
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={energy}
        minHeight="min-h-[50vh]"
      />

      <SectorDetails />
      <ServicesList />
      <DeliveryProcess />
      <Resources />
      <SafetyHSE />
      <CtaBanner />
    </>
  );
}
