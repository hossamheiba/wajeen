import { routing } from "@/i18n/routing";
import { Inbox } from "./Inbox";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <Inbox locale={locale} />;
}
