"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const nextLocale = locale === "en" ? "ar" : "en";
  const label = locale === "en" ? "العربية" : "English";

  return (
    <button
      type="button"
      onClick={() =>
        router.replace(
          // @ts-expect-error dynamic pathname is fine at runtime
          { pathname, params },
          { locale: nextLocale }
        )
      }
      className={className}
    >
      {label}
    </button>
  );
}
