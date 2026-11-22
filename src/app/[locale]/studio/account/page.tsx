import { routing } from "@/i18n/routing";
import { AccountPage } from "./AccountPage";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AccountPage locale={locale} />;
}
