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
      className={`relative flex ${minHeight} flex-col justify-center overflow-hidden bg-primary pb-16 pt-40`}
    >
      <div className="absolute inset-0">
        <Image src={image} alt="" fill priority className="object-cover opacity-75" sizes="100vw" />
        {/* Bottom-weighted wash: the photo stays readable up top while the
            text band below keeps roughly an 8:1 contrast ratio. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(15,21,95,0.92) 0%, rgba(15,21,95,0.72) 35%, rgba(15,21,95,0.34) 70%, rgba(15,21,95,0.14) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <div className="text-xs font-semibold uppercase tracking-widest text-white/70">{tag}</div>
        <SplitReveal
          as="h1"
          type="words"
          className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.15] text-white lg:text-6xl"
          eager
        >
          {title}
        </SplitReveal>
        <p className="mt-7 max-w-xl text-base leading-relaxed text-white/70">{description}</p>
      </div>
    </section>
  );
}
