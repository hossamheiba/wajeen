import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { StudioShell } from "./StudioShell";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * A shell and nothing else.
 *
 * No `getMessages()`, no translations, no content of any kind is rendered on
 * the server here — every byte the studio shows arrives from the authenticated
 * API after the page has loaded. That is what makes an unauthenticated request
 * for a studio URL uninteresting.
 */
export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <StudioShell locale={locale}>{children}</StudioShell>;
}
