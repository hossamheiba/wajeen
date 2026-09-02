import { routing } from "@/i18n/routing";
import { VersionHistory } from "./VersionHistory";

export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioVersionsPage() {
  return <VersionHistory />;
}
