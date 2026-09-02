/**
 * Structural helpers for the studio, mirroring `cms/content/services/paths.py`.
 *
 * The two implementations are compared against each other by the gate tests:
 * if the editor's idea of a key path ever drifts from the backend's, the
 * key-preservation check stops meaning anything.
 *
 * `contract.ts` has its own `getAtPath` / `setAtPath` for *namespace* paths —
 * dotted strings that address a whole namespace. These work on segment arrays
 * instead, because a form field addresses a position inside a namespace,
 * including array indices, which a dotted string cannot express.
 */

export type Json = unknown;
export type Segment = string | number;

/** "careersPage.values" → ["careersPage", "values"]; "hero" → ["hero", ""]. */
export function splitNamespace(namespace: string): [root: string, path: string] {
  const dot = namespace.indexOf(".");
  if (dot === -1) return [namespace, ""];
  return [namespace.slice(0, dot), namespace.slice(dot + 1)];
}

export function getAt(tree: Json, segments: readonly Segment[]): Json {
  let node = tree;
  for (const segment of segments) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<Segment, Json>)[segment];
  }
  return node;
}

/** Returns a copy with `value` written at `segments`, copying each level down. */
export function setAt(tree: Json, segments: readonly Segment[], value: Json): Json {
  if (segments.length === 0) return value;
  const [head, ...rest] = segments;

  if (typeof head === "number") {
    const list = Array.isArray(tree) ? [...tree] : [];
    list[head] = setAt(list[head], rest, value);
    return list;
  }

  const base = tree !== null && typeof tree === "object" && !Array.isArray(tree)
    ? (tree as Record<string, Json>)
    : {};
  return { ...base, [head]: setAt(base[head], rest, value) };
}

/**
 * Every leaf path in a tree, list indices included. An empty container is
 * itself a leaf — `careersPage.positions.items` is deliberately `[]` and that
 * emptiness is a fact worth preserving.
 *
 * The format matches the Python side exactly: dots between object keys,
 * `[n]` for list indices.
 */
export function keyPaths(node: Json, prefix = ""): string[] {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    const entries = Object.entries(node as Record<string, Json>);
    if (entries.length === 0) return [prefix || "."];
    return entries.flatMap(([key, value]) =>
      keyPaths(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  if (Array.isArray(node)) {
    if (node.length === 0) return [prefix || "."];
    return node.flatMap((value, index) => keyPaths(value, `${prefix}[${index}]`));
  }
  return [prefix || "."];
}

/** Distinguishes the types a form control can quietly confuse. */
export function typeName(value: Json): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  switch (typeof value) {
    case "boolean":
      return "bool";
    case "number":
      return Number.isInteger(value) ? "int" : "float";
    case "string":
      return "str";
    case "object":
      return "dict";
    default:
      return typeof value;
  }
}

/**
 * Deep merge, matching the backend: objects merge key by key, everything else
 * replaces. Used only to predict what a PATCH will do, never to mutate state.
 */
export function deepMerge(base: Json, patch: Json): Json {
  const bothObjects =
    base !== null && typeof base === "object" && !Array.isArray(base) &&
    patch !== null && typeof patch === "object" && !Array.isArray(patch);
  if (!bothObjects) return patch;

  const merged: Record<string, Json> = { ...(base as Record<string, Json>) };
  for (const [key, value] of Object.entries(patch as Record<string, Json>)) {
    merged[key] = key in merged ? deepMerge(merged[key], value) : value;
  }
  return merged;
}

/** Paths present in `before` but gone from `after`. Empty means nothing was lost. */
export function lostPaths(before: Json, after: Json): string[] {
  const survived = new Set(keyPaths(after));
  return keyPaths(before).filter((path) => !survived.has(path));
}

export interface PathDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

/**
 * What actually differs between two trees, by key path.
 *
 * Used by the publish and rollback screens so nobody ships a change they
 * cannot see. `removed` should always be empty in practice — the backend
 * refuses key loss — so a non-empty list is a bug worth surfacing loudly.
 */
export function diffPaths(before: Json, after: Json): PathDiff {
  const beforePaths = new Set(keyPaths(before));
  const afterPaths = new Set(keyPaths(after));

  const added = [...afterPaths].filter((path) => !beforePaths.has(path)).sort();
  const removed = [...beforePaths].filter((path) => !afterPaths.has(path)).sort();
  const changed = [...beforePaths]
    .filter((path) => afterPaths.has(path))
    .filter((path) => !Object.is(readPath(before, path), readPath(after, path)))
    .sort();

  return { added, removed, changed };
}

/** Reads a key path in the `a.b[0].c` format `keyPaths` produces. */
export function readPath(tree: Json, path: string): Json {
  if (path === ".") return tree;
  const segments: Segment[] = [];
  for (const part of path.split(".")) {
    const [name, ...indices] = part.split("[");
    if (name) segments.push(name);
    for (const index of indices) segments.push(Number(index.replace("]", "")));
  }
  return getAt(tree, segments);
}
