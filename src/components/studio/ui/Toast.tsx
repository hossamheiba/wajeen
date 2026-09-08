"use client";

/**
 * Transient confirmations.
 *
 * Before this, "Draft saved." was grey text beside the button that saved it —
 * easy to miss and easy to mistake for a label. A toast says the thing once,
 * out of the way of the work, and leaves.
 *
 * Errors do not auto-dismiss: a save that failed is not something to notice
 * later.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconCheck, IconClose, IconWarning } from "../icons";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<{
  show: (message: string, tone?: Tone) => void;
} | null>(null);

/** Returns the show function directly: `toast("Saved.")` reads better than
 *  `toast.show("Saved.")` at every one of its call sites. */
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider.");
  return value.show;
}

const TONE_STYLES: Record<Tone, string> = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error: "border-red-200 bg-white text-red-800",
  info: "border-black/10 bg-white text-heading",
};

export function ToastProvider({
  children,
  dismissLabel = "Dismiss",
}: {
  children: ReactNode;
  dismissLabel?: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const reduced = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      if (tone !== "error") {
        window.setTimeout(() => dismiss(id), 4000);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-ui border px-3.5 py-2.5 text-sm shadow-[var(--shadow-lift)] ${TONE_STYLES[toast.tone]}`}
            >
              {toast.tone === "error" ? (
                <IconWarning width={16} height={16} className="mt-0.5 shrink-0" />
              ) : (
                <IconCheck width={16} height={16} className="mt-0.5 shrink-0" />
              )}
              <span className="font-medium">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={dismissLabel}
                className="-me-1 ms-auto rounded p-0.5 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <IconClose width={14} height={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
