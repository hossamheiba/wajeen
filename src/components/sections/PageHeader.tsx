import Image, { type StaticImageData } from "next/image";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface PageHeaderProps {
  tag: string;
  title: string;
  description: string;
  image: StaticImageData;
  minHeight?: string;
}

export function PageHeader({
  tag,
  title,
  description,
  image,
  minHeight = "min-h-[50vh]",
}: PageHeaderProps) {
  return (
    <section
      data-surface="dark"
      className={`relative flex ${minHeight} flex-col justify-center overflow-hidden bg-primary pb-16 pt-40`}
    >
      <div className="absolute inset-0">
        {/* The banner photo is the LCP element on every page that uses this
            header, so it preloads. (`priority` is deprecated in Next 16 —
            `preload` says the same thing without the ambiguity.) */}
        <Image src={image} alt="" fill preload className="object-cover opacity-75" sizes="100vw" />
        {/* Bottom-weighted wash — see --gradient-page-header in globals.css. */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-page-header)" }}
        />
      </div>

      <div className="relative z-10 container-page">
        <div className="t-eyebrow text-white/70">{tag}</div>
        <SplitReveal
          as="h1"
          type="words"
          className="t-display mt-3 max-w-3xl pb-2 text-white"
          eager
        >
          {title}
        </SplitReveal>
        <p className="mt-7 max-w-xl text-base leading-relaxed text-white/70">{description}</p>
      </div>
    </section>
  );
}
