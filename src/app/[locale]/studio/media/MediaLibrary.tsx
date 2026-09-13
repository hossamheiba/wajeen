"use client";

/**
 * Every image the site can show, and what it is doing.
 *
 * The screen answers three questions in the order people ask them: what is in
 * here, where is this one used, and may I get rid of it. The usage list is not
 * a nicety — it is the difference between deleting a file and breaking a page,
 * and it comes from real rows rather than from a search through JSON.
 *
 * Deletion is refused by the database, not by this screen. What happens here
 * is the explanation: the server answers 409 with the addresses that still
 * show the image, and they are listed so the next step is obvious.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { SearchInput } from "@/components/studio/ui/SearchInput";
import { Surface } from "@/components/studio/ui/Surface";
import { useToast } from "@/components/studio/ui/Toast";
import { IconMedia, IconTrash, IconUpload, IconWarning } from "@/components/studio/icons";
import { MediaDialog } from "@/components/studio/media/MediaDialog";
import { MediaThumb, humanBytes } from "@/components/studio/media/MediaThumb";
import { MediaUpload } from "@/components/studio/media/MediaUpload";
import { ApiError } from "@/lib/studio/api";
import {
  deleteAsset,
  listAssets,
  updateAsset,
  uploadAsset,
  type MediaAsset,
} from "@/lib/studio/media";
import { studioCopy } from "@/lib/studio/i18n";
import { usePageMeta } from "../StudioShell";

const CATEGORIES = ["project", "client", "gallery", "page", "other"] as const;

export function MediaLibrary({ locale }: { locale: string }) {
  const copy = studioCopy(locale);
  const toast = useToast();

  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [use, setUse] = useState<"" | "true" | "false">("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { results } = await listAssets();
      setAssets(results);
    } catch (failure) {
      setAssets([]);
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    }
  }, [toast]);

  useEffect(() => {
    // The library is fetched once on arrival. The rule guards against
    // cascading renders; this is the external-system read the rule's own
    // documentation carves out, and the rest of the studio loads the same way.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  usePageMeta(
    {
      title: copy.media.title,
      subtitle: copy.media.subtitle,
      actions: (
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <IconUpload width={14} height={14} />
          {copy.media.upload}
        </Button>
      ),
    },
    [locale],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (assets ?? []).filter((asset) => {
      if (category && asset.category !== category) return false;
      if (use === "true" && asset.usage_count === 0) return false;
      if (use === "false" && asset.usage_count > 0) return false;
      if (!term) return true;
      return (
        asset.original_name.toLowerCase().includes(term) ||
        asset.alt_en.toLowerCase().includes(term) ||
        asset.alt_ar.includes(search.trim())
      );
    });
  }, [assets, search, category, use]);

  const onUpload = async (
    pending: { file: File; altEn: string; altAr: string },
    uploadCategory: string,
  ) => {
    setUploading(true);
    setUploadError(null);
    try {
      await uploadAsset({
        file: pending.file,
        altEn: pending.altEn,
        altAr: pending.altAr,
        category: uploadCategory,
      });
      setUploadOpen(false);
      await load();
      toast(copy.media.saved, "success");
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        setUploadError(`${copy.media.duplicate} ${copy.media.duplicateBody}`);
        await load();
        return;
      }
      setUploadError(failure instanceof ApiError ? failure.detail : String(failure));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Surface className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="lg:w-80">
            <SearchInput
              value={search}
              onChange={setSearch}
              label={copy.media.searchLabel}
              placeholder={copy.media.searchLabel}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter
              value={category}
              onChange={setCategory}
              options={[
                { value: "", label: copy.media.all },
                ...CATEGORIES.map((key) => ({ value: key, label: key })),
              ]}
              label={copy.media.category}
            />
            <Filter
              value={use}
              onChange={(next) => setUse(next as "" | "true" | "false")}
              options={[
                { value: "", label: copy.media.all },
                { value: "true", label: copy.media.used },
                { value: "false", label: copy.media.unused },
              ]}
              label={copy.media.usage}
            />
          </div>

          <div className="flex gap-1 lg:ms-auto" role="group">
            {(["grid", "list"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={`h-8 rounded-ui px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${
                  view === key
                    ? "bg-primary text-white"
                    : "bg-white text-gray-muted border border-black/10 hover:text-heading"
                }`}
              >
                {key === "grid" ? copy.media.grid : copy.media.list}
              </button>
            ))}
          </div>
        </div>
      </Surface>

      {assets === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="studio-skeleton aspect-[4/3] rounded-ui bg-black/[0.06]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Surface className="flex flex-col items-center gap-2 py-14 text-center">
          <IconMedia width={26} height={26} className="text-gray-muted" />
          <h2 className="t-small font-bold text-heading">{copy.media.empty}</h2>
          <p className="text-xs text-gray-muted">{copy.media.emptyBody}</p>
        </Surface>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => setSelected(asset)}
                className="group w-full overflow-hidden rounded-ui border border-black/[0.07] bg-white text-start shadow-[var(--shadow-card)] transition-all hover:border-primary/40 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <div className="aspect-[4/3] overflow-hidden bg-off-white">
                  <MediaThumb
                    asset={asset}
                    fit={asset.category === "client" ? "contain" : "cover"}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col gap-1 p-2.5">
                  <span className="truncate text-xs font-semibold text-heading">
                    {asset.original_name}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-muted">
                    {asset.width}×{asset.height}
                    <Badge tone={asset.usage_count > 0 ? "live" : "neutral"}>
                      {asset.usage_count > 0 ? String(asset.usage_count) : "0"}
                    </Badge>
                    {!asset.alt_en && !asset.alt_ar ? (
                      <Badge tone="warning">{copy.media.altMissing}</Badge>
                    ) : null}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Surface padded={false} className="overflow-hidden">
          <ul className="divide-y divide-black/[0.06]">
            {visible.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => setSelected(asset)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
                >
                  <div className="h-11 w-14 shrink-0 overflow-hidden rounded-[6px] bg-off-white">
                    <MediaThumb
                      asset={asset}
                      fit={asset.category === "client" ? "contain" : "cover"}
                      className="h-full w-full"
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-heading">
                    {asset.original_name}
                  </span>
                  <span className="hidden text-[11px] text-gray-muted sm:block">
                    {asset.width}×{asset.height}
                  </span>
                  <span className="hidden text-[11px] text-gray-muted md:block">
                    {humanBytes(asset.bytes)}
                  </span>
                  <Badge tone={asset.usage_count > 0 ? "live" : "neutral"}>
                    {copy.media.usedCount(asset.usage_count)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <MediaDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title={copy.media.upload}
        closeLabel={copy.media.close}
      >
        <MediaUpload
          copy={copy}
          category="other"
          busy={uploading}
          error={uploadError}
          onSubmit={onUpload}
        />
      </MediaDialog>

      <AssetDetails
        asset={selected}
        onClose={() => setSelected(null)}
        onChanged={load}
        copy={copy}
      />
    </div>
  );
}

function Filter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-ui border border-black/10 bg-white px-2.5 text-xs font-semibold text-heading focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssetDetails({
  asset,
  onClose,
  onChanged,
  copy,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  copy: ReturnType<typeof studioCopy>;
}) {
  const toast = useToast();
  const [altEn, setAltEn] = useState("");
  const [altAr, setAltAr] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    // Seeding the form from whichever asset was opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAltEn(asset?.alt_en ?? "");
    setAltAr(asset?.alt_ar ?? "");
    setBlocked(null);
    setConfirming(false);
  }, [asset]);

  if (!asset) return null;

  const save = async () => {
    setSaving(true);
    try {
      await updateAsset(asset.id, { alt_en: altEn, alt_ar: altAr });
      await onChanged();
      toast(copy.media.saved, "success");
      onClose();
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await deleteAsset(asset.id);
      await onChanged();
      toast(copy.media.saved, "success");
      onClose();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        const body = failure.body as { usage?: string[] } | undefined;
        setBlocked(body?.usage ?? []);
        setConfirming(false);
        return;
      }
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <MediaDialog
      open
      onClose={onClose}
      title={asset.original_name || copy.media.title}
      closeLabel={copy.media.close}
      wide
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {copy.media.close}
          </Button>
          {confirming ? (
            <Button variant="danger" size="sm" onClick={remove} disabled={removing}>
              {removing ? copy.media.removing : copy.media.confirmDelete}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={asset.usage_count > 0}
              title={asset.usage_count > 0 ? copy.media.inUseBody : undefined}
            >
              <IconTrash width={14} height={14} />
              {copy.media.remove}
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? copy.media.uploading : copy.media.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-ui border border-black/[0.07] bg-off-white">
          <MediaThumb
            asset={asset}
            eager
            fit={asset.category === "client" ? "contain" : "cover"}
            className="max-h-[22rem] w-full"
          />
        </div>

        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <Detail label={copy.media.dimensions} value={`${asset.width}×${asset.height}`} />
            <Detail label={copy.media.fileSize} value={humanBytes(asset.bytes)} />
            <Detail label={copy.media.type} value={asset.content_type} />
            <Detail label={copy.media.category} value={asset.category} />
          </dl>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.media.altEn}
            </span>
            <input
              value={altEn}
              dir="ltr"
              onChange={(event) => setAltEn(event.target.value)}
              className="h-10 rounded-ui border border-black/10 bg-white px-3 text-sm text-heading focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.media.altAr}
            </span>
            <input
              value={altAr}
              dir="rtl"
              onChange={(event) => setAltAr(event.target.value)}
              className="h-10 rounded-ui border border-black/10 bg-white px-3 text-sm text-heading focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
              {copy.media.usage}
            </span>
            {asset.usage.length === 0 ? (
              <p className="text-xs text-gray-muted">{copy.media.usageNone}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {asset.usage.map((where) => (
                  <li
                    key={where.id}
                    className="flex items-center justify-between gap-2 rounded-ui bg-black/[0.03] px-2.5 py-1.5 text-[11px]"
                  >
                    <code className="truncate font-mono text-heading" dir="ltr">
                      {where.address}
                    </code>
                    <Badge tone="neutral">{where.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {asset.usage_count > 0 || blocked ? (
            <p className="flex items-start gap-2 rounded-ui bg-amber-500/[0.08] px-3 py-2 text-[11px] text-amber-900">
              <IconWarning width={14} height={14} className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-bold">{copy.media.inUseTitle}.</strong>{" "}
                {copy.media.inUseBody}
              </span>
            </p>
          ) : confirming ? (
            <p className="rounded-ui bg-red-500/[0.07] px-3 py-2 text-[11px] font-semibold text-red-700">
              {copy.media.confirmDeleteBody}
            </p>
          ) : null}
        </div>
      </div>
    </MediaDialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-muted">{label}</dt>
      <dd className="font-semibold text-heading" dir="ltr">
        {value}
      </dd>
    </div>
  );
}
