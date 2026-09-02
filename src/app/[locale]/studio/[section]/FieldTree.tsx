"use client";

/**
 * Renders whatever shape the content happens to be.
 *
 * Two rules run through all of it. Object keys can never be deleted — the
 * backend refuses key loss and the UI must not offer what the API will reject —
 * while array *items* can be added, removed and reordered, because a list is
 * replaced wholesale on merge and its length is content, not structure.
 *
 * Every write goes through `coerce`, so a number input cannot quietly turn
 * `manpower: 160` into the string "160".
 */

import { coerce, type FieldNode } from "@/lib/studio/fields";
import { blankFrom } from "@/lib/studio/fields";
import { getAt, type Json, type Segment } from "@/lib/studio/paths";

export interface FieldTreeProps {
  node: FieldNode;
  /** The subtree being edited, for reading current values. */
  value: Json;
  onChange: (segments: Segment[], next: Json) => void;
  /** Full field path (namespace-qualified) → true when it must not be edited. */
  isLocked: (segments: Segment[]) => boolean;
  depth?: number;
}

const INPUT =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";

export function FieldTree({ node, value, onChange, isLocked, depth = 0 }: FieldTreeProps) {
  const current = getAt(value, node.segments);
  const locked = isLocked(node.segments);
  const id = node.segments.join("-") || "root";

  if (node.kind === "object") {
    return (
      <fieldset className={depth === 0 ? "" : "mt-4 border-s border-neutral-200 ps-4"}>
        {node.label ? (
          <legend className="text-sm font-semibold text-neutral-700">{node.label}</legend>
        ) : null}
        <div className="space-y-4">
          {node.children.map((child) => (
            <FieldTree
              key={child.segments.join(".")}
              node={child}
              value={value}
              onChange={onChange}
              isLocked={isLocked}
              depth={depth + 1}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (node.kind === "array") {
    const list = Array.isArray(current) ? current : [];
    const replace = (next: Json[]) => onChange(node.segments, next);

    return (
      <fieldset className="mt-4 rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">
          {node.label}{" "}
          <span className="font-normal text-neutral-400">({list.length})</span>
        </legend>

        {locked ? (
          <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Managed as database entities from Stage 3D. Shown here read-only so
            nobody builds a habit on an editor that is about to be replaced.
          </p>
        ) : null}

        <ol className="space-y-4">
          {node.items.map((item, index) => (
            <li key={item.segments.join(".")} className="rounded bg-neutral-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {item.label}
                </span>
                {locked ? null : (
                  <span className="ms-auto flex gap-1">
                    <button
                      type="button"
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...list];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        replace(next);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40"
                      disabled={index === list.length - 1}
                      onClick={() => {
                        const next = [...list];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        replace(next);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700"
                      onClick={() => replace(list.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </div>
              <FieldTree
                node={item}
                value={value}
                onChange={onChange}
                isLocked={() => locked}
                depth={depth + 1}
              />
            </li>
          ))}
        </ol>

        {!locked && node.template !== null ? (
          <button
            type="button"
            className="mt-3 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            onClick={() => replace([...list, blankFrom(node.template)])}
          >
            Add item
          </button>
        ) : null}
      </fieldset>
    );
  }

  if (node.kind === "empty") {
    return (
      <div className="mt-4">
        <p className="text-sm font-medium text-neutral-700">{node.label}</p>
        <p className="mt-1 text-xs text-neutral-500">
          Empty {node.container === "list" ? "list" : "object"}. Kept exactly as it is —
          its emptiness is content, not a gap.
        </p>
      </div>
    );
  }

  if (node.kind === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(current)}
          disabled={locked}
          onChange={(event) => onChange(node.segments, event.target.checked)}
        />
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {node.label}
        </label>
      </div>
    );
  }

  if (node.kind === "number") {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
          {node.label}
          <span className="ms-2 text-xs font-normal text-neutral-400">
            {node.integer ? "integer" : "number"}
          </span>
        </label>
        <input
          id={id}
          type="number"
          step={node.integer ? 1 : "any"}
          value={typeof current === "number" ? current : ""}
          disabled={locked}
          className={`mt-1 ${INPUT}`}
          onChange={(event) =>
            onChange(node.segments, coerce(event.target.value, current))
          }
        />
      </div>
    );
  }

  const text = typeof current === "string" ? current : String(current ?? "");
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {node.label}
      </label>
      {node.multiline ? (
        <textarea
          id={id}
          rows={Math.min(8, Math.max(3, Math.ceil(text.length / 80)))}
          value={text}
          disabled={locked}
          className={`mt-1 ${INPUT}`}
          onChange={(event) => onChange(node.segments, coerce(event.target.value, current))}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          disabled={locked}
          className={`mt-1 ${INPUT}`}
          onChange={(event) => onChange(node.segments, coerce(event.target.value, current))}
        />
      )}
    </div>
  );
}
