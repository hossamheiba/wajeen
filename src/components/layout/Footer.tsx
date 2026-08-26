import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";

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
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo onDark className="h-7 w-auto" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              {t("description")}
            </p>
            <div className="mt-6 flex gap-3">
              {["IG", "X", "IN", "YT"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-xs font-semibold text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {col.title}
                </div>
                <div className="flex flex-col gap-3">
                  {col.links.map(([label, href]) => (
                    <Link key={label} href={href} className="text-sm text-white/70 hover:text-white">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/50 sm:flex-row lg:px-10">
          <div>&copy; 2026 Wjeen International Co., Ltd. {t("rights")}</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">
              {t("privacy")}
            </a>
            <a href="#" className="hover:text-white">
              {t("terms")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
