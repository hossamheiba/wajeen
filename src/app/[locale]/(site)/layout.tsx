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

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tNav = await getTranslations("nav");

  return (
    <SmoothScrollProvider>
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
    </SmoothScrollProvider>
  );
}
