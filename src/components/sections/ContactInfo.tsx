"use client";

// Converted from a server component for Stage 3A. Nothing about what it
// renders changed — it had no server-only work, no data access and no
// interactivity, only `getTranslations`. As a client component it reads the
// same namespace through the same provider, which is what lets the studio
// preview swap in draft messages and re-render it live. It still renders in
// full in the server HTML, so SSR output and SEO are unaffected.

import { useTranslations } from "next-intl";

const icons = {
  address: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  ),
  email: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 6h18v12H3V6Zm0 0 9 7 9-7" />
  ),
  phone: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5c0 9 7 16 16 16l3-4-6-3-2 2c-2-1-4-3-5-5l2-2-3-6-4 1Z" />
  ),
  hours: (
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 3" />
  ),
} as const;

export function ContactInfo() {
  const t = useTranslations("contactPage.info");
  const rows: Array<keyof typeof icons> = ["address", "email", "phone", "hours"];

  return (
    <div className="space-y-5">
      {rows.map((key) => (
        <div key={key} className="flex items-start gap-4 rounded-frame border border-black/5 bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              {icons[key]}
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-muted">
              {t(`${key}.label`)}
            </div>
            <div className="mt-1 text-sm text-heading">{t(`${key}.value`)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
