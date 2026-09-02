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

import { useEffect, useState, type RefObject } from "react";
import { Badge } from "./ui/Badge";
import {
  IconClose,
  IconDesktop,
  IconExpand,
  IconPhone,
  IconRefresh,
  IconTablet,
} from "./icons";

const DEVICES = [
  { key: "desktop", label: "Desktop", width: 1440, Icon: IconDesktop },
  { key: "tablet", label: "Tablet", width: 834, Icon: IconTablet },
  { key: "phone", label: "Phone", width: 390, Icon: IconPhone },
] as const;

export type Device = (typeof DEVICES)[number]["key"];

const ZOOMS = [0.5, 0.75, 1] as const;

export function PreviewPanel({
  src,
  title,
  locale,
  frameRef,
  onReload,
  className = "",
}: {
  src: string;
  title: string;
  locale: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onReload: () => void;
  className?: string;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState<number>(0.75);
  const [full, setFull] = useState(false);

  const width = DEVICES.find((option) => option.key === device)!.width;

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
      <div className="flex items-center gap-0.5" role="group" aria-label="Preview size">
        {DEVICES.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-label={option.label}
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

      <div className="flex items-center gap-0.5" role="group" aria-label="Zoom">
        {ZOOMS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={zoom === level}
            onClick={() => setZoom(level)}
            className={`rounded-ui px-2 py-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              zoom === level
                ? "bg-primary/10 text-primary"
                : "text-gray-muted hover:bg-black/[0.05] hover:text-heading"
            }`}
          >
            {Math.round(level * 100)}%
          </button>
        ))}
      </div>

      <Badge tone="neutral">{locale.toUpperCase()}</Badge>

      <div className="ms-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={onReload}
          aria-label="Reload preview"
          className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <IconRefresh width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={() => setFull((current) => !current)}
          aria-label={full ? "Exit full screen" : "Full screen preview"}
          aria-pressed={full}
          className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {full ? <IconClose width={16} height={16} /> : <IconExpand width={16} height={16} />}
        </button>
      </div>
    </div>
  );

  const frame = (
    <div className={`relative flex-1 overflow-hidden bg-off-white ${full ? "" : "h-[62vh]"}`}>
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        className="absolute left-0 top-0 origin-top-left border-0"
        style={{
          width,
          height: `${100 / zoom}%`,
          transform: `scale(${zoom})`,
        }}
      />
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {toolbar}
        {frame}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-ui border border-black/[0.07] bg-white shadow-[var(--shadow-card)] ${className}`.trim()}
    >
      {toolbar}
      {frame}
    </div>
  );
}
