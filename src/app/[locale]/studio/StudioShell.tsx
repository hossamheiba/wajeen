"use client";

/**
 * The studio chrome, and the one place that decides whether there is a session.
 *
 * The check is a real API call, not a cookie sniff: the cookie is HttpOnly on
 * another host and this code cannot read it. Asking the API is also the honest
 * question — "will my requests work?" — rather than a guess about cookie state.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, listBlocks, logout, type BlockList } from "@/lib/studio/api";

interface StudioContextValue {
  locale: string;
  blocks: BlockList | null;
  reload: () => Promise<void>;
  loading: boolean;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used inside the studio shell.");
  return value;
}

const NAV = [
  { href: "", label: "Sections" },
  { href: "/publish", label: "Publish" },
  { href: "/versions", label: "Versions" },
];

export function StudioShell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname?.endsWith("/studio/login") ?? false;

  const [blocks, setBlocks] = useState<BlockList | null>(null);
  const [loading, setLoading] = useState(!isLogin);

  const reload = useCallback(async () => {
    try {
      setBlocks(await listBlocks());
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthenticated) {
        const next = encodeURIComponent(pathname ?? `/${locale}/studio`);
        router.replace(`/${locale}/studio/login?next=${next}`);
        return;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [locale, pathname, router]);

  useEffect(() => {
    // `loading` already starts false on the login route, so there is nothing
    // to set here — only the fetch to start.
    // The rule cannot see through the awaits: every setState in these loaders
    // runs after a network round-trip, not synchronously on mount. Fetching on
    // mount is the whole job of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isLogin) void reload();
  }, [isLogin, reload]);

  const value = useMemo(
    () => ({ locale, blocks, reload, loading }),
    [locale, blocks, reload, loading],
  );

  if (isLogin) {
    return <div className="min-h-dvh bg-neutral-50 text-neutral-900">{children}</div>;
  }

  return (
    <StudioContext.Provider value={value}>
      <div className="min-h-dvh bg-neutral-50 text-neutral-900" dir="ltr">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <Link href={`/${locale}/studio`} className="text-sm font-semibold tracking-tight">
              Wjeen Studio
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => {
                const href = `/${locale}/studio${item.href}`;
                const active = item.href
                  ? pathname?.startsWith(href)
                  : pathname === href;
                return (
                  <Link
                    key={item.label}
                    href={href}
                    className={`rounded px-3 py-1.5 ${
                      active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ms-auto flex items-center gap-3 text-sm">
              {blocks ? (
                <span className="text-neutral-500">
                  {blocks.pendingDrafts} draft{blocks.pendingDrafts === 1 ? "" : "s"}
                  {blocks.currentRevision !== null ? ` · v${blocks.currentRevision}` : ""}
                </span>
              ) : null}
              <button
                type="button"
                className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
                onClick={async () => {
                  try {
                    await logout();
                  } finally {
                    router.replace(`/${locale}/studio/login`);
                  }
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {loading && !blocks ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : (
            children
          )}
        </main>
      </div>
    </StudioContext.Provider>
  );
}
