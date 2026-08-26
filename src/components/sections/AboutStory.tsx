import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Milestone {
  year: string;
  label: string;
}

export async function AboutStory() {
  const t = await getTranslations("aboutPage.story");
  const milestones = t.raw("milestones") as Milestone[];

  return (
    <section id="story" className="bg-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
            <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
              {t("title")}
            </SplitReveal>
            <p className="mt-5 text-sm leading-relaxed text-gray-muted">{t("body1")}</p>
            <p className="mt-4 text-sm leading-relaxed text-gray-muted">{t("body2")}</p>
          </div>

          <div className="space-y-6 border-s-2 border-black/10 ps-8">
            {milestones.map((m) => (
              <div key={m.year} className="relative">
                <div className="absolute -start-[2.55rem] top-1 h-3 w-3 rounded-full bg-primary" />
                <div className="text-2xl font-extrabold text-black">{m.year}</div>
                <div className="mt-1 text-sm text-gray-muted">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
