import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/site";

/**
 * Builds a route's metadata.
 *
 * Every page must call this with its own `path`, because Next merges metadata
 * *shallowly*: a page that sets `openGraph` or `alternates` replaces the
 * layout's copy wholesale rather than extending it. Returning the complete
 * objects from one place is what keeps that from silently dropping fields.
 *
 * It also exists because a layout cannot know which page is rendering — it
 * only receives `params`. That is why the canonical URL used to be
 * `/${locale}` for every route, which told search engines that all twelve
 * sub-pages were duplicates of the locale's home page.
 *
 * @param path route below the locale, with a leading slash; "" for the home
 *             page. e.g. "/about".
 */
export async function buildPageMetadata({
  locale,
  path = "",
}: {
  locale: string;
  path?: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });

  const self = `/${locale}${path}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      // Self-referencing: each route is its own canonical.
      canonical: self,
      // Each language points at the *same* page in the other language, not at
      // that language's home page.
      languages: {
        en: `/en${path}`,
        ar: `/ar${path}`,
        "x-default": `/en${path}`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: self,
      siteName: t("title"),
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}
