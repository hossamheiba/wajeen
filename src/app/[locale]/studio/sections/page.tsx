import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { SectionBrowser } from "./SectionBrowser";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioSectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // useSearchParams needs a boundary during prerender.
  return (
    <Suspense fallback={null}>
      <SectionBrowser locale={locale} />
    </Suspense>
  );
}
