"use client";

/**
 * The bar above the work.
 *
 * It carries the page's identity and the actions that belong to *this* page,
 * passed in rather than guessed at — a topbar that tries to know what every
 * screen needs ends up showing a disabled Save on the versions list.
 *
 * The breadcrumb is a real trail, not decoration: on the editor it is the way
 * back to Sections, which is also where the rail's active marker is sitting.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevron, IconMenu, IconSidebar } from "./icons";

export interface Crumb {
  label: string;
  href?: string;
}

export function Topbar({
  title,
  subtitle,
  crumbs = [],
  actions,
  onOpenDrawer,
  onToggleCollapse,
  collapsed,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  onOpenDrawer: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.07] bg-off-white/85 backdrop-blur-md">
      <div className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-ui border border-black/10 bg-white text-heading transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
        >
          <IconMenu width={18} height={18} />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-ui border border-black/10 bg-white text-gray-muted transition-colors hover:border-primary/40 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:grid"
        >
          <IconSidebar width={18} height={18} />
        </button>

        <div className="min-w-0 flex-1">
          {crumbs.length ? (
            <nav aria-label="Breadcrumb" className="mb-0.5">
              <ol className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-gray-muted">
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? (
                      <IconChevron width={11} height={11} className="opacity-50" />
                    ) : null}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <h1 className="truncate text-lg font-extrabold leading-tight tracking-tight text-heading">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-gray-muted">{subtitle}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
