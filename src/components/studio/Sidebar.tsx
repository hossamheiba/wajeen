"use client";

/**
 * The studio's rail, and the one place the brand is worn at full strength.
 *
 * Navy ground, white type, one accent — no gradient, no glass. The active
 * state is a soft fill plus an inline-start bar that slides between items with
 * a shared layout id, so the eye tracks one moving marker instead of watching
 * two rows blink.
 *
 * Collapsing keeps the icons and hands their names to tooltips. The names stay
 * in `aria-label` either way, so nothing is lost to a screen reader or a
 * keyboard when the text is gone.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  IconDrafts,
  IconLogout,
  IconOverview,
  IconPublish,
  IconSections,
  IconVersions,
} from "./icons";
import { Tooltip } from "./ui/Tooltip";

export const STUDIO_NAV = [
  {
    heading: null,
    items: [{ key: "overview", href: "", label: "Overview", Icon: IconOverview }],
  },
  {
    heading: "Content",
    items: [
      { key: "sections", href: "/sections", label: "Sections", Icon: IconSections },
      { key: "drafts", href: "/drafts", label: "Drafts", Icon: IconDrafts },
    ],
  },
  {
    heading: "Publishing",
    items: [
      { key: "publish", href: "/publish", label: "Publish", Icon: IconPublish },
      { key: "versions", href: "/versions", label: "Versions", Icon: IconVersions },
    ],
  },
] as const;

const STATIC_ROUTES = new Set(["sections", "drafts", "publish", "versions", "login"]);

/**
 * Which rail item owns the current URL.
 *
 * The editor lives at `/studio/<key>`, which is not a nav route of its own, so
 * it lights up Sections — that is where the reader came from and where Back
 * goes.
 */
export function activeKey(pathname: string | null): string {
  if (!pathname) return "overview";
  const match = pathname.match(/\/studio(?:\/([^/]+))?/);
  const segment = match?.[1];
  if (!segment) return "overview";
  if (STATIC_ROUTES.has(segment)) return segment;
  return "sections";
}

export function Sidebar({
  locale,
  collapsed,
  draftCount,
  currentVersion,
  username,
  onNavigate,
  onSignOut,
}: {
  locale: string;
  collapsed: boolean;
  draftCount: number | null;
  currentVersion: number | null;
  username: string | null;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const active = activeKey(pathname);
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full flex-col bg-primary text-white">
      <div
        className={`flex h-16 shrink-0 items-center border-b border-white/10 ${
          collapsed ? "justify-center px-2" : "px-5"
        }`}
      >
        <Link
          href={`/${locale}/studio`}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Wjeen Studio home"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-ui bg-white/12 text-sm font-black tracking-tight">
            W
          </span>
          {collapsed ? null : (
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-tight">WJEEN</span>
              <span className="block text-[11px] font-medium tracking-[0.16em] text-primary-on-dark">
                STUDIO
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4" aria-label="Studio">
        {STUDIO_NAV.map((group, index) => (
          <div key={group.heading ?? "root"} className={index > 0 ? "mt-6" : ""}>
            {group.heading && !collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
                {group.heading}
              </p>
            ) : null}
            {group.heading && collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-white/15" />
            ) : null}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active === item.key;
                const badge =
                  item.key === "drafts" && draftCount ? draftCount : null;

                return (
                  <li key={item.key}>
                    <Tooltip label={item.label} disabled={!collapsed}>
                      <Link
                        href={`/${locale}/studio${item.href}`}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={`relative flex h-10 w-full items-center rounded-ui text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                          collapsed ? "justify-center px-0" : "gap-3 px-3"
                        } ${
                          isActive ? "text-white" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                        }`}
                      >
                        {isActive ? (
                          <motion.span
                            layoutId="studio-nav-active"
                            transition={
                              reduced
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 480, damping: 40 }
                            }
                            className="absolute inset-0 rounded-ui bg-white/12"
                          >
                            <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-primary-on-dark" />
                          </motion.span>
                        ) : null}

                        <item.Icon width={18} height={18} className="relative shrink-0" />
                        {collapsed ? null : (
                          <span className="relative truncate">{item.label}</span>
                        )}
                        {badge && !collapsed ? (
                          <span className="relative ms-auto rounded-full bg-primary-on-dark px-1.5 py-0.5 text-[11px] font-bold text-primary">
                            {badge}
                          </span>
                        ) : null}
                        {badge && collapsed ? (
                          <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-on-dark" />
                        ) : null}
                      </Link>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2.5">
        {currentVersion !== null && !collapsed ? (
          <p className="mb-2 px-3 text-[11px] font-medium text-white/65">
            Live version <span className="font-bold text-white/75">#{currentVersion}</span>
          </p>
        ) : null}

        <div
          className={`flex items-center rounded-ui bg-white/[0.06] ${
            collapsed ? "justify-center p-2" : "gap-2.5 p-2.5"
          }`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-on-dark text-xs font-black uppercase text-primary">
            {(username ?? "?").slice(0, 2)}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-xs font-bold">{username ?? "Signed in"}</span>
                <span className="block text-[11px] text-white/65">Editor</span>
              </span>
              <Tooltip label="Sign out">
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="ms-auto rounded-ui p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <IconLogout width={16} height={16} />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
