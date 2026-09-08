import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";

function ArrowGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  // The same translated values the contact page and the JSON-LD already use —
  // this column used to hard-code the English ones, so the Arabic footer read
  // "Riyadh, KSA" and an English email under an Arabic heading.
  const tInfo = useTranslations("contactPage.info");

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
        [tNav("businessSub.infrastructure"), "/business#infrastructure"],
        [tNav("businessSub.energy"), "/business#energy"],
        [tNav("businessSub.buildings"), "/business#buildings"],
        [t("resources"), "/business"],
      ],
    },
    {
      title: t("media"),
      links: [
        [t("gallery"), "/#gallery"],
        [tNav("projects"), "/projects"],
        [t("resources"), "/about"],
      ],
    },
    {
      title: t("contact"),
      links: [
        [tInfo("address.short"), "/contact"],
        [tInfo("email.value"), "/contact"],
        [tInfo("phone.value"), "/contact", "ltr"],
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
            "radial-gradient(circle at 1px 1px, var(--color-grid-dot) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(60% 55% at 25% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(60% 55% at 25% 0%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative container-page py-20">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_2fr]">
          <div className="-mt-1">
            <Logo className="h-6 w-auto sm:h-7.5" />
            <p className="mt-5 max-w-sm t-small text-gray-muted">
              {t("description")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <div className="mb-4 t-eyebrow text-primary">
                  {col.title}
                </div>
                <div className="flex flex-col gap-3">
                  {col.links.map(([label, href, run]) => (
                    <Link
                      key={label}
                      href={href}
                      className="group inline-flex items-center gap-1.5 text-sm text-gray-muted transition-colors duration-200 hover:text-primary"
                    >
                      {/* A phone number is one LTR run of weak characters, so
                          in the Arabic footer bidi moved the "+" to the far end
                          and reversed the digit groups: "+966 11 000 0000"
                          rendered as "0000 000 11 966+". <bdi dir="ltr">
                          isolates it. Everything else keeps the page direction
                          — forcing ltr on the Arabic labels would be wrong. */}
                      {run === "ltr" ? (
                        <bdi dir="ltr">{label}</bdi>
                      ) : (
                        <span>{label}</span>
                      )}
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
        <div className="container-page flex flex-col items-center gap-4 py-6 text-center text-xs text-gray-muted sm:flex-row sm:justify-center">
          <div>
            &copy; {new Date().getFullYear()} {t("companyName")} {t("rights")}
          </div>
        </div>
      </div>
    </footer>
  );
}
