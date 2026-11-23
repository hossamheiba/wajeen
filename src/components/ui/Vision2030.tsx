"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import visionWhite from "../../../public/brand/vision2030-white.png";

/**
 * The Saudi Vision 2030 mark, for the dark surfaces it sits on — the home
 * page's hero and the footer.
 *
 * It is the reversed lockup: the bilingual wordmark and the emblem in white,
 * the eight-pointed star keeping its own colours, on a transparent ground. A
 * navy-on-white copy would need a white plate behind it on both of these
 * surfaces; this one sits straight on the photograph and on the navy.
 *
 * The mark is a government trademark and is used here unaltered apart from the
 * grey text and emblem being re-inked white, which is how the programme's own
 * reversed version is drawn. It links to the programme's site.
 */
export function Vision2030({ className = "" }: { className?: string }) {
  const locale = useLocale();
  return (
    <a
      href="https://www.vision2030.gov.sa"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-ui transition-opacity duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <Image
        src={visionWhite}
        alt={locale === "ar" ? "رؤية السعودية 2030 — المملكة العربية السعودية" : "Saudi Vision 2030 — Kingdom of Saudi Arabia"}
        // Drawn at 64–80px tall; the file is 2× that.
        sizes="120px"
        className={`w-auto max-w-none ${className}`}
      />
    </a>
  );
}
