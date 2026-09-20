import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { ProjectsMap } from "@/components/sections/ProjectsMap";
import { CtaBanner } from "@/components/sections/CtaBanner";
import buildings from "../../../../../public/images/buildings.jpg";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/projects" });
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "projectsPage" });

  return (
    // `page-capped` keeps this page on the old 1400px measure while the rest of
    // the site went full-bleed: the map and its list were laid out against it.
    <div className="page-capped">
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={buildings}
        minHeight="min-h-[45vh]"
      />

      {/* The map is how the projects are browsed: every project is on it or
          in the list beside it, with the filters, so nothing below repeats
          them. */}
      <ProjectsMap />
      <CtaBanner />
    </div>
  );
}
