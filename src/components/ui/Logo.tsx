import Image from "next/image";
import logoNavy from "../../../public/brand/wjeen-logo.png";
import logoWhite from "../../../public/brand/wjeen-logo-white.png";

/**
 * Two ink colors of the same mark, both on a transparent background:
 * navy for light surfaces, white for dark ones. Pick with `onDark` —
 * no background chip behind either.
 */
export function Logo({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Image
      src={onDark ? logoWhite : logoNavy}
      alt="Wjeen International Co., Ltd."
      className={className}
      priority
    />
  );
}
