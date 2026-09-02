/**
 * Small, per-browser studio preferences.
 *
 * Exposed as an external store rather than read in an effect: `localStorage`
 * is exactly what `useSyncExternalStore` is for, and it removes the
 * render-then-correct flash that a `useEffect` read causes. The server
 * snapshot is the default, so the first paint matches what the server sent.
 *
 * Nothing important lives here. A cleared browser loses a collapsed sidebar
 * and a remembered name, and that is the whole cost.
 */

const listeners = new Set<() => void>();

export const COLLAPSED_KEY = "wjeen.studio.sidebar.collapsed";
export const USERNAME_KEY = "wjeen.studio.username";

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing the value should move this one too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private mode, or site data blocked. The default is always usable.
    return null;
  }
}

export function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* not worth failing an interaction over */
  }
  listeners.forEach((listener) => listener());
}
