import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Card {
  title: string;
  body: string;
}

export async function MissionVision() {
  const t = await getTranslations("aboutPage.mission");
  const cards = t.raw("cards") as Card[];

  return (
    <section id="mission" className="bg-off-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map((card, i) => (
            <div key={card.title} className="rounded-[var(--radius-lg)] bg-primary p-9">
              <SplitReveal
                as="h3"
                type="words"
                delay={i * 0.1}
                className="text-2xl font-extrabold text-white"
              >
                {card.title}
              </SplitReveal>
              <p className="mt-4 text-sm leading-relaxed text-white/65">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
