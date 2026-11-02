import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  // Arabic is the language the site opens in.
  defaultLocale: "ar",
  localePrefix: "always",
  // Without this, next-intl lets the visitor's NEXT_LOCALE cookie and their
  // browser's Accept-Language header outrank `defaultLocale` — so anyone whose
  // browser is set to English was still sent to `/en`, which is not what
  // "the site opens in Arabic" means. English is one click away on the language
  // switcher, and every English link carries its `/en` prefix, so nothing that
  // is already on an English page is moved by this.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
