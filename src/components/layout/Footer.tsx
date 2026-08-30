import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";

/**
 * Custom-drawn social glyphs, consistent with the rest of the site's inline
 * SVG icon language rather than pulling in an icon library.
 */
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" {...props}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="8" cy="8.3" r="0.9" fill="currentColor" stroke="none" />
      <path d="M8 11v6M12.2 17v-3.6c0-1.6 1.1-2.4 2.2-2.4 1.1 0 2.1.8 2.1 2.4V17" />
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="4" />
      <path d="M10.5 9.3v5.4l4.8-2.7-4.8-2.7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArrowGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const SOCIALS = [
  { key: "instagram", href: "https://instagram.com", Icon: InstagramIcon },
  { key: "x", href: "https://x.com", Icon: XIcon },
  { key: "linkedin", href: "https://linkedin.com", Icon: LinkedInIcon },
  { key: "youtube", href: "https://youtube.com", Icon: YoutubeIcon },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  const columns = [
    {
      title: t("company"),
      links: [
        [tNav("about"), "/about"],
        [tNav("projects"), "/projects"],
        [tNav("business"), "/business"],
        [tNav("sustainability"), "/#sustainability"],
        [tNav("careers"), "/careers"],
      ],
    },
    {
      title: t("sectors"),
      links: [
        [tNav("businessSub.infrastructure"), "/business"],
        [tNav("businessSub.energy"), "/business"],
        [tNav("businessSub.buildings"), "/business"],
        [t("resources"), "/business"],
      ],
    },
    {
      title: t("media"),
      links: [
        [t("newsroom"), "/#news"],
        [t("gallery"), "/#news"],
        [t("mediaKit"), "/#news"],
      ],
    },
    {
      title: t("contact"),
      links: [
        ["Riyadh, KSA", "/contact"],
        ["info@wjeen.com", "/contact"],
        ["+966 11 000 0000", "/contact"],
      ],
    },
  ] as const;

  return (
    <footer className="relative overflow-hidden bg-off-white text-heading">
      {/* glow orbs */}
      <div className="pointer-events-none absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-primary/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 end-1/4 h-96 w-96 rounded-full bg-primary/[0.05] blur-[120px]" />

      {/* faint dotted grid, fading toward the top-start corner */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,21,95,0.10) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(60% 55% at 25% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(60% 55% at 25% 0%, #000 40%, transparent 100%)",
        }}
      />

      {/* oversized watermark wordmark, tucked behind the columns */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 start-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[18vw] font-black leading-none tracking-tight text-primary/[0.04] sm:text-[9rem]"
      >
        WJEEN
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo className="h-7 w-auto" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-gray-muted">
              {t("description")}
            </p>
            <div className="mt-7 flex gap-3">
              {SOCIALS.map(({ key, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={key}
                  className="group flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-gray-muted transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-[0_12px_28px_-10px_var(--color-primary-glow)]"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
                  {col.title}
                </div>
                <div className="flex flex-col gap-3">
                  {col.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="group inline-flex items-center gap-1.5 text-sm text-gray-muted transition-colors duration-200 hover:text-primary"
                    >
                      <span>{label}</span>
                      <ArrowGlyph className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 rtl:rotate-180 rtl:translate-x-1 rtl:group-hover:-translate-x-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-black/5">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-gray-muted sm:flex-row lg:px-10">
          <div>&copy; 2026 Wjeen International Co., Ltd. {t("rights")}</div>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-primary">
              {t("privacy")}
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              {t("terms")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
