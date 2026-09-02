"use client";

/**
 * Renders whatever shape the content happens to be.
 *
 * Two rules run through all of it. Object keys can never be deleted — the
 * backend refuses key loss, and offering what the API will reject is worse
 * than not offering it — while array *items* can be added, removed and
 * reordered, because a list is replaced wholesale on merge and its length is
 * content, not structure.
 *
 * Every write goes through `coerce`, so a number input cannot quietly turn
 * `160` into the string "160".
 *
 * Long lists collapse by default: thirty-two projects rendered open buries the
 * three fields above them.
 */

import { Badge } from "@/components/studio/ui/Badge";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconPlus,
  IconTrash,
} from "@/components/studio/icons";
import { blankFrom, coerce, type FieldNode } from "@/lib/studio/fields";
import { getAt, type Json, type Segment } from "@/lib/studio/paths";

export interface FieldTreeProps {
  node: FieldNode;
  value: Json;
  onChange: (segments: Segment[], next: Json) => void;
  isLocked: (segments: Segment[]) => boolean;
  depth?: number;
}

const CONTROL =
  "w-full rounded-ui border border-black/10 bg-white px-3 py-2.5 text-sm text-black " +
  "placeholder:text-gray-muted transition-colors " +
  "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-gray-muted";

const LABEL = "mb-1.5 block text-xs font-bold text-heading";

/** Lists longer than this open collapsed. */
const COLLAPSE_OVER = 4;

function Disclosure({
  title,
  count,
  defaultOpen,
  badge,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-ui border border-black/[0.07] bg-off-white/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-ui px-3.5 py-2.5 text-xs font-bold text-heading transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
        <IconChevronDown
          width={14}
          height={14}
          className="shrink-0 text-gray-muted transition-transform duration-200 group-open:rotate-180"
        />
        <span>{title}</span>
        {typeof count === "number" ? (
          <span className="text-gray-muted">({count})</span>
        ) : null}
        {badge ? <span className="ms-auto">{badge}</span> : null}
      </summary>
      <div className="space-y-4 border-t border-black/[0.06] p-3.5">{children}</div>
    </details>
  );
}

export function FieldTree({ node, value, onChange, isLocked, depth = 0 }: FieldTreeProps) {
  const current = getAt(value, node.segments);
  const locked = isLocked(node.segments);
  const id = `f-${node.segments.join("-") || "root"}`;

  if (node.kind === "object") {
    const children = node.children.map((child) => (
      <FieldTree
        key={child.segments.join(".")}
        node={child}
        value={value}
        onChange={onChange}
        isLocked={isLocked}
        depth={depth + 1}
      />
    ));

    // The outermost object is the form itself, not a group inside it.
    if (depth === 0) return <div className="space-y-5">{children}</div>;

    return (
      <Disclosure title={node.label} defaultOpen>
        {children}
      </Disclosure>
    );
  }

  if (node.kind === "array") {
    const list = Array.isArray(current) ? current : [];
    const replace = (next: Json[]) => onChange(node.segments, next);

    return (
      <Disclosure
        title={node.label}
        count={list.length}
        defaultOpen={list.length <= COLLAPSE_OVER && !locked}
        badge={locked ? <Badge tone="warning">Read-only</Badge> : undefined}
      >
        {locked ? (
          <p className="rounded-ui bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
            This list will move to its own management screen in a later release,
            so it is read-only here rather than teaching a way of working that is
            about to change.
          </p>
        ) : null}

        <ol className="space-y-3">
          {node.items.map((item, index) => (
            <li
              key={item.segments.join(".")}
              className="rounded-ui border border-black/[0.07] bg-white p-3"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-muted">
                  {item.label}
                </span>
                {locked ? null : (
                  <span className="ms-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${item.label} up`}
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...list];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        replace(next);
                      }}
                      className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <IconArrowUp width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.label} down`}
                      disabled={index === list.length - 1}
                      onClick={() => {
                        const next = [...list];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        replace(next);
                      }}
                      className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-black/[0.05] hover:text-heading disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <IconArrowDown width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.label}`}
                      onClick={() => replace(list.filter((_, i) => i !== index))}
                      className="rounded-ui p-1.5 text-gray-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <FieldTree
                  node={item}
                  value={value}
                  onChange={onChange}
                  isLocked={() => locked}
                  depth={depth + 1}
                />
              </div>
            </li>
          ))}
        </ol>

        {!locked && node.template !== null ? (
          <button
            type="button"
            onClick={() => replace([...list, blankFrom(node.template)])}
            className="inline-flex items-center gap-1.5 rounded-ui border border-dashed border-black/15 px-3 py-2 text-xs font-bold text-gray-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <IconPlus width={14} height={14} />
            Add {node.label.replace(/s$/, "").toLowerCase() || "item"}
          </button>
        ) : null}
      </Disclosure>
    );
  }

  if (node.kind === "empty") {
    return (
      <div className="rounded-ui border border-dashed border-black/10 px-3.5 py-3">
        <p className="text-xs font-bold text-heading">{node.label}</p>
        <p className="mt-0.5 text-xs text-gray-muted">
          Empty on purpose — nothing is shown here on the site right now.
        </p>
      </div>
    );
  }

  if (node.kind === "boolean") {
    return (
      <label htmlFor={id} className="flex items-center gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(current)}
          disabled={locked}
          onChange={(event) => onChange(node.segments, event.target.checked)}
          className="h-4 w-4 rounded border-black/20 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <span className="text-xs font-bold text-heading">{node.label}</span>
      </label>
    );
  }

  if (node.kind === "number") {
    return (
      <div>
        <label htmlFor={id} className={LABEL}>
          {node.label}
          <span className="ms-2 font-medium text-gray-muted">
            {node.integer ? "whole number" : "number"}
          </span>
        </label>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={node.integer ? 1 : "any"}
          value={typeof current === "number" ? current : ""}
          disabled={locked}
          className={CONTROL}
          onChange={(event) => onChange(node.segments, coerce(event.target.value, current))}
        />
      </div>
    );
  }

  const text = typeof current === "string" ? current : String(current ?? "");
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {node.label}
      </label>
      {node.multiline ? (
        <textarea
          id={id}
          rows={Math.min(10, Math.max(3, Math.ceil(text.length / 70)))}
          value={text}
          disabled={locked}
          className={`${CONTROL} resize-y leading-relaxed`}
          onChange={(event) => onChange(node.segments, coerce(event.target.value, current))}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          disabled={locked}
          className={CONTROL}
          onChange={(event) => onChange(node.segments, coerce(event.target.value, current))}
        />
      )}
    </div>
  );
}
