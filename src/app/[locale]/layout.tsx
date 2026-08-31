import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import "../globals.css";

const cairo = Cairo({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const [tMeta, tContact, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getTranslations({ locale, namespace: "contactPage.info" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  const orgName =
    locale === "ar" ? "شركة وجين العالمية المحدودة" : "Wjeen International Co., Ltd.";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: orgName,
    description: tMeta("description"),
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/brand/wjeen-logo.png`,
    telephone: tContact("phone.value"),
    email: tContact("email.value"),
    address: {
      "@type": "PostalAddress",
      streetAddress: tContact("address.value"),
      addressCountry: "SA",
    },
    // `sameAs` is omitted deliberately: it must list verified profiles, and no
    // confirmed Wjeen social accounts exist yet. An empty array would publish
    // "this organisation has no profiles" as a fact.
  };

  return (
    <html lang={locale} dir={dir} className={cairo.variable}>
      {/* Browser extensions (ColorZilla, Grammarly, …) inject attributes onto
          <body> before React hydrates, which React reports as a mismatch.
          Suppressing here covers this element's own attributes only — real
          mismatches inside the tree are still reported. */}
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <NextIntlClientProvider>
          <SmoothScrollProvider>
            {/* 54 focusable elements sit between the top of the page and the
                content; this is the way past them. Visually hidden until it
                takes keyboard focus — see .skip-link in globals.css. */}
            <a href="#main" className="skip-link">
              {tNav("skipToContent")}
            </a>
            <Header />
            <main id="main">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </SmoothScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
