import { routing } from "@/i18n/routing";
import { SectionList } from "./SectionList";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <SectionList locale={locale} />;
}
