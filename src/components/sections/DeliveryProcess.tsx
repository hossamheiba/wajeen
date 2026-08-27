import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface Step {
  title: string;
  desc: string;
}

export async function DeliveryProcess() {
  const t = await getTranslations("businessPage.process");
  const steps = t.raw("steps") as Step[];

  return (
    <section className="bg-off-white py-24">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("tag")}</div>
          <SplitReveal as="h2" type="words" className="mt-2 text-3xl font-extrabold text-heading lg:text-4xl">
            {t("title")}
          </SplitReveal>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-[var(--radius-md)] border border-black/5 bg-white p-6">
              <div className="text-4xl font-extrabold text-primary/10">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-3 text-base font-bold text-heading">{step.title}</div>
              <div className="mt-2 text-xs leading-relaxed text-gray-muted">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
