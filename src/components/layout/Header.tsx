"use client";

/**
 * Floating capsule header.
 *
 * Not a full-width bar: two islands sitting 16px in from the edges over
 * whatever the page is showing. The left capsule is white and always opaque,
 * which is why the old `data-page-surface` / `data-scrolled` skin contract is
 * gone — the nav no longer has to guess whether the section beneath it is
 * light or dark, because it never sits directly on it.
 *
 * Three states, one capsule:
 *   at rest (lg)  →  mark + every link
 *   scrolled (lg) →  mark + toggle; the links move into the drop panel
 *   below lg      →  mark + toggle, always
 *
 * The drop panel, Escape handling and Lenis scroll lock are shared by the
 * collapsed desktop state and the small-screen state, so there is one menu
 * implementation rather than two.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useLenisInstance } from "./SmoothScrollProvider";

/** Shared capsule surface: white, hairline border, fully rounded, no shadow. */
const CAPSULE =
  "rounded-full border border-black/10 bg-white shadow-[var(--shadow-card)]";

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const lenisRef = useLenisInstance();
  const reduce = useReducedMotion() === true;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 60;
      setScrolled(next);
      // Collapsing would strand an open panel beside a shrinking capsule, so
      // it closes here in the event rather than in an effect that reacts to
      // `scrolled` — that would be a setState cascading off a render.
      if (next) setMenuOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the panel — the usual way out of an overlay for anyone not
  // using a pointer.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Lock the page behind the open panel. Lenis owns wheel/touch, so asking the
  // document to hide its overflow would not stop it — `stop()` is what makes
  // Lenis preventDefault those events, and it neither moves the scroll position
  // nor reflows the page when the scrollbar goes away. Cleanup runs on every
  // close and on unmount, so scrolling is always handed back.
  useEffect(() => {
    if (!menuOpen) return;
    const lenis = lenisRef?.current;
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [menuOpen, lenisRef]);

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

  /** Links live in the capsule only while there is room; otherwise in the panel. */
  const inlineNav = !scrolled;

  return (
    <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-50 p-4">
      <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-3">
        {/* ── Left island: mark, and the links when they fit ── */}
        <div className={`pointer-events-auto flex items-center ${CAPSULE}`}>
          <Link
            href="/"
            aria-label="Wjeen International Construction Co., Ltd."
            className="flex shrink-0 items-center rounded-full p-2.5"
          >
            <Logo variant="mark" preload className="h-7 w-auto" />
          </Link>

          {inlineNav ? (
            <nav className="hidden lg:block">
              <ul className="flex items-center gap-7 pe-6 ps-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isCurrent(item.href) ? "page" : undefined}
                      className={`block py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        isCurrent(item.href)
                          ? "text-primary"
                          : "text-gray-muted hover:text-primary"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* Present whenever the links are not inline: below lg, and once
              scrolled at every width. */}
          <button
            type="button"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className={`me-1.5 flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-full bg-primary transition-colors hover:bg-primary-hover ${
              inlineNav ? "lg:hidden" : ""
            }`}
          >
            <span
              className={`h-[1.5px] w-4 bg-white transition-transform ${menuOpen ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-[1.5px] w-4 bg-white transition-transform ${menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>

        {/* ── Right island: language ── */}
        <div className={`pointer-events-auto flex items-center px-4 py-2.5 ${CAPSULE}`}>
          <LocaleSwitcher className="text-xs font-semibold uppercase tracking-wider text-gray-muted transition-colors hover:text-primary" />
        </div>
      </div>

      {/* ── Drop panel ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="site-menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto mx-auto mt-3 max-w-[1600px]"
          >
            <ul className={`flex flex-col gap-1 p-3 ${CAPSULE} !rounded-frame`}>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    className={`block rounded-ui px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                      isCurrent(item.href)
                        ? "bg-primary/5 text-primary"
                        : "text-gray-muted hover:bg-black/5 hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
