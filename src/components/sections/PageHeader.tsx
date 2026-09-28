import { ContentImage } from "@/components/ui/ContentImage";
import { SplitReveal } from "@/components/ui/SplitReveal";

interface PageHeaderProps {
  /** Any of these may be empty; an empty one is not drawn. */
  tag?: string;
  title?: string;
  description?: string;
  /** Where the dashboard keeps this page's banner — see `lib/mediaSlots`. */
  namespace: string;
  path?: string;
  /** The banner that ships with the build, behind whatever the CMS binds. */
  image: string;
  minHeight?: string;
}

export function PageHeader({
  tag,
  title,
  description,
  namespace,
  path = "header",
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
        <ContentImage
          namespace={namespace}
          path={path}
          fallbackSrc={image}
          alt=""
          fill
          preload
          className="object-cover opacity-75"
          sizes="100vw"
        />
        {/* Bottom-weighted wash — see --gradient-page-header in globals.css. */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-page-header)" }}
        />
      </div>

      {/* Each line is drawn only if the content has one. A page whose header
          carries just a description — because its title would have repeated
          the section right beneath it — gets a banner with that description,
          not an empty eyebrow and a blank h1. */}
      <div className="relative z-10 container-page">
        {tag ? <div className="t-eyebrow text-white/70">{tag}</div> : null}
        {title ? (
          <SplitReveal
            as="h1"
            type="words"
            className="t-display mt-3 max-w-3xl pb-2 text-white"
            eager
          >
            {title}
          </SplitReveal>
        ) : null}
        {description ? (
          <p className="mt-7 max-w-xl text-base leading-relaxed text-white/70">{description}</p>
        ) : null}
      </div>
    </section>
  );
}
