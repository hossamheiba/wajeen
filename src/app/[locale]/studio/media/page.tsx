import { routing } from "@/i18n/routing";
import { MediaLibrary } from "./MediaLibrary";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <MediaLibrary locale={locale} />;
}
