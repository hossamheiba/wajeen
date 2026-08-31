/**
 * Office Location — a drawn locator beacon, not an embedded map.
 *
 * The office address on this site is still a placeholder (see
 * TODO-BACKEND.md), so pinning a real Google Maps embed to it would show a
 * visitor the wrong building at a very specific zoom level. A custom radar
 * beacon makes the same "come visit us" point honestly, and the directions
 * button already builds a correct query from whatever address is live —
 * it'll resolve properly the moment the real one replaces this.
 */

import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

export async function OfficeLocation() {
  const t = await getTranslations("location");
  const tInfo = await getTranslations("contactPage.info");
  const address = tInfo("address.value");
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section className="bg-white section-y">
      <div className="container-page">
        <div className="grid grid-cols-1 items-center gap-12 rounded-frame border border-black/5 bg-off-white p-8 lg:grid-cols-2 lg:p-14">
          {/* radar beacon */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center">
            <div
              className="absolute inset-0 rounded-full opacity-[0.4]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 12%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 12%, transparent) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                maskImage: "radial-gradient(circle, #000 60%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(circle, #000 60%, transparent 100%)",
              }}
            />
            <span className="absolute h-full w-full rounded-full border border-primary/10" />
            <span className="absolute h-[72%] w-[72%] rounded-full border border-primary/15" />
            <span className="absolute h-[44%] w-[44%] rounded-full border border-primary/20" />

            <span className="absolute h-[72%] w-[72%] animate-ping rounded-full border border-primary/25 [animation-duration:3s]" />

            <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-glow)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </span>
          </div>

          {/* copy + directions */}
          <div>
            <SectionHeading
              eyebrow={t("tag")}
              title={t("title")}
              description={t("description")}
            />
            <p className="mt-5 text-sm font-bold text-heading">{address}</p>

            <Button href={directionsHref} target="_blank" className="mt-8">
              {t("directionsLabel")}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 rtl:rotate-180">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
