import { setRequestLocale, getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { CtaBanner } from "@/components/sections/CtaBanner";

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
      <section className="flex min-h-[45vh] flex-col justify-center bg-dark-green pb-16 pt-40">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
          <SplitReveal as="h1" type="words" className="mt-3 max-w-3xl text-4xl font-extrabold text-white lg:text-6xl" eager>
            {t("title")}
          </SplitReveal>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">{t("description")}</p>
        </div>
      </section>

      <ProjectsGrid />
      <CtaBanner />
    </>
  );
}
