"use client";

/**
 * The live preview.
 *
 * What is inside the frame is the site's own Section component — the same
 * module the public page imports. That is the whole point of the preview and
 * the one thing that must never be replaced with a mock: a preview that
 * renders a copy stops being evidence.
 *
 * The frame is scaled but its layout box is not, so it lives absolutely inside
 * a clipped container. Without that it keeps its full 1440px width and covers
 * the form beside it.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { isPreviewMessage } from "@/lib/preview/contract";
import { Badge } from "./ui/Badge";
import { studioCopy } from "@/lib/studio/i18n";
import {
  IconClose,
  IconDesktop,
  IconExpand,
  IconPhone,
  IconRefresh,
  IconTablet,
} from "./icons";

const DEVICES = [
  { key: "desktop", copy: "desktop", width: 1440, Icon: IconDesktop },
  { key: "tablet", copy: "tablet", width: 834, Icon: IconTablet },
  { key: "phone", copy: "phone", width: 390, Icon: IconPhone },
] as const;

export type Device = (typeof DEVICES)[number]["key"];

/** `fit` is not a number: it is whatever makes the device width fit the panel. */
const ZOOMS = ["fit", 0.5, 0.75, 1] as const;
type Zoom = (typeof ZOOMS)[number];

/** Never taller than this much of the viewport; past it the frame scrolls. */
const MAX_FRAME_VH = 0.72;
/** Before the frame has said anything, and for a section that reports nothing. */
const FALLBACK_HEIGHT = 620;

export function PreviewPanel({
  src,
  title,
  locale,
  frameRef,
  onReload,
  rtl = false,
  className = "",
}: {
  src: string;
  title: string;
  locale: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onReload: () => void;
  rtl?: boolean;
  className?: string;
}) {
  const copy = studioCopy(locale);
  const [device, setDevice] = useState<Device>("desktop");
  const [choice, setChoice] = useState<Zoom>("fit");
  const [full, setFull] = useState(false);
  /** The panel's own width, measured — what "fit" is fitted to. */
  const [shellWidth, setShellWidth] = useState(0);
  /** What the frame says it needs, in its own CSS pixels. */
  const [contentHeight, setContentHeight] = useState(FALLBACK_HEIGHT);
  const shellRef = useRef<HTMLDivElement>(null);

  const width = DEVICES.find((option) => option.key === device)!.width;
  const fitZoom = shellWidth > 0 ? Math.min(1, shellWidth / width) : 0.75;
  const zoom = choice === "fit" ? fitZoom : choice;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const measure = () => setShellWidth(shell.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [full]);

  /**
   * The frame tells us its height; we give it exactly that, scaled, up to a
   * share of the viewport. A short section is shown whole with no dead space,
   * a long one scrolls instead of being cut off at an arbitrary line.
   */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type !== "wjeen:preview:size") return;
      const reported = event.data.height;
      if (!Number.isFinite(reported) || reported <= 0) return;
      // A section sized in viewport units measures itself against the frame it
      // was just given, so tiny differences would chase each other. Only a
      // real change moves the frame.
      setContentHeight((current) => (Math.abs(current - reported) > 8 ? reported : current));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const frameHeight = useCallback(() => {
    if (typeof window === "undefined") return FALLBACK_HEIGHT * zoom;
    return Math.min(contentHeight * zoom, window.innerHeight * MAX_FRAME_VH);
  }, [contentHeight, zoom]);

  useEffect(() => {
    if (!full) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [full]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/[0.07] px-3 py-2">
      <div className="flex items-center gap-0.5" role="group" aria-label={copy.preview.size}>
        {DEVICES.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-label={copy.preview[option.copy]}
            aria-pressed={device === option.key}
            onClick={() => setDevice(option.key)}
            className={`rounded-ui p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              device === option.key
                ? "bg-primary text-white"
                : "text-gray-muted hover:bg-black/[0.05] hover:text-heading"
            }`}
          >
            <option.Icon width={16} height={16} />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5" role="group" aria-label={copy.preview.zoom}>
        {ZOOMS.map((level) => (
          <button
            key={String(level)}
            type="button"
            aria-pressed={choice === level}
            onClick={() => setChoice(level)}
            className={`rounded-ui px-2 py-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              choice === level
                ? "bg-primary/10 text-primary"
                : "text-gray-muted hover:bg-black/[0.05] hover:text-heading"
            }`}
          >
            {level === "fit" ? copy.preview.fit : `${Math.round(level * 100)}%`}
          </button>
        ))}
      </div>

      <Badge tone="neutral">{locale.toUpperCase()}</Badge>

      <div className="ms-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={onReload}
          aria-label={copy.preview.reload}
          className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <IconRefresh width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={() => setFull((current) => !current)}
          aria-label={full ? copy.preview.exitFullScreen : copy.preview.fullScreen}
          aria-pressed={full}
          className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {full ? <IconClose width={16} height={16} /> : <IconExpand width={16} height={16} />}
        </button>
      </div>
    </div>
  );

  /**
   * `flex-1` means `flex-basis: 0%`, which wins over a height for the main
   * size in a column flex container — and this container's own height is
   * content-driven, so the frame collapsed to nothing. Full screen genuinely
   * has a height to fill (the fixed overlay), so only that case flexes.
   */
  const frame = (
    <div
      className={`relative overflow-hidden bg-off-white ${full ? "min-h-0 flex-1" : ""}`}
      style={full ? undefined : { height: Math.round(frameHeight()) }}
    >
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        className="absolute top-0 border-0"
        style={{
          insetInlineStart: 0,
          width,
          height: `${100 / zoom}%`,
          // Physical on purpose: `transform-origin` has no logical form, so it
          // has to follow the document direction explicitly or the scaled frame
          // slides out of its own container in Arabic.
          transformOrigin: rtl ? "top right" : "top left",
          transform: `scale(${zoom})`,
        }}
      />
    </div>
  );

  if (full) {
    return (
      <div ref={shellRef} className="fixed inset-0 z-50 flex h-dvh flex-col bg-white">
        {toolbar}
        {frame}
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`flex flex-col overflow-hidden rounded-ui border border-black/[0.07] bg-white shadow-[var(--shadow-card)] ${className}`.trim()}
    >
      {toolbar}
      {frame}
    </div>
  );
}
