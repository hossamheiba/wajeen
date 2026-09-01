import Image from "next/image";
import logoNavy from "../../../public/brand/wjeen-logo.png";
import logoWhite from "../../../public/brand/wjeen-logo-white.png";
import markNavy from "../../../public/brand/wjeen-mark.png";
import markWhite from "../../../public/brand/wjeen-mark-white.png";

/**
 * Two ink colors of the same mark, both on a transparent background:
 * navy for light surfaces, white for dark ones. Pick with `onDark` —
 * no background chip behind either.
 *
 * The artwork is rebuilt from the company profile's cover page. The file the
 * site shipped with had the diamond's top and bottom points cropped off by
 * the image edge, which read as a logo that was not fully showing. This one
 * carries the whole mark plus a small transparent margin so it never sits
 * flush against its container.
 *
 * `variant="mark"` drops the wordmark and keeps only the diamond, cropped from
 * the same artwork so the two can never disagree. The header uses it — at the
 * size a floating pill allows, the company name would be unreadable anyway and
 * the mark alone reads instantly.
 */
export function Logo({
  className = "",
  onDark = false,
  variant = "full",
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
  /** `full` = diamond + company name. `mark` = diamond only. */
  variant?: "full" | "mark";
  preload?: boolean;
}) {
  const src = variant === "mark"
    ? (onDark ? markWhite : markNavy)
    : (onDark ? logoWhite : logoNavy);
  return (
    <Image
      src={src}
      alt="Wjeen International Construction Co., Ltd."
      // `max-w-none` is load-bearing. Tailwind's preflight sets
      // `img { max-width: 100% }`, and the header puts this in a `1fr` grid
      // column that is narrower than the mark below the `sm` breakpoint — so
      // the width was being clamped while `h-*` held the height, squashing the
      // logo out of proportion (5.78:1 down to 3.78:1 at 360px). There is
      // plenty of room on the row; only the column was short.
      className={`max-w-none ${className}`.trim()}
      preload={preload}
    />
  );
}
