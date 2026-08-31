"use client";

import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type Lenis from "lenis";
import { useLenis } from "@/hooks/useLenis";

/**
 * Publishes the single Lenis instance so descendants can reach it. Only the
 * mobile menu uses it, to lock background scrolling while it is open.
 *
 * The value is a ref object, so it is stable for the life of the provider and
 * consuming it never causes a re-render.
 */
const LenisContext = createContext<RefObject<Lenis | null> | null>(null);

/** The app's Lenis instance, or null if called outside the provider. */
export function useLenisInstance() {
  return useContext(LenisContext);
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useLenis();
  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
