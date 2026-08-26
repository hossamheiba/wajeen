import { setRequestLocale, getTranslations } from "next-intl/server";
import { PlaceholderHero } from "@/components/sections/PlaceholderHero";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });

  return <PlaceholderHero title={t("business")} />;
}
