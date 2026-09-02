"use client";

/**
 * The studio's frame: rail, topbar, and the one place that decides whether
 * there is a session.
 *
 * The session check is a real API call, not a cookie sniff — the cookie is
 * HttpOnly on another host and this code cannot read it. Asking the API is
 * also the honest question: "will my requests work?"
 *
 * Page identity (title, breadcrumb, actions) is pushed *up* from each screen
 * rather than guessed at here, so the topbar never invents an action a page
 * does not have.
 */

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Sidebar } from "@/components/studio/Sidebar";
import { Topbar, type Crumb } from "@/components/studio/Topbar";
import { Drawer } from "@/components/studio/ui/Drawer";
import { ToastProvider } from "@/components/studio/ui/Toast";
import { ApiError, listBlocks, logout, type BlockList } from "@/lib/studio/api";
import {
  COLLAPSED_KEY,
  USERNAME_KEY,
  read,
  subscribe,
  write,
} from "@/lib/studio/preferences";

interface PageMeta {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}

interface StudioContextValue {
  locale: string;
  rtl: boolean;
  blocks: BlockList | null;
  reload: () => Promise<void>;
  loading: boolean;
  username: string | null;
  setPage: (meta: PageMeta) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used inside the studio shell.");
  return value;
}

/**
 * Declares what the topbar should say for the current screen.
 *
 * `actions` is intentionally not in the dependency list — it is JSX, a new
 * object on every render, and depending on it would loop. Screens pass the
 * values they care about instead.
 */
export function usePageMeta(meta: PageMeta, deps: unknown[] = []) {
  const { setPage } = useStudio();
  useEffect(() => {
    setPage(meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function StudioShell({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname?.endsWith("/studio/login") ?? false;
  const rtl = locale === "ar";

  const [blocks, setBlocks] = useState<BlockList | null>(null);
  const [loading, setLoading] = useState(!isLogin);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState<PageMeta>({ title: "Studio" });

  // Subscribed rather than read in an effect: the server snapshot is the
  // default, so the first paint matches and nothing flashes open then shut.
  const collapsed = useSyncExternalStore(
    subscribe,
    () => read(COLLAPSED_KEY) === "1",
    () => false,
  );
  const username = useSyncExternalStore(
    subscribe,
    () => read(USERNAME_KEY),
    () => null,
  );

  const toggleCollapse = useCallback(() => {
    write(COLLAPSED_KEY, collapsed ? "0" : "1");
  }, [collapsed]);

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
    // The rule cannot see through the awaits: every setState in this loader
    // runs after a network round-trip, not synchronously on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isLogin) void reload();
  }, [isLogin, reload]);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      write(USERNAME_KEY, null);
      router.replace(`/${locale}/studio/login`);
    }
  }, [locale, router]);

  const value = useMemo(
    () => ({ locale, rtl, blocks, reload, loading, username, setPage }),
    [locale, rtl, blocks, reload, loading, username],
  );

  if (isLogin) {
    return <div className="min-h-dvh bg-off-white text-black">{children}</div>;
  }

  const rail = (
    <Sidebar
      locale={locale}
      collapsed={collapsed}
      draftCount={blocks?.pendingDrafts ?? null}
      currentVersion={blocks?.currentRevision ?? null}
      username={username}
      onNavigate={() => setDrawerOpen(false)}
      onSignOut={signOut}
    />
  );

  return (
    <StudioContext.Provider value={value}>
      <ToastProvider>
        <div
          data-studio
          className="min-h-dvh bg-off-white text-black"
          style={{ "--studio-rail": collapsed ? "72px" : "264px" } as CSSProperties}
        >
          {/* Width and the content offset both read one variable, so they can
              never disagree mid-animation and leave a gap or an overlap. */}
          <aside
            aria-label="Studio navigation"
            className="fixed inset-y-0 start-0 z-40 hidden w-[var(--studio-rail)] transition-[width] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block"
          >
            {rail}
          </aside>

          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            label="Studio navigation"
            rtl={rtl}
          >
            {rail}
          </Drawer>

          {/* Padding rather than margin: the rail is fixed, and a margin would
              collapse against the topbar's sticky backdrop. Zero below `lg`,
              where the rail is a drawer instead. */}
          <div className="min-h-dvh transition-[padding] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:ps-[var(--studio-rail)]">
            <Topbar
              title={page.title}
              subtitle={page.subtitle}
              crumbs={page.crumbs}
              actions={page.actions}
              collapsed={collapsed}
              onOpenDrawer={() => setDrawerOpen(true)}
              onToggleCollapse={toggleCollapse}
            />
            <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </StudioContext.Provider>
  );
}
