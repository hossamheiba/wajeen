"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/ui/Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems: Array<{ label: string; href: string; sub?: [string, string][] }> = [
    {
      label: t("about"),
      href: "/about",
      sub: [
        [t("aboutSub.story"), "/about#story"],
        [t("aboutSub.mission"), "/about#mission"],
        [t("aboutSub.leadership"), "/about#leadership"],
        [t("aboutSub.governance"), "/about#governance"],
      ],
    },
    { label: t("projects"), href: "/projects" },
    {
      label: t("business"),
      href: "/business",
      sub: [
        [t("businessSub.infrastructure"), "/business"],
        [t("businessSub.energy"), "/business"],
        [t("businessSub.buildings"), "/business"],
      ],
    },
    { label: t("sustainability"), href: "/#sustainability" },
    { label: t("media"), href: "/#news" },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-dark-green/90 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Wjeen & Partners">
          <LogoMark className="h-9 w-auto" />
          <span className="text-lg font-bold text-white">
            Wjeen <span className="text-orange">&</span> Partners
          </span>
        </Link>

        <nav className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.href} className="group relative py-8">
                <Link href={item.href} className="text-sm font-medium text-white/90 transition-colors hover:text-orange">
                  {item.label}
                </Link>
                {item.sub && (
                  <div className="absolute start-0 top-full min-w-[220px] rounded-xl border border-white/10 bg-dark-green-surface p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 [transform:translateY(8px)] group-hover:[transform:translateY(0)] pointer-events-none group-hover:pointer-events-auto">
                    {item.sub.map(([label, href]) => (
                      <Link
                        key={label}
                        href={href}
                        className="block rounded-lg px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-orange"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher className="hidden text-sm font-medium text-white/80 hover:text-orange sm:block" />
          <Link
            href="/contact"
            className="hidden rounded-full bg-orange px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_var(--color-orange-glow)] sm:inline-flex"
          >
            {t("contact")}
          </Link>
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          >
            <span
              className={`h-[1.5px] w-6 bg-white transition-transform ${mobileOpen ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-[1.5px] w-6 bg-white transition-transform ${mobileOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-dark-green px-6 py-6 lg:hidden">
          <ul className="flex flex-col gap-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-base font-medium text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <LocaleSwitcher className="py-2 text-base font-medium text-orange" />
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
