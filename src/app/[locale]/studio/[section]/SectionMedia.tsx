"use client";

/**
 * The images belonging to one section, beside the fields that describe them.
 *
 * Three of the site's twenty-eight namespaces show images the content chooses:
 * a project's photograph, a client's logo, a gallery item's picture. Each row
 * of those lists is one content address, so this screen is a list of addresses
 * with a picture control on each — which is the same mental model as the field
 * tree next door, just for the part of the record that is not text.
 *
 * The entries are read from the block being edited rather than from a table
 * here, so a project added in the content editor appears in this list without
 * anything being registered twice.
 *
 * Bindings save immediately, and deliberately. They are not part of the
 * draft/publish cycle: a binding points at a file, the JSON holds no file, and
 * folding media into the content version would mean a rollback silently
 * un-replacing a photograph that was never in that revision.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/studio/ui/Badge";
import { Button } from "@/components/studio/ui/Button";
import { Surface } from "@/components/studio/ui/Surface";
import { useToast } from "@/components/studio/ui/Toast";
import { IconMedia, IconPlus } from "@/components/studio/icons";
import { GalleryEditor } from "@/components/studio/media/GalleryEditor";
import { MediaPicker } from "@/components/studio/media/MediaPicker";
import { MediaThumb } from "@/components/studio/media/MediaThumb";
import { ApiError } from "@/lib/studio/api";
import {
  listBindings,
  setGallery,
  setSlot,
  type MediaAsset,
  type MediaBinding,
} from "@/lib/studio/media";
import type { Copy } from "@/lib/studio/i18n";
import { getAt, type Json } from "@/lib/studio/paths";
import { BORROWED_MEDIA, slotsFor } from "@/lib/mediaSlots";

/**
 * Pictures come in two shapes.
 *
 * A *list* namespace draws one picture per row of its own content — a project,
 * a client, a gallery item — so its addresses are read off the record being
 * edited and a row added next door appears here without being registered.
 *
 * A *fixed* slot is a picture the section draws on its own: the hero's
 * backdrops, a section's photograph, a page's banner. Those have no row to
 * hang off, so they are registered in `lib/mediaSlots`, which the sections
 * themselves read — one address, written once, for the page and this screen.
 *
 * `gallery` is offered only where a set of photographs makes sense — a client
 * has one logo, not an album.
 */
const IMAGE_LISTS: Record<
  string,
  { listKey: string; single: "cover" | "logo"; labelKey: string; category: string; gallery: boolean }
> = {
  projectsPage: { listKey: "items", single: "cover", labelKey: "title", category: "project", gallery: true },
  clients: { listKey: "items", single: "logo", labelKey: "label", category: "client", gallery: false },
  gallery: { listKey: "items", single: "cover", labelKey: "title", category: "gallery", gallery: true },
};

export function hasManagedImages(root: string, entryKey = ""): boolean {
  return (
    root in IMAGE_LISTS ||
    slotsFor(root).length > 0 ||
    (BORROWED_MEDIA[entryKey] ?? []).some((other) => slotsFor(other).length > 0)
  );
}

interface Row {
  /** The block this picture is bound under — usually, but not always, the
   *  one being edited. See `BORROWED_MEDIA`. */
  ns: string;
  path: string;
  label: string;
  /** The file the content names, still shipped under /public. */
  bundled: string | null;
  /** The role this row's single picture plays. */
  single: "cover" | "logo";
  /** Whether a set of photographs belongs at this address too. */
  gallery: boolean;
  /** A set *instead of* a single picture — a slider. */
  setOnly?: boolean;
  /** What the section does with the pictures, when it is worth saying. */
  hint?: string;
}

export function SectionMedia({
  namespace,
  entryKey = "",
  ownsSlot = () => true,
  record,
  copy,
}: {
  /** The ContentBlock root — `projectsPage`, not `projectsPage.items`. */
  namespace: string;
  /** Which screen this is, so it can borrow another section's pictures. */
  entryKey?: string;
  /** Whether a slot of this block belongs on this screen. */
  ownsSlot?: (slotPath: string) => boolean;
  /** The whole stored record for this namespace, in the editing locale. */
  record: Json;
  copy: Copy;
}) {
  const toast = useToast();
  const locale = useLocale();
  const spec = IMAGE_LISTS[namespace];

  const [bindings, setBindings] = useState<MediaBinding[] | null>(null);
  const [picking, setPicking] = useState<
    { ns: string; path: string; role: "cover" | "logo" | "gallery" } | null
  >(null);
  const [saving, setSaving] = useState<string | null>(null);

  const borrowed = useMemo(() => BORROWED_MEDIA[entryKey] ?? [], [entryKey]);

  const load = useCallback(async () => {
    try {
      const lists = await Promise.all(
        [namespace, ...borrowed].map((one) => listBindings(one)),
      );
      setBindings(lists.flatMap((one) => one.results));
    } catch {
      setBindings([]);
    }
  }, [namespace, borrowed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const rows = useMemo<Row[]>(() => {
    const slotRow = (slot: ReturnType<typeof slotsFor>[number]): Row => ({
      ns: slot.namespace,
      path: slot.path,
      label: slot.label[locale === "ar" ? "ar" : "en"],
      bundled: slot.bundled,
      single: "cover",
      gallery: slot.role === "gallery",
      setOnly: slot.role === "gallery",
      hint: slot.hint?.[locale === "ar" ? "ar" : "en"],
    });

    const fixed: Row[] = [
      ...slotsFor(namespace).filter((slot) => ownsSlot(slot.path)),
      // A borrowed namespace lends its sections' pictures, never its page
      // banner: that belongs to the screen that owns the banner's words.
      ...borrowed.flatMap((other) =>
        slotsFor(other).filter((slot) => !slot.path.startsWith("header")),
      ),
    ].map(slotRow);

    if (!spec) return fixed;
    const list = getAt(record, [spec.listKey]);
    if (!Array.isArray(list)) return fixed;
    const listed: Row[] = list.map((entry, index) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const named = spec.single === "logo" ? item.logo : item.image;
      const folder = spec.single === "logo" ? "clients" : "projects";
      return {
        ns: namespace,
        path: `${spec.listKey}[${index}]`,
        label: String(item[spec.labelKey] ?? `${spec.listKey}[${index}]`),
        bundled: typeof named === "string" && named ? `/images/${folder}/${named}.jpg` : null,
        single: spec.single,
        gallery: spec.gallery,
      };
    });
    // The section's own pictures first: they are what an editor opening
    // "Hero" or "Sustainability" came for; a long list follows.
    return [...fixed, ...listed];
  }, [record, spec, namespace, borrowed, locale, ownsSlot]);

  const at = useCallback(
    (ns: string, path: string, role: string) =>
      (bindings ?? [])
        .filter((binding) => binding.namespace === ns && binding.path === path && binding.role === role)
        .sort((a, b) => a.position - b.position),
    [bindings],
  );

  if (rows.length === 0) {
    return (
      <Surface className="flex flex-col items-center gap-2 py-10 text-center">
        <IconMedia width={24} height={24} className="text-gray-muted" />
        <p className="text-xs text-gray-muted">{copy.media.noImageSlots}</p>
      </Surface>
    );
  }

  const pickInto = async (asset: MediaAsset) => {
    if (!picking) return;
    setSaving(picking.path);
    try {
      if (picking.role === "gallery") {
        const current = at(picking.ns, picking.path, "gallery").map((binding) => ({
          asset: binding.asset.id,
        }));
        await setGallery(picking.ns, picking.path, [...current, { asset: asset.id }]);
      } else {
        await setSlot(picking.role, picking.ns, picking.path, asset.id);
      }
      await load();
      toast(copy.media.saved, "success");
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setSaving(null);
    }
  };

  const clear = async (ns: string, path: string, role: "cover" | "logo") => {
    setSaving(path);
    try {
      await setSlot(role, ns, path, null);
      await load();
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setSaving(null);
    }
  };

  const reorder = async (ns: string, path: string, next: MediaAsset[]) => {
    setSaving(path);
    try {
      await setGallery(ns, path, next.map((asset) => ({ asset: asset.id })));
      await load();
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setSaving(null);
    }
  };

  const promote = async (ns: string, path: string, asset: MediaAsset) => {
    setSaving(path);
    try {
      await setSlot("cover", ns, path, asset.id);
      await load();
      toast(copy.media.saved, "success");
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.detail : String(failure), "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Surface className="flex flex-col gap-1">
        <h2 className="t-small font-bold text-heading">{copy.media.itemsTitle}</h2>
        <p className="text-xs text-gray-muted">{copy.media.itemsBody}</p>
      </Surface>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const cover = at(row.ns, row.path, row.single)[0] ?? null;
          const gallery = at(row.ns, row.path, "gallery");
          const busy = saving === row.path;

          return (
            <li key={row.path}>
              <Surface className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-ui border border-black/[0.07] bg-off-white">
                    {cover ? (
                      <MediaThumb
                        asset={cover.asset}
                        fit={row.single === "logo" ? "contain" : "cover"}
                        className="h-full w-full"
                      />
                    ) : row.bundled ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.bundled}
                        alt=""
                        className={`h-full w-full ${row.single === "logo" ? "object-contain" : "object-cover"} opacity-70`}
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-gray-muted">
                        <IconMedia width={18} height={18} />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate text-sm font-bold text-heading">{row.label}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={cover ? "live" : "neutral"}>
                        {cover ? copy.media.fromLibrary : copy.media.fromSite}
                      </Badge>
                      {/* A slider draws what the site ships until photos are
                          added, so "empty" would be a lie on that row. */}
                      {!cover && !row.bundled && !row.setOnly ? (
                        <Badge tone="warning">{copy.media.empty}</Badge>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPicking({ ns: row.ns, path: row.path, role: row.single })}
                      >
                        {cover ? copy.media.pick : copy.media.coverTitle}
                      </Button>
                      {cover ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => clear(row.ns, row.path, row.single)}
                        >
                          {copy.media.clear}
                        </Button>
                      ) : null}
                    </div>
                    {row.hint ? (
                      <p className="text-[11px] text-gray-muted">{row.hint}</p>
                    ) : !cover ? (
                      <p className="text-[11px] text-gray-muted">{copy.media.notManaged}</p>
                    ) : null}
                  </div>
                </div>

                {row.gallery ? (
                  <div className="flex flex-col gap-2 border-t border-black/[0.06] pt-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
                        {copy.media.galleryTitle}
                      </h3>
                      <span className="text-[11px] text-gray-muted">{copy.media.galleryBody}</span>
                    </div>
                    <GalleryEditor
                      copy={copy}
                      disabled={busy}
                      items={gallery.map((binding) => binding.asset)}
                      onChange={(next) => reorder(row.ns, row.path, next)}
                      onAdd={() => setPicking({ ns: row.ns, path: row.path, role: "gallery" })}
                      onMakePrimary={(asset) => promote(row.ns, row.path, asset)}
                    />
                  </div>
                ) : null}
              </Surface>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <Surface className="flex flex-col items-center gap-2 py-10 text-center">
          <IconPlus width={22} height={22} className="text-gray-muted" />
          <p className="text-xs text-gray-muted">{copy.media.noImageSlots}</p>
        </Surface>
      ) : null}

      <MediaPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={pickInto}
        copy={copy}
        category={spec?.category ?? "page"}
      />
    </div>
  );
}
