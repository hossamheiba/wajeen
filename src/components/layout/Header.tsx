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

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useLenisInstance } from "./SmoothScrollProvider";

/** Shared capsule surface: white, hairline border, fully rounded, no shadow. */
/** One spring for every shape change, so the capsule, the toggle and the panel
 *  all settle together rather than racing each other. */
const SHAPE = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

const CAPSULE =
  "rounded-full border border-black/10 bg-white shadow-[var(--shadow-card)]";

/** Points down, turns up when open. Not directional, so it never mirrors. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** The unlinked sub-entries, shared by both breakpoints. */
function SubList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((label) => (
        <li key={label}>
          {/* A span, not a link: these pages do not exist yet, and an anchor
              that goes nowhere is a promise the site cannot keep. */}
          <span className="block cursor-default whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-muted">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const lenisRef = useLenisInstance();
  const reduce = useReducedMotion() === true;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /**
   * The "About Us" sub-list, opened two independent ways.
   *
   * They are separate on purpose. With one shared flag, moving the pointer
   * onto the control opened the panel and the click that followed immediately
   * closed it again — so the button looked broken to anyone using a mouse.
   * Hover and press now cannot cancel each other: leaving the item closes it,
   * pressing keeps it, and the keyboard never touches the hover half at all.
   */
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pressOpen, setPressOpen] = useState(false);
  const aboutOpen = hoverOpen || pressOpen;
  const closeAbout = () => {
    setHoverOpen(false);
    setPressOpen(false);
  };
  const aboutToggleRef = useRef<HTMLButtonElement>(null);
  /** Mirrors `scrolled` so the scroll handler can spot the transition without
   *  re-subscribing on every state change. */
  const wasScrolled = useRef(false);

  useEffect(() => {
    // The header never leaves. Scrolling down folds the links away and the
    // capsule closes around the mark; scrolling back to the top opens it again.
    // The 60/40 split is hysteresis — closing and opening at the same pixel
    // would make the capsule flutter for anyone resting there.
    //
    // The comparison is against a ref rather than reading `scrolled`, so this
    // fires on the *transition* only. Closing the menu on every scroll event
    // instead made the plus look broken: Lenis keeps emitting events for about
    // a second after the wheel stops, so a click during that glide opened the
    // capsule and the next event slammed it shut. And the close lives here, in
    // the event, rather than inside a `setScrolled` updater — an updater has
    // to be pure, and React may run it more than once.
    const onScroll = () => {
      const y = window.scrollY;
      const next = wasScrolled.current ? y > 40 : y > 60;
      if (next === wasScrolled.current) return;

      wasScrolled.current = next;
      setScrolled(next);
      // Cleared on BOTH transitions, not just on closing. `menuOpen` is a
      // manual override of the capsule's natural state, so it has to go the
      // moment that state changes — otherwise scrolling back to the top left
      // it set, and on the next collapse the button came back already showing
      // a cross, so the first click closed the capsule instead of opening it.
      setMenuOpen(false);
      // The sub-list belongs to the nav that is folding away with it; leaving
      // it open would spring it back the next time the capsule opens.
      closeAbout();
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

  // Escape closes the sub-list first and hands focus back to the control that
  // opened it, so a keyboard user is never left somewhere they cannot see.
  useEffect(() => {
    if (!aboutOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeAbout();
      aboutToggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aboutOpen]);

  // Lock the page behind the open panel — but only where a panel actually
  // opens. From `lg` up the plus widens the capsule in place and the page
  // behind it is still the page; locking there left the wheel dead while the
  // nav was expanded, which read as the button not working at all.
  //
  // Lenis owns wheel/touch, so asking the document to hide its overflow would
  // not stop it — `stop()` is what makes Lenis preventDefault those events, and
  // it neither moves the scroll position nor reflows the page when the
  // scrollbar goes away. Cleanup runs on every close and on unmount, so
  // scrolling is always handed back.
  useEffect(() => {
    if (!menuOpen) return;
    if (typeof window === "undefined") return;
    // Matches the `lg:hidden` on the panel itself, so the two cannot disagree.
    if (window.matchMedia("(min-width: 1024px)").matches) return;

    const lenis = lenisRef?.current;
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [menuOpen, lenisRef]);

  /**
   * Six destinations. "About Us" carries a sub-list whose entries are
   * placeholders: the pages behind them have not been decided yet, so they are
   * shown and not linked. An anchor pointing nowhere would be a promise the
   * site cannot keep.
   *
   * The labels sit here rather than in `src/messages/*.json` because that file
   * is the CMS's content — versioned, published, and pinned at 962 key paths by
   * tests on both sides. Placeholder text is not content, and it will be
   * replaced by real names the moment those pages exist.
   */
  const placeholderPages =
    locale === "ar"
      ? ["صفحة 1", "صفحة 2", "صفحة 3"]
      : ["Page 1", "Page 2", "Page 3"];

  const navItems: Array<{ label: string; href: string; children?: string[] }> = [
    { label: t("home"), href: "/" },
    { label: t("about"), href: "/about", children: placeholderPages },
    { label: t("projects"), href: "/projects" },
    { label: t("business"), href: "/business" },
    { label: t("careers"), href: "/careers" },
    { label: t("contact"), href: "/contact" },
  ];

  /** `usePathname` is locale-stripped, so these compare against bare hrefs. */
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /** From `lg` up the links live in the capsule: on by default, folded away
   *  once scrolled, and brought back by the plus. Below `lg` there is never
   *  room for them inline, so the plus opens the panel instead. */
  const inlineNav = !scrolled || menuOpen;

  return (
    <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-50 p-4">
      <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-3">
        {/* ── Left island: mark, and the links when they fit ──
            `layout` is what makes the close and the open read as one motion:
            framer measures the capsule before and after the links mount or
            unmount and animates the width between the two, so the capsule
            closes around the mark instead of snapping to its new size. */}
        <motion.div
          layout={!reduce}
          transition={SHAPE}
          className={`pointer-events-auto flex items-center overflow-hidden ${CAPSULE}`}
        >
          <Link
            href="/"
            aria-label="Wjeen International Construction Co., Ltd."
            className="flex shrink-0 items-center rounded-full p-2.5"
          >
            <Logo variant="mark" preload className="h-8 w-auto" />
          </Link>

          <AnimatePresence initial={false} mode="popLayout">
            {inlineNav ? (
              <motion.nav
                key="inline-nav"
                layout={!reduce}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    // The links leave quickly and arrive late, so they are gone
                    // before the capsule finishes closing and do not appear
                    // until it has room for them.
                    : { opacity: { duration: 0.16, delay: inlineNav ? 0.14 : 0 } }
                }
                className="hidden lg:block"
              >
                <ul className="flex items-center gap-7 pe-6 ps-1">
                  {navItems.map((item) => (
                    <li
                      key={item.href}
                      className={item.children ? "relative" : undefined}
                      onPointerEnter={item.children ? () => setHoverOpen(true) : undefined}
                      onPointerLeave={item.children ? closeAbout : undefined}
                    >
                      <span className="flex items-center gap-1">
                        <Link
                          href={item.href}
                          aria-current={isCurrent(item.href) ? "page" : undefined}
                          className={`block whitespace-nowrap py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                            isCurrent(item.href) || (item.children && aboutOpen)
                              ? "text-primary"
                              : "text-gray-muted hover:text-primary"
                          }`}
                        >
                          {item.label}
                        </Link>
                        {item.children ? (
                          <button
                            ref={aboutToggleRef}
                            type="button"
                            aria-expanded={aboutOpen}
                            aria-controls="about-sublist-lg"
                            aria-label={item.label}
                            onClick={() => setPressOpen((open) => !open)}
                            className={`-ms-0.5 rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                              aboutOpen ? "text-primary" : "text-gray-muted hover:text-primary"
                            }`}
                          >
                            <Chevron open={aboutOpen} />
                          </button>
                        ) : null}
                      </span>

                      <AnimatePresence>
                        {item.children && aboutOpen ? (
                          <motion.div
                            id="about-sublist-lg"
                            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                            transition={{ duration: reduce ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className={`absolute start-0 top-full z-10 min-w-[13rem] overflow-hidden py-1 ${CAPSULE} !rounded-ui`}
                          >
                            <SubList items={item.children} />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            ) : null}
          </AnimatePresence>

          {/* Below `lg` the plus is the only way to the links, so it is always
              there. From `lg` it appears only once the capsule has closed —
              at the top of the page the links are already in front of you and
              a control to reveal them would be noise. It stays after a click
              so the same button folds the capsule back. */}
          <motion.button
            layout={!reduce}
            transition={SHAPE}
            type="button"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className={`me-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover ${
              scrolled ? "" : "lg:hidden"
            }`}
          >
            {/* A plus that turns into a cross — one rotation, no icon swap, so
                there is nothing to cross-fade and the two states are the same
                two strokes. */}
            <motion.svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="h-3.5 w-3.5"
              animate={{ rotate: menuOpen ? 45 : 0 }}
              transition={reduce ? { duration: 0 } : SHAPE}
            >
              <path d="M8 1.5v13M1.5 8h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </motion.svg>
          </motion.button>
        </motion.div>

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
            // Mobile only. From `lg` the plus widens the capsule and the links
            // come back inline, which is the whole point of the shape.
            className="pointer-events-auto mx-auto mt-3 max-w-[1600px] lg:hidden"
          >
            <ul className={`flex flex-col gap-1 p-3 ${CAPSULE} !rounded-frame`}>
              {navItems.map((item) => (
                <li key={item.href}>
                  <span className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => {
                        setMenuOpen(false);
                        closeAbout();
                      }}
                      aria-current={isCurrent(item.href) ? "page" : undefined}
                      className={`block flex-1 rounded-ui px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                        isCurrent(item.href)
                          ? "bg-primary/5 text-primary"
                          : "text-gray-muted hover:bg-black/5 hover:text-primary"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {item.children ? (
                      <button
                        type="button"
                        aria-expanded={aboutOpen}
                        aria-controls="about-sublist-sm"
                        aria-label={item.label}
                        onClick={() => setPressOpen((open) => !open)}
                        className="me-1 rounded-ui p-3 text-gray-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Chevron open={aboutOpen} />
                      </button>
                    ) : null}
                  </span>

                  <AnimatePresence initial={false}>
                    {item.children && aboutOpen ? (
                      <motion.div
                        id="about-sublist-sm"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <SubList items={item.children} className="ps-3" />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
