import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { CtaBanner } from "@/components/sections/CtaBanner";
import buildings from "../../../../public/images/buildings.jpg";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "projectsPage" });

  return (
    <>
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={buildings}
        minHeight="min-h-[45vh]"
      />

      <ProjectsGrid />
      <CtaBanner />
    </>
  );
}
