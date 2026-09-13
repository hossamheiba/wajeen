"use client";

/**
 * Choosing a file, describing it, and sending it.
 *
 * The preview is a `blob:` URL made from the local file, so the picture is on
 * screen before a byte has been uploaded and the person writing the alt text
 * can see what they are describing. It is revoked when the component unmounts
 * or the choice changes; a blob URL that is never revoked holds the whole file
 * in memory for the life of the tab.
 *
 * Two refusals happen here, before any request: a file that is not an image at
 * all, and one over the size limit. Both are checked again on the server —
 * this pair is courtesy, not security, because anything a browser checks an
 * attacker can skip.
 */

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/studio/ui/Button";
import { IconUpload } from "@/components/studio/icons";
import type { Copy } from "@/lib/studio/i18n";
import { humanBytes } from "./MediaThumb";

const MAX_BYTES = 10 * 1024 * 1024;

export interface PendingUpload {
  file: File;
  previewUrl: string;
  altEn: string;
  altAr: string;
}

export function MediaUpload({
  copy,
  category,
  busy,
  error,
  onSubmit,
}: {
  copy: Copy;
  /** Prefilled from the screen that opened this, e.g. `project`. */
  category: string;
  busy: boolean;
  error: string | null;
  onSubmit: (pending: PendingUpload, category: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altEn, setAltEn] = useState("");
  const [altAr, setAltAr] = useState("");
  const [local, setLocal] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // The blob URL is made in the event handler that accepts the file, not in an
  // effect: creating it is a side effect of a choice a person made, and doing
  // it during render would mean a second render just to show the preview. The
  // effect below exists only to hand it back — an unrevoked blob URL pins the
  // whole file in memory for the life of the tab.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const choose = (next: File | null) => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  };

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!candidate.type.startsWith("image/")) {
      setLocal(copy.media.accepts);
      choose(null);
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setLocal(`${humanBytes(candidate.size)} — ${copy.media.accepts}`);
      choose(null);
      return;
    }
    setLocal(null);
    choose(candidate);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  };

  const message = local ?? error;

  return (
    <div className="flex flex-col gap-4">
      {previewUrl ? (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-ui border border-black/[0.07] bg-off-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={copy.media.preview}
              className="mx-auto max-h-64 w-auto object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-muted">
            <span className="truncate font-semibold text-heading">{file?.name}</span>
            <span>{file ? humanBytes(file.size) : ""}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              choose(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {copy.media.replaceFile}
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-ui border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/[0.04]"
              : "border-black/12 bg-off-white"
          }`}
        >
          <IconUpload width={26} height={26} className="text-gray-muted" />
          <div className="t-small font-semibold text-heading">{copy.media.dropHere}</div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            {copy.media.dropOr}
          </Button>
          <p className="text-[11px] text-gray-muted">{copy.media.accepts}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {file ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.media.altEn}
            </span>
            <input
              value={altEn}
              onChange={(event) => setAltEn(event.target.value)}
              dir="ltr"
              className="h-10 rounded-ui border border-black/10 bg-white px-3 text-sm text-heading focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.media.altAr}
            </span>
            <input
              value={altAr}
              onChange={(event) => setAltAr(event.target.value)}
              dir="rtl"
              className="h-10 rounded-ui border border-black/10 bg-white px-3 text-sm text-heading focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </label>
          <p className="text-[11px] text-gray-muted sm:col-span-2">{copy.media.altHelp}</p>
        </div>
      ) : null}

      {message ? (
        <p role="alert" className="rounded-ui bg-red-500/[0.07] px-3 py-2 text-xs font-semibold text-red-700">
          {message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!file || busy}
          onClick={() =>
            file &&
            previewUrl &&
            onSubmit({ file, previewUrl, altEn, altAr }, category)
          }
        >
          {busy ? copy.media.uploading : copy.media.upload}
        </Button>
      </div>
    </div>
  );
}
