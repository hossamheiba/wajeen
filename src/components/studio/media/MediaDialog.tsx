"use client";

/**
 * A centred modal for the media screens.
 *
 * The studio already has a `Drawer`, but that one is the small-screen sidebar:
 * it is `lg:hidden` and slides from the inline start. Picking an image is a
 * different job on every screen size, so this is its own component rather than
 * a prop on that one.
 *
 * What it must get right is the same either way — focus is trapped, `Esc`
 * closes, the page behind does not scroll, and focus returns to whatever
 * opened it. A picker a keyboard cannot leave is worse than no picker.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconClose } from "@/components/studio/icons";

export function MediaDialog({
  open,
  onClose,
  title,
  closeLabel,
  wide = false,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])',
    )?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previous;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary-deep/50 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.99 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-frame bg-white shadow-[var(--shadow-float)] sm:rounded-frame ${
              wide ? "sm:max-w-4xl" : "sm:max-w-lg"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.07] bg-white px-5 py-3.5">
              <h2 className="t-small font-bold text-heading">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="grid h-8 w-8 place-items-center rounded-ui text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <IconClose width={16} height={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">{children}</div>

            {footer ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-black/[0.07] bg-off-white px-5 py-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
