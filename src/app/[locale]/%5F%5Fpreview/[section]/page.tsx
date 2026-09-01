/**
 * Studio preview route. Not linked from anywhere, excluded from the sitemap,
 * and served with `X-Robots-Tag: noindex` plus the only `frame-ancestors 'self'`
 * policy on the site — see `next.config.ts`.
 */

import { notFound } from "next/navigation";
import { setRequestLocale, getMessages } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { PREVIEW_REGISTRY } from "@/lib/preview/registry";
import { PreviewHost } from "./PreviewHost";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    Object.keys(PREVIEW_REGISTRY).map((section) => ({ locale, section })),
  );
}

export const metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!PREVIEW_REGISTRY[section]) notFound();

  setRequestLocale(locale);
  const messages = (await getMessages()) as Record<string, unknown>;

  return (
    <PreviewHost locale={locale} section={section} initialMessages={messages} />
  );
}
