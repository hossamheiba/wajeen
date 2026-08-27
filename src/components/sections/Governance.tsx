import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Pillar {
  title: string;
  desc: string;
}

export async function Governance() {
  const t = await getTranslations("aboutPage.governance");
  const pillars = t.raw("pillars") as Pillar[];

  return (
    <section id="governance" className="bg-off-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
            {t("title")}
          </SplitReveal>
          <p className="mt-4 text-sm leading-relaxed text-gray-muted">{t("description")}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-[var(--radius-md)] border border-black/5 bg-white p-6">
              <div className="text-sm font-bold text-heading">{p.title}</div>
              <div className="mt-2 text-xs leading-relaxed text-gray-muted">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
