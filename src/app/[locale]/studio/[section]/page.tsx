import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { STUDIO_REGISTRY } from "@/lib/studio/registry";
import { SectionEditor } from "./SectionEditor";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    Object.keys(STUDIO_REGISTRY).map((section) => ({ locale, section })),
  );
}

/**
 * A shell again: the entry is resolved here purely to 404 on an unknown key.
 * No content is read on the server — it all arrives from the authenticated API.
 */
export default async function StudioSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  const entry = STUDIO_REGISTRY[section];
  if (!entry) notFound();

  return <SectionEditor locale={locale} entryKey={section} />;
}
