import { setRequestLocale, getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { ContactForm } from "@/components/sections/ContactForm";
import { ContactInfo } from "@/components/sections/ContactInfo";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contactPage" });

  return (
    <>
      <section className="bg-dark-green pb-20 pt-40">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-orange">{t("tag")}</div>
          <SplitReveal as="h1" type="words" className="mt-3 max-w-2xl text-4xl font-extrabold text-white lg:text-5xl" eager>
            {t("title")}
          </SplitReveal>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">{t("description")}</p>
        </div>
      </section>

      <section className="bg-dark-green pb-24">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-10">
          <ContactInfo />
          <div className="rounded-[var(--radius-lg)] bg-white p-7 lg:p-9">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
