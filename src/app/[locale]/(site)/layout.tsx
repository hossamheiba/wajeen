/**
 * The public site's chrome.
 *
 * Split out of `[locale]/layout.tsx` so the studio and the preview route can
 * sit under the same locale segment — sharing fonts, direction and the
 * next-intl provider — without inheriting a fixed header that would cover the
 * studio UI and a footer that would appear under every previewed section.
 *
 * `(site)` is a route group, so no URL changes.
 */

import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { SiteIntro } from "@/components/layout/SiteIntro";
import { MediaProvider } from "@/components/layout/MediaProvider";
import { fetchMediaManifest } from "@/lib/media";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tNav = await getTranslations("nav");

  // CMS-managed images. One fetch for the whole page tree, and one that can
  // never fail the render: `fetchMediaManifest` swallows every error and
  // returns an empty manifest, which makes each section draw the copy bundled
  // under /public instead. The site's text is untouched by any of this — it
  // still comes from src/messages via next-intl.
  const media = await fetchMediaManifest();

  return (
    <SmoothScrollProvider>
      <MediaProvider manifest={media}>
        {/* 54 focusable elements sit between the top of the page and the
          content; this is the way past them. Visually hidden until it takes
          keyboard focus — see .skip-link in globals.css. */}
        <a href="#main" className="skip-link">
          {tNav("skipToContent")}
        </a>
        <Header />
        <main id="main">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        {/* Last in the DOM as well as topmost in z-order: the curtain covers
          every route and replays on every navigation. It lives here rather
          than on a page so there can only ever be one of it. */}
        <SiteIntro />
      </MediaProvider>
    </SmoothScrollProvider>
  );
}
