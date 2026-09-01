/**
 * Vertical-slice studio route. Proves the editor → postMessage → real section
 * pipeline; it is not the CMS and has no auth yet — see STAGE-2 report.
 */

import { notFound } from "next/navigation";
import { setRequestLocale, getMessages } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { HeroEditor, type HeroData } from "./HeroEditor";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata = { robots: { index: false, follow: false } };

export default async function StudioHeroPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The WHOLE namespace, not the four fields this screen edits. `hero` also
  // carries a `scroll` label that no field here touches; seeding from the
  // complete object means an edit merges over it instead of replacing the
  // namespace with a smaller one and silently dropping the rest.
  const messages = (await getMessages()) as Record<string, unknown>;
  const initialData = messages.hero as HeroData;

  return <HeroEditor locale={locale} initialData={initialData} />;
}
