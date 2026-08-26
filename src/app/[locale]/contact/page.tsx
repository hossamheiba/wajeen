import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { ContactForm } from "@/components/sections/ContactForm";
import { ContactInfo } from "@/components/sections/ContactInfo";
import infrastructure from "../../../../public/images/infrastructure.jpg";

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
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={infrastructure}
        minHeight="min-h-[40vh]"
      />

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
