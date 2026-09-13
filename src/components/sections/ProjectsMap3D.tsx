"use client";

/**
 * The React side of the 3D projects map.
 *
 * It owns the canvas, the handful of HTML overlays that sit on it — the
 * labels that follow markers, the geographic context line, the controls —
 * and the decision of whether 3D happens at all. The scene itself lives in
 * `lib/saudiMap3d.ts`, which is imported only after this component knows
 * WebGL is available — so a browser without it never downloads three.js, and
 * the parent falls back to the flat `SaudiReach` map.
 *
 * Labels are HTML rather than text in the scene. Arabic needs a real text
 * shaper, which the browser has and WebGL does not, and HTML text stays crisp
 * at every zoom.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { SceneController, SceneLocation } from "@/lib/saudiMap3d";

export interface Map3DCopy {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  hint: string;
  /** The same, for a finger: no Ctrl, no click. */
  hintTouch: string;
  description: string;
  projectsHere: (count: number) => string;
  /** The country, first link in the context line. */
  country: string;
  controls: string;
  explore: string;
  stopExplore: string;
  tourProgress: (step: number, total: number) => string;
}

/** The presentation tour, run by the parent; this only shows and starts it. */
export interface MapTour {
  /** Offered at all — only where the panel can show each stop beside the map. */
  available: boolean;
  running: boolean;
  step: number;
  total: number;
  /** How long this stop lasts, in milliseconds, for the progress line. */
  dwell: number;
  onStart: () => void;
  onStop: () => void;
}

function hasWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

export function ProjectsMap3D({
  locations,
  selectedLocationId,
  selectedTitle,
  highlightedRegion,
  hoverLabel,
  onPick,
  onHover,
  onUnavailable,
  onInteract,
  onSleep,
  copy,
  context,
  tour,
  insetRef,
  rtl,
}: {
  locations: SceneLocation[];
  selectedLocationId: string | null;
  /** The chosen project's name, shown above its marker. */
  selectedTitle: string | null;
  highlightedRegion: string | null;
  /** Text for the marker under the pointer, or null. */
  hoverLabel: (locationId: string) => string;
  onPick: (locationId: string) => void;
  onHover: (locationId: string | null) => void;
  onUnavailable: () => void;
  /** The visitor took hold of the map or its controls. */
  onInteract: () => void;
  /** The map went off screen or the tab was hidden. */
  onSleep: () => void;
  copy: Map3DCopy;
  /** Where the context line points: the chosen place, if any. */
  context: {
    regionName: (regionId: string) => string;
    selectedRegion: string | null;
    city: string | null;
  };
  tour: MapTour;
  /** UI floating over the map's inline end; the camera frames around it. */
  insetRef?: RefObject<HTMLElement | null>;
  rtl: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
  const selectedLabelRef = useRef<HTMLDivElement>(null);
  const hoverLabelRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduce = useReducedMotion();

  // Handlers change every render; the scene is built once. Refs let it always
  // call the current ones without being torn down and rebuilt.
  const live = useRef({ onPick, onHover, onUnavailable, onInteract, onSleep });
  const labelState = useRef({ selected: selectedLocationId, hovered });
  useEffect(() => {
    live.current = { onPick, onHover, onUnavailable, onInteract, onSleep };
    labelState.current = { selected: selectedLocationId, hovered };
  });

  // ------------------------------------------------------------ build once

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasWebGL()) {
      live.current.onUnavailable();
      return;
    }

    let disposed = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Place the two labels over their markers, straight to the DOM. */
    const placeLabels = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const pairs: [HTMLDivElement | null, string | null, boolean][] = [
        [selectedLabelRef.current, labelState.current.selected, true],
        [
          hoverLabelRef.current,
          labelState.current.hovered !== labelState.current.selected
            ? labelState.current.hovered
            : null,
          false,
        ],
      ];
      for (const [el, id, isSelected] of pairs) {
        if (!el) continue;
        const point = id ? scene.project(id) : null;
        if (!point || !point.visible) {
          el.style.opacity = "0";
          continue;
        }
        // The chosen project's name rises with its beam, which waits for the
        // location trail to reach the city — so the name arrives last, as the
        // end of the gesture rather than ahead of it.
        el.style.opacity = isSelected ? (point.emphasis > 0.6 ? "1" : "0") : "1";
        el.style.transform = `translate(${point.x}px, ${point.labelY}px) translate(-50%, -100%)`;
      }
    };

    import("@/lib/saudiMap3d")
      .then(({ createSaudiScene }) => {
        if (disposed) return;
        const scene = createSaudiScene({
          canvas,
          reduceMotion,
          onPick: (id) => live.current.onPick(id),
          onHover: (id) => {
            setHovered(id);
            live.current.onHover(id);
          },
          onFrame: placeLabels,
          onInteract: () => live.current.onInteract(),
        });
        sceneRef.current = scene;
        // A read-only seam for the end-to-end suite: where a location's
        // marker is on screen, and what the scene is doing. The scene is
        // pixels; nothing else can say.
        Object.defineProperty(canvas, "projectLocation", {
          configurable: true,
          value: (id: string) => scene.project(id),
        });
        Object.defineProperty(canvas, "inspectMap", {
          configurable: true,
          value: () => scene.inspect(),
        });
        setReady(true);
      })
      .catch(() => {
        if (!disposed) live.current.onUnavailable();
      });

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------ sync

  useEffect(() => {
    if (ready) sceneRef.current?.setLocations(locations);
  }, [ready, locations]);

  useEffect(() => {
    if (ready) sceneRef.current?.setSelected(selectedLocationId);
  }, [ready, selectedLocationId, locations]);

  useEffect(() => {
    if (ready) sceneRef.current?.setHighlightedRegion(highlightedRegion);
  }, [ready, highlightedRegion]);

  // Keep the camera framed around whatever floats over the map. Measured
  // rather than assumed, because the panel is hidden below `xl` and its width
  // is whatever its content makes it.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!ready || !wrap) return;
    const measure = () => {
      const panel = insetRef?.current;
      const visible = panel && panel.offsetParent !== null;
      // Panel width plus the gap it floats at, so the map clears it.
      const width = visible ? panel.getBoundingClientRect().width + 32 : 0;
      sceneRef.current?.setInset(width, rtl);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    if (insetRef?.current) ro.observe(insetRef.current);
    return () => ro.disconnect();
  }, [ready, insetRef, rtl]);

  // Nothing renders while the map is off screen or the tab is hidden: a
  // WebGL loop on a marketing page has no business running unseen.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!ready || !wrap) return;
    let onScreen = true;
    const update = () => {
      const awake = onScreen && document.visibilityState === "visible";
      sceneRef.current?.setActive(awake);
      if (!awake) live.current.onSleep();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        // The way in plays once a good part of the map is in view — not at
        // its first pixel, which a visitor would never see.
        if (entry.intersectionRatio >= 0.4) sceneRef.current?.enter();
        update();
      },
      { threshold: [0, 0.4] },
    );
    io.observe(wrap);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [ready]);

  // ------------------------------------------------------------ overlays

  // Every control on the map is a hand on the camera; a tour gives way.
  const zoomIn = () => {
    onInteract();
    sceneRef.current?.zoomBy(0.78);
  };
  const zoomOut = () => {
    onInteract();
    sceneRef.current?.zoomBy(1.28);
  };
  const showKingdom = () => {
    onInteract();
    sceneRef.current?.resetView();
  };

  const iconButton =
    "grid h-8 w-8 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
  const glass =
    "border border-white/10 bg-primary/90 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.45)] backdrop-blur-md";

  const { regionName, selectedRegion, city } = context;
  const crumbs = [
    { key: "country", text: copy.country },
    ...(selectedRegion ? [{ key: `r-${selectedRegion}`, text: regionName(selectedRegion) }] : []),
    ...(selectedRegion && city ? [{ key: `c-${city}`, text: city }] : []),
  ];

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {/* The scene is a picture of the list beside it, which is the
          accessible way through the projects. It is described, not
          navigated. */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={copy.description}
        // What is placed, for the end-to-end suite — see `projectLocation`.
        data-locations={locations.map((l) => `${l.id}:${l.count}`).join(" ")}
        // Vertical swipes keep scrolling the page on a phone; the map takes
        // horizontal drags and two-finger pinches.
        className={`block h-full w-full touch-pan-y transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={selectedLabelRef}
        data-map-label="selected"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 max-w-[16rem] rounded-ui bg-white px-3 py-1.5 text-xs font-bold text-primary opacity-0 shadow-[var(--shadow-lift)] transition-opacity duration-300"
      >
        {selectedTitle}
      </div>
      <div
        ref={hoverLabelRef}
        data-map-label="hover"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-ui bg-primary-deep/90 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200"
      >
        {hovered ? hoverLabel(hovered) : null}
      </div>

      {ready ? (
        <>
          {/* Where on the ground the map is pointing: the Kingdom, then the
              chosen region and city. The same hierarchy the scene shows, in
              words, so it reads without any instruction. */}
          <p
            data-map-context
            className="pointer-events-none absolute start-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-muted rtl:tracking-normal sm:start-6 sm:top-5"
          >
            <AnimatePresence initial={false}>
              {crumbs.map((crumb, index) => (
                <motion.span
                  key={crumb.key}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-center gap-2 ${
                    index === crumbs.length - 1 && index > 0 ? "text-heading" : ""
                  }`}
                >
                  {index > 0 ? (
                    // One glyph for both directions: it is bidi-mirrored, so
                    // an Arabic line turns it to point the right way itself.
                    <span aria-hidden="true" className="text-gray-muted/60">
                      ›
                    </span>
                  ) : null}
                  {crumb.text}
                </motion.span>
              ))}
            </AnimatePresence>
          </p>

          {/* Along the start edge, clear of the panel that floats over the
              end of the map on wide screens. */}
          <div className="absolute bottom-4 start-4 flex flex-wrap items-center gap-2.5 sm:bottom-5 sm:start-6">
            <div
              role="group"
              aria-label={copy.controls}
              className={`flex items-center rounded-full p-1 ${glass}`}
            >
              <button
                type="button"
                aria-label={copy.zoomIn}
                onClick={zoomIn}
                className={iconButton}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-white/15" />
              <button
                type="button"
                aria-label={copy.zoomOut}
                onClick={zoomOut}
                className={iconButton}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-white/15" />
              <button
                type="button"
                aria-label={copy.reset}
                onClick={showKingdom}
                className={iconButton}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />
                </svg>
              </button>
            </div>

            {tour.available ? (
              <button
                type="button"
                onClick={tour.running ? tour.onStop : tour.onStart}
                aria-label={
                  tour.running
                    ? `${copy.stopExplore} — ${copy.tourProgress(tour.step + 1, tour.total)}`
                    : copy.explore
                }
                className={`relative hidden h-10 items-center gap-2 overflow-hidden rounded-full ps-3.5 pe-4 text-xs font-bold text-white transition-colors hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 xl:inline-flex ${glass}`}
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  {tour.running ? (
                    <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" />
                  ) : (
                    <path d="M5 3.2v9.6L13 8z" fill="currentColor" />
                  )}
                </svg>
                <span>{tour.running ? copy.stopExplore : copy.explore}</span>
                {tour.running ? (
                  <span aria-hidden="true" className="font-semibold tabular-nums text-white/55">
                    {copy.tourProgress(tour.step + 1, tour.total)}
                  </span>
                ) : null}
                {/* How long until the next stop — a hairline, not a clock. */}
                {tour.running && !reduce ? (
                  <motion.span
                    key={tour.step}
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: tour.dwell / 1000, ease: "linear" }}
                    className="absolute inset-x-3 bottom-1 h-px origin-left bg-white/45 rtl:origin-right"
                  />
                ) : null}
              </button>
            ) : null}

            <p
              className={`pointer-events-none max-w-[15rem] text-[11px] leading-snug text-gray-muted ${
                tour.running ? "invisible" : ""
              }`}
            >
              <span className="pointer-coarse:hidden">{copy.hint}</span>
              <span className="hidden pointer-coarse:inline">{copy.hintTouch}</span>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
