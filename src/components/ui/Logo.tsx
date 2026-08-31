import Image from "next/image";
import logoNavy from "../../../public/brand/wjeen-logo.png";
import logoWhite from "../../../public/brand/wjeen-logo-white.png";

/**
 * Two ink colors of the same mark, both on a transparent background:
 * navy for light surfaces, white for dark ones. Pick with `onDark` —
 * no background chip behind either.
 */
export function Logo({
  className = "",
  onDark = false,
  /**
   * Preload the mark from <head>. Only the header's copy wants this: it is
   * above the fold on every page. The footer renders the same component far
   * below it, and blanket `priority` here used to preload that copy too —
   * a high-priority fetch competing with the hero for no reason.
   */
  preload = false,
}: {
  className?: string;
  onDark?: boolean;
  preload?: boolean;
}) {
  return (
    <Image
      src={onDark ? logoWhite : logoNavy}
      alt="Wjeen International Co., Ltd."
      className={className}
      preload={preload}
    />
  );
}
