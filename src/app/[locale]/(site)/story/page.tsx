import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { AboutStory } from "@/components/sections/AboutStory";
import { Awards } from "@/components/sections/Awards";
import { Testimonials } from "@/components/sections/Testimonials";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/story" });
}

/**
 * Our story: where the company came from and what it has been trusted with —
 * the profile's own account of the company, the recognition it has had, and
 * what its clients say.
 */
export default async function StoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "aboutPage.story.header" });

  return (
    <>
      {/* The client removed this header's eyebrow and title: both repeated
          the About header. `t.has` keeps the page working either way. */}
      <PageHeader
        tag={t.has("tag") ? t("tag") : ""}
        title={t.has("title") ? t("title") : ""}
        description={t("description")}
        namespace="aboutPage"
        path="story.header"
        image="/images/story.jpg"
        minHeight="min-h-[55vh]"
      />

      <AboutStory as="h1" />
      <Awards />
      <Testimonials />
    </>
  );
}
