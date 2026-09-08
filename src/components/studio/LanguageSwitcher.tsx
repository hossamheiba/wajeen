"use client";

/**
 * Switch the studio's language from anywhere, keeping the current screen.
 *
 * Built on next-intl's own navigation rather than a second routing scheme:
 * its `usePathname` returns the path with the locale prefix removed
 * (`/studio/sections`), and its `Link` puts the requested locale back on
 * (`/ar/studio/sections`). So the route survives the switch by construction,
 * for every studio screen including the dynamic editor.
 *
 * Real links, not buttons — this is navigation, so it should open in a new tab,
 * show a destination on hover, and work without JavaScript.
 */

import { Link, usePathname } from "@/i18n/navigation";
import { studioCopy, type StudioLocale } from "@/lib/studio/i18n";

const LOCALES: StudioLocale[] = ["en", "ar"];

export function LanguageSwitcher({ locale }: { locale: string }) {
  // Locale-stripped: "/en/studio/sections" → "/studio/sections".
  const pathname = usePathname();
  const copy = studioCopy(locale);

  return (
    <div
      role="group"
      aria-label={copy.nav.language}
      className="flex items-center gap-0.5 rounded-ui border border-black/10 bg-white p-0.5"
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            hrefLang={code}
            aria-current={active ? "true" : undefined}
            className={`rounded-[calc(var(--radius-ui)-2px)] px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              active
                ? "bg-primary text-white"
                : "text-gray-muted hover:bg-black/[0.04] hover:text-heading"
            }`}
          >
            {code === "en" ? copy.nav.english : copy.nav.arabic}
          </Link>
        );
      })}
    </div>
  );
}
