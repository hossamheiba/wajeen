import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { loadMessages } from "@/lib/content";

/**
 * The site's single source of text — every server component, every client
 * component, the metadata, the JSON-LD and the studio preview all read through
 * here, and nothing in `src/` imports the message files directly.
 *
 * `loadMessages` decides where the text comes from. With
 * `WJEEN_CONTENT_SOURCE` unset or `json` — the default — it is the bundled
 * import this line always was. next-intl resolves this config once per request,
 * so the CMS mode costs one fetch per page render at most, not one per
 * `getTranslations`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
