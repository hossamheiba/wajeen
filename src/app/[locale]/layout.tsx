import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
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
  // `nav` used to be loaded here for the skip link; that moved to
  // `(site)/layout.tsx` along with the rest of the chrome, so this no longer
  // fetches a namespace it does not read.
  const [tMeta, tContact] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getTranslations({ locale, namespace: "contactPage.info" }),
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
        {/* Only the document shell and the i18n provider live here. The site's
            chrome — header, footer, smooth scroll, page transition — moved to
            `(site)/layout.tsx` so that `/studio` and `/__preview` can share the
            locale, fonts and messages without inheriting a fixed header that
            covers them. URLs are unchanged: `(site)` is a route group. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
