import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { SectorDetails } from "@/components/sections/SectorDetails";
import { DeliveryProcess } from "@/components/sections/DeliveryProcess";
import { CtaBanner } from "@/components/sections/CtaBanner";
import energy from "../../../../public/images/energy.jpg";

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
      <DeliveryProcess />
      <CtaBanner />
    </>
  );
}
