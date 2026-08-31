"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useLenisInstance } from "./SmoothScrollProvider";

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const lenisRef = useLenisInstance();
  const reduce = useReducedMotion() === true;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the menu — the usual way out of an overlay for anyone not
  // using a pointer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Lock the page behind the open menu. Lenis owns wheel/touch, so asking the
  // document to hide its overflow would not stop it — `stop()` is what makes
  // Lenis preventDefault those events, and it neither moves the scroll
  // position nor reflows the page when the scrollbar goes away.
  //
  // The cleanup runs on every close *and* on unmount, so scrolling is always
  // handed back: there is no path that leaves Lenis stopped.
  useEffect(() => {
    if (!mobileOpen) return;
    const lenis = lenisRef?.current;
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [mobileOpen, lenisRef]);

  /** Six flat destinations — one page each, no dropdowns. */
  const navItems: Array<{ label: string; href: string }> = [
    { label: t("home"), href: "/" },
    { label: t("about"), href: "/about" },
    { label: t("projects"), href: "/projects" },
    { label: t("business"), href: "/business" },
    { label: t("careers"), href: "/careers" },
    { label: t("contact"), href: "/contact" },
  ];

  /** `usePathname` is locale-stripped, so these compare against bare hrefs. */
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    // The header's own background is not decided here: `.site-header` in
    // globals.css picks the transparent or the solid skin from `data-scrolled`
    // and from whatever surface the page's top section declares. See the
    // "Header surface contract" block there.
    <header
      data-scrolled={scrolled ? "" : undefined}
      className="site-header fixed inset-x-0 top-0 z-50 transition-colors duration-300"
    >
      <div className="container-page grid h-[88px] grid-cols-[1fr_auto_1fr] items-center">
        <Link href="/" aria-label="Wjeen International Co., Ltd." className="justify-self-start">
          <Logo onDark preload className="h-7 w-auto" />
        </Link>

        <nav className="hidden justify-self-center lg:block">
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.href} className="py-8">
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className="text-sm font-medium text-white/90 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-self-end gap-4">
          <LocaleSwitcher className="hidden text-sm font-medium text-white/80 hover:text-white sm:block" />
          <button
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            id="mobile-nav"
            className="overflow-hidden border-t border-white/10 bg-primary lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 py-6">
              {navItems.map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : i * 0.04, duration: reduce ? 0 : 0.25 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    className="block py-2.5 text-base font-medium text-white"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
              <li>
                <LocaleSwitcher className="py-2.5 text-base font-medium text-white underline decoration-white/40 underline-offset-4" />
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
