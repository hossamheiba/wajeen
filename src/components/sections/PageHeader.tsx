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
      className={`relative flex ${minHeight} flex-col justify-center overflow-hidden bg-dark-green pb-16 pt-40`}
    >
      <div className="absolute inset-0">
        <Image src={image} alt="" fill priority className="object-cover opacity-35" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-green via-dark-green/80 to-dark-green/50" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <div className="text-xs font-semibold uppercase tracking-widest text-orange">{tag}</div>
        <SplitReveal
          as="h1"
          type="words"
          className="mt-3 max-w-3xl text-4xl font-extrabold text-white lg:text-6xl"
          eager
        >
          {title}
        </SplitReveal>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">{description}</p>
      </div>
    </section>
  );
}
