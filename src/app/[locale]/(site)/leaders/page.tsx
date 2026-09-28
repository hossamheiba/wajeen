import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { FromThePresident } from "@/components/sections/FromThePresident";
import { Leadership } from "@/components/sections/Leadership";
import { OrgChart } from "@/components/sections/OrgChart";
import { Governance } from "@/components/sections/Governance";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/leaders" });
}

/**
 * Our leaders: who steers the company and how it is organised beneath them —
 * the chairman's message from the company profile, the management team, the
 * organisation chart, and the governance the board works to.
 */
export default async function LeadersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "aboutPage.leadership.header" });

  return (
    <>
      <PageHeader
        tag={t.has("tag") ? t("tag") : ""}
        title={t.has("title") ? t("title") : ""}
        description={t("description")}
        namespace="aboutPage"
        path="leadership.header"
        image="/images/leaders.jpg"
        minHeight="min-h-[55vh]"
      />

      <FromThePresident />
      <Leadership as="h1" />
      <OrgChart />
      <Governance />
    </>
  );
}
