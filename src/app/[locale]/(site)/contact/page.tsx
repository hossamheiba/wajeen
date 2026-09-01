import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { ContactForm } from "@/components/sections/ContactForm";
import { ContactInfo } from "@/components/sections/ContactInfo";
import { OfficeLocation } from "@/components/sections/OfficeLocation";
import infrastructure from "../../../../../public/images/infrastructure.jpg";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/contact" });
}

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
        minHeight="min-h-[50vh]"
      />

      <section className="bg-off-white section-y">
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.4fr]">
          <ContactInfo />
          <div className="rounded-frame bg-white p-7 lg:p-9">
            <ContactForm />
          </div>
        </div>
      </section>

      <OfficeLocation />
    </>
  );
}
