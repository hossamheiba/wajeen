"use client";

/**
 * A project's photographs, in the order the site will show them.
 *
 * Reordering is done with buttons rather than only by dragging. Drag-and-drop
 * is the obvious gesture and it is here too, but on its own it excludes anyone
 * using a keyboard, a screen reader or a phone, and "change the order" is the
 * one thing this screen exists for — so the accessible route is the primary
 * one and the drag is the shortcut.
 *
 * The whole list is sent on every change. The server replaces the gallery
 * inside one transaction, which is what keeps two rows from ever claiming the
 * same position; sending a single "move item 3 to 1" would need temporary
 * positions and a partial failure would leave a gap.
 */

import { useState, type DragEvent } from "react";
import { Button } from "@/components/studio/ui/Button";
import { Badge } from "@/components/studio/ui/Badge";
import {
  IconArrowDown,
  IconArrowUp,
  IconGrip,
  IconPlus,
  IconStar,
  IconTrash,
} from "@/components/studio/icons";
import type { MediaAsset } from "@/lib/studio/media";
import type { Copy } from "@/lib/studio/i18n";
import { MediaThumb } from "./MediaThumb";

export function GalleryEditor({
  items,
  onChange,
  onAdd,
  onMakePrimary,
  copy,
  disabled = false,
}: {
  items: MediaAsset[];
  onChange: (next: MediaAsset[]) => void;
  onAdd: () => void;
  /** Promoting a gallery image to the cover is what "primary" means. */
  onMakePrimary?: (asset: MediaAsset) => void;
  copy: Copy;
  disabled?: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const onDrop = (event: DragEvent<HTMLLIElement>, to: number) => {
    event.preventDefault();
    if (dragIndex !== null) move(dragIndex, to);
    setDragIndex(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="rounded-ui border border-dashed border-black/12 bg-off-white px-4 py-6 text-center text-xs text-gray-muted">
          {copy.media.galleryEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((asset, index) => (
            <li
              key={asset.id}
              draggable={!disabled}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, index)}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-3 rounded-ui border bg-white p-2 transition-colors ${
                dragIndex === index ? "border-primary/50 bg-primary/[0.03]" : "border-black/[0.07]"
              }`}
            >
              <span className="cursor-grab text-gray-muted" aria-hidden="true">
                <IconGrip width={16} height={16} />
              </span>

              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-[6px] bg-off-white">
                <MediaThumb asset={asset} className="h-full w-full" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-heading">
                  {asset.original_name}
                </div>
                <div className="text-[11px] text-gray-muted">
                  {asset.width}×{asset.height}
                </div>
              </div>

              {index === 0 ? <Badge tone="brand">{copy.media.isPrimary}</Badge> : null}

              <div className="flex shrink-0 items-center gap-1">
                {index !== 0 && onMakePrimary ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onMakePrimary(asset)}
                    aria-label={copy.media.makePrimary}
                    title={copy.media.makePrimary}
                    className="grid h-8 w-8 place-items-center rounded-ui text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-40"
                  >
                    <IconStar width={15} height={15} />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label={copy.media.moveUp}
                  className="grid h-8 w-8 place-items-center rounded-ui text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-30"
                >
                  <IconArrowUp width={15} height={15} />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={copy.media.moveDown}
                  className="grid h-8 w-8 place-items-center rounded-ui text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-30"
                >
                  <IconArrowDown width={15} height={15} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((_, at) => at !== index))}
                  aria-label={copy.media.remove}
                  className="grid h-8 w-8 place-items-center rounded-ui text-gray-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-40"
                >
                  <IconTrash width={15} height={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button variant="secondary" size="sm" type="button" onClick={onAdd} disabled={disabled}>
          <IconPlus width={14} height={14} />
          {copy.media.galleryAdd}
        </Button>
      </div>
    </div>
  );
}
