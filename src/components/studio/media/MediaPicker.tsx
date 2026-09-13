"use client";

/**
 * Choose an image for one slot: from the library, or by uploading a new one.
 *
 * Both tabs end in the same place — an asset id — so the caller never has to
 * care which route was taken. Uploading something that is already stored is
 * not an error here: the server answers 409 with the row that holds those
 * exact bytes, and the picker selects it, which is what a person meant anyway.
 */

import { useCallback, useEffect, useState } from "react";
import { SearchInput } from "@/components/studio/ui/SearchInput";
import { ApiError } from "@/lib/studio/api";
import { listAssets, uploadAsset, type MediaAsset } from "@/lib/studio/media";
import type { Copy } from "@/lib/studio/i18n";
import { MediaDialog } from "./MediaDialog";
import { MediaThumb } from "./MediaThumb";
import { MediaUpload } from "./MediaUpload";

export function MediaPicker({
  open,
  onClose,
  onPick,
  copy,
  category,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
  copy: Copy;
  /** Prefills the upload's category and the first filter shown. */
  category: string;
  title?: string;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { results } = await listAssets({ status: "active" });
      setAssets(results);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("library");
      setError(null);
      void load();
    }
  }, [open, load]);

  const term = search.trim().toLowerCase();
  // The slot's own category floats to the front rather than filtering the rest
  // away: a client logo is usually wanted for a client, but never only.
  const visible = assets
    .filter((asset) =>
      term
        ? asset.original_name.toLowerCase().includes(term) ||
          asset.alt_en.toLowerCase().includes(term) ||
          asset.alt_ar.includes(search.trim())
        : true,
    )
    .sort((a, b) => Number(b.category === category) - Number(a.category === category));

  const onUpload = async (
    pending: { file: File; altEn: string; altAr: string },
    uploadCategory: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const asset = await uploadAsset({
        file: pending.file,
        altEn: pending.altEn,
        altAr: pending.altAr,
        category: uploadCategory,
      });
      onPick(asset);
      onClose();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        const body = failure.body as { asset?: MediaAsset } | undefined;
        if (body?.asset) {
          onPick(body.asset);
          onClose();
          return;
        }
      }
      setError(failure instanceof ApiError ? failure.detail : String(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <MediaDialog
      open={open}
      onClose={onClose}
      title={title ?? copy.media.pick}
      closeLabel={copy.media.close}
      wide
    >
      <div role="tablist" className="mb-4 flex gap-1 rounded-ui bg-black/[0.04] p-1">
        {(["library", "upload"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-8 flex-1 rounded-ui text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${
              tab === key ? "bg-white text-heading shadow-[var(--shadow-badge)]" : "text-gray-muted"
            }`}
          >
            {key === "library" ? copy.media.pickFromLibrary : copy.media.pickUpload}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <MediaUpload
          copy={copy}
          category={category}
          busy={busy}
          error={error}
          onSubmit={onUpload}
        />
      ) : (
        <>
          <div className="mb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              label={copy.media.searchLabel}
              placeholder={copy.media.searchLabel}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="studio-skeleton aspect-[4/3] rounded-ui bg-black/[0.06]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-muted">{copy.media.empty}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {visible.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(asset);
                      onClose();
                    }}
                    className="group w-full overflow-hidden rounded-ui border border-black/[0.07] bg-white text-start transition-all hover:border-primary/40 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-off-white">
                      <MediaThumb
                        asset={asset}
                        fit={asset.category === "client" ? "contain" : "cover"}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="truncate px-2 py-1.5 text-[11px] font-semibold text-heading">
                      {asset.original_name}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </MediaDialog>
  );
}
