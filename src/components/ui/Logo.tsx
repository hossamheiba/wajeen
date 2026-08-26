import Image from "next/image";
import logo from "../../../public/brand/wjeen-logo.png";

/**
 * The brand logo PNG has dark navy ink on a transparent background, so it
 * needs a light backdrop to stay legible on the site's dark-green chrome
 * (header, footer, loader). `onDark` wraps it in a white chip for those spots.
 */
export function Logo({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  const img = (
    <Image
      src={logo}
      alt="Wjeen International Co., Ltd."
      className={className}
      priority
    />
  );

  if (!onDark) return img;

  return (
    <span className="inline-flex items-center rounded-lg bg-white px-3 py-1.5">
      {img}
    </span>
  );
}
