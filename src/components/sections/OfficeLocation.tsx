"use client";

/**
 * Our Offices — the six branches, each one legible and each one reachable.
 *
 * This section used to draw a radar beacon and print the head office's
 * address beside it. The other five offices were in the content all along and
 * never reached a visitor: the beacon was decoration standing where the
 * information belonged. It is now a card per office — address, the person to
 * ask for, the numbers to call, and a directions link that opens the address
 * in Maps, so a visitor in Jubail is not sent to Jeddah.
 *
 * Numbers carry `dir="ltr"`: a phone number is written left to right in both
 * languages, and left to the page's direction an Arabic line renders `+966`
 * with the plus on the wrong end.
 *
 * Converted from a server component for Stage 3A: it reads its namespace
 * through the provider, which is what lets the studio preview swap in draft
 * messages and re-render live. It still renders in full in the server HTML.
 */

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Office {
  city: string;
  address: string;
  phone?: string;
  mobile?: string;
  email?: string;
  contact?: string;
}

const PinIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  </svg>
);

const icons = {
  person: (
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  ),
  mobile: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </>
  ),
} as const;

function Line({
  icon,
  children,
}: {
  icon: keyof typeof icons;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 text-primary"
        aria-hidden="true"
      >
        {icons[icon]}
      </svg>
      <span className="t-small min-w-0 truncate text-gray-muted">{children}</span>
    </div>
  );
}

export function OfficeLocation() {
  const t = useTranslations("location");
  const offices = t.raw("offices") as Office[];

  return (
    <section className="bg-white section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("tag")}
          title={t("title")}
          description={t("description")}
          className="max-w-3xl"
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offices.map((office) => {
            // The address is what a map can actually find; the city name is a
            // label, and for the head office it carries a title as well.
            const query = office.address?.trim() || office.city;
            const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

            return (
              <article
                key={office.city}
                className="card flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <PinIcon className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="t-h4 pt-1 text-heading">{office.city}</h3>
                </div>

                <p className="t-small mt-4 leading-relaxed text-gray-muted">
                  {office.address}
                </p>

                <div className="mt-5 space-y-2.5 border-t border-black/5 pt-5">
                  {office.contact ? <Line icon="person">{office.contact}</Line> : null}
                  {office.phone ? (
                    <Line icon="phone">
                      <a href={`tel:${office.phone.replace(/\s/g, "")}`} dir="ltr" className="hover:text-primary">
                        {office.phone}
                      </a>
                    </Line>
                  ) : null}
                  {office.mobile ? (
                    <Line icon="mobile">
                      <a href={`tel:${office.mobile.replace(/\s/g, "")}`} dir="ltr" className="hover:text-primary">
                        {office.mobile}
                      </a>
                    </Line>
                  ) : null}
                  {office.email ? (
                    <Line icon="email">
                      <a href={`mailto:${office.email}`} dir="ltr" className="hover:text-primary">
                        {office.email}
                      </a>
                    </Line>
                  ) : null}
                </div>

                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-primary transition-colors hover:text-heading"
                >
                  <PinIcon />
                  {t("directionsLabel")}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 rtl:rotate-180"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className="sr-only">— {office.city}</span>
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
