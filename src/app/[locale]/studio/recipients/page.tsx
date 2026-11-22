import { routing } from "@/i18n/routing";
import { RecipientsPage } from "./RecipientsPage";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioRecipientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <RecipientsPage locale={locale} />;
}
