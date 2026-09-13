import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { AboutStory } from "@/components/sections/AboutStory";
import { Awards } from "@/components/sections/Awards";
import { Testimonials } from "@/components/sections/Testimonials";
import story from "../../../../../public/images/story.jpg";
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
  const t = await getTranslations({ locale, namespace: "aboutPage.pages.story" });

  return (
    <>
      <PageHeader
        tag={t("tag")}
        title={t("title")}
        description={t("description")}
        image={story}
        minHeight="min-h-[55vh]"
      />

      <AboutStory />
      <Awards />
      <Testimonials />
    </>
  );
}
