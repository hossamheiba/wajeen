"use client";

/**
 * The vertical-slice studio screen: edit the hero namespace, watch the real
 * hero react.
 *
 * Deliberately plain. It exists to prove the pipeline — form state → draft
 * message tree → postMessage → the site's own component — not to be the CMS.
 * There is no hero markup anywhere in this file, by design: the only hero on
 * screen is the one inside the iframe, which is the one the site ships.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  PREVIEW_PROTOCOL_VERSION,
  isPreviewMessage,
} from "@/lib/preview/contract";

interface Slide {
  line1: string;
  highlight: string;
  line2: string;
}

/**
 * The hero namespace as stored. The four fields this screen edits are named;
 * the index signature is what protects everything else — `hero.scroll` is in
 * the messages and no field here touches it, so it has to ride along
 * untouched rather than vanish on the first keystroke.
 */
export interface HeroData {
  slides: Slide[];
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  [key: string]: unknown;
}

const DEVICES = [
  { key: "phone", label: "Phone", width: 390 },
  { key: "tablet", label: "Tablet", width: 834 },
  { key: "desktop", label: "Desktop", width: 1440 },
] as const;

export function HeroEditor({
  locale,
  initialData,
}: {
  locale: string;
  initialData: HeroData;
}) {
  const [data, setData] = useState<HeroData>(initialData);
  const [previewLocale, setPreviewLocale] = useState(locale);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["key"]>("desktop");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const send = useCallback((next: HeroData) => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      {
        type: "wjeen:preview:update",
        v: PREVIEW_PROTOCOL_VERSION,
        locale: previewLocale,
        namespace: "hero",
        data: next,
      },
      // Same-origin app; never "*".
      window.location.origin,
    );
    setSent((n) => n + 1);
  }, [previewLocale]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type === "wjeen:preview:ready") {
        setReady(true);
        setError(null);
        // Push the current draft as soon as the frame says it is listening,
        // so a reload of the iframe does not lose edits.
        send(data);
      }
      if (event.data.type === "wjeen:preview:error") setError(event.data.message);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [data, send]);

  /** Every edit goes through here: update state and push the whole namespace. */
  const patch = (next: Partial<HeroData>) => {
    setData((current) => {
      const merged = { ...current, ...next };
      send(merged);
      return merged;
    });
  };

  const patchSlide = (index: number, next: Partial<Slide>) => {
    setData((current) => {
      const slides = current.slides.map((s, i) => (i === index ? { ...s, ...next } : s));
      const merged = { ...current, slides };
      send(merged);
      return merged;
    });
  };

  const frameWidth = DEVICES.find((d) => d.key === device)!.width;

  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 bg-off-white p-6 lg:grid-cols-[380px_1fr]">
      {/* ── Editor ── */}
      <div className="flex flex-col gap-4">
        <header>
          <div className="t-eyebrow text-primary">Studio · vertical slice</div>
          <h1 className="t-h4 mt-1 text-heading">Hero</h1>
          <p className="t-small mt-1 text-gray-muted">
            Edits are pushed to the frame on every keystroke. No reload, no save.
          </p>
        </header>

        <div
          role="status"
          aria-live="polite"
          className="card flex items-center justify-between gap-3 !py-3"
        >
          <span className="t-small text-heading">
            {error ? "Preview error" : ready ? "Frame connected" : "Waiting for frame…"}
          </span>
          <span className="t-small tabular-nums text-gray-muted">{sent} sent</span>
        </div>
        {error ? (
          <p className="t-small rounded-ui bg-red-50 px-4 py-3 text-red-700">{error}</p>
        ) : null}

        <div className="card flex flex-col gap-4">
          <Field
            label="Subtitle"
            value={data.subtitle}
            onChange={(v) => patch({ subtitle: v })}
            multiline
          />
          <Field
            label="Primary CTA"
            value={data.ctaPrimary}
            onChange={(v) => patch({ ctaPrimary: v })}
          />
          <Field
            label="Secondary CTA"
            value={data.ctaSecondary}
            onChange={(v) => patch({ ctaSecondary: v })}
          />
        </div>

        {data.slides.map((slide, i) => (
          <fieldset key={i} className="card flex flex-col gap-3">
            <legend className="t-eyebrow px-1 text-primary">Slide {i + 1}</legend>
            <Field
              label="Line 1"
              value={slide.line1}
              onChange={(v) => patchSlide(i, { line1: v })}
            />
            <Field
              label="Highlight"
              value={slide.highlight}
              onChange={(v) => patchSlide(i, { highlight: v })}
            />
            <Field
              label="Line 2"
              value={slide.line2}
              onChange={(v) => patchSlide(i, { line2: v })}
            />
          </fieldset>
        ))}
      </div>

      {/* ── Preview ── */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="card flex flex-wrap items-center gap-2 !py-3">
          <div className="flex gap-1" role="group" aria-label="Preview width">
            {DEVICES.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                aria-pressed={device === d.key}
                className={`rounded-ui px-3 py-2 text-xs font-bold transition-colors ${
                  device === d.key
                    ? "bg-primary text-white"
                    : "bg-off-white text-heading hover:bg-black/5"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="ms-auto flex gap-1" role="group" aria-label="Preview locale">
            {["en", "ar"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setReady(false);
                  setPreviewLocale(l);
                }}
                aria-pressed={previewLocale === l}
                className={`rounded-ui px-3 py-2 text-xs font-bold uppercase transition-colors ${
                  previewLocale === l
                    ? "bg-primary text-white"
                    : "bg-off-white text-heading hover:bg-black/5"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-frame border border-black/5 bg-white p-3">
          <iframe
            ref={frameRef}
            // `key` forces a fresh document when the locale changes, so the
            // frame's own <html dir> is re-issued by the server rather than
            // patched on the client. No `onLoad` reset here: the frame's own
            // `ready` message can arrive before the load event, and resetting
            // on load would drop a handshake that had already completed.
            key={previewLocale}
            title="Hero preview"
            src={`/${previewLocale}/__preview/hero`}
            style={{ width: frameWidth, height: 720 }}
            className="block rounded-ui border border-black/5"
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  // Deriving the id from the label alone collided across the three slide
  // fieldsets, which all have a "Line 1". Duplicate ids are invalid HTML and
  // break the label association that screen readers rely on.
  const reactId = useId();
  const id = `f-${label.replace(/\s+/g, "-").toLowerCase()}-${reactId}`;
  const shared =
    "w-full rounded-ui border border-black/10 bg-white px-3 py-2 t-small text-heading outline-none focus-visible:border-primary";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="t-eyebrow text-gray-muted">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
        />
      )}
    </div>
  );
}
