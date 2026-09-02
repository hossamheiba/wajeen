"""
Structural helpers shared by the importer, the patcher, the round-trip gate
and the key-preservation tests.

Everything here works on already-parsed Python objects, never on JSON text --
so indentation, key order and trailing newlines are irrelevant by construction,
which is exactly what "semantic equality" is supposed to mean.
"""

from __future__ import annotations

from typing import Any, Iterator

Json = Any


def key_paths(node: Json, prefix: str = "") -> Iterator[str]:
    """Every leaf path in a tree, list indices included.

    A leaf is anything that is not a dict and not a list, plus empty
    containers -- an empty object is itself a fact worth preserving.
    """
    if isinstance(node, dict):
        if not node:
            yield prefix or "."
            return
        for key, value in node.items():
            child = f"{prefix}.{key}" if prefix else key
            yield from key_paths(value, child)
    elif isinstance(node, list):
        if not node:
            yield prefix or "."
            return
        for index, value in enumerate(node):
            yield from key_paths(value, f"{prefix}[{index}]")
    else:
        yield prefix or "."


def deep_merge(base: Json, patch: Json) -> Json:
    """Recursively merge `patch` into `base`, returning a new tree.

    Dicts merge key by key. Everything else -- including lists -- replaces
    wholesale: a list is an ordered piece of content, and index-wise merging
    would silently corrupt reordering.

    Nothing is ever removed. There is no sentinel that deletes a key, because
    Stage 3B has no content-deletion behaviour at all.
    """
    if isinstance(base, dict) and isinstance(patch, dict):
        merged = dict(base)
        for key, value in patch.items():
            merged[key] = deep_merge(merged.get(key), value) if key in merged else value
        return merged
    return patch


def get_at_path(tree: Json, path: str) -> Json:
    """Walk a dotted path. Mirrors getAtPath in src/lib/preview/contract.ts."""
    if not path:
        return tree
    node = tree
    for segment in path.split("."):
        if not isinstance(node, dict) or segment not in node:
            return None
        node = node[segment]
    return node


def set_at_path(tree: Json, path: str, value: Json) -> Json:
    """Return a copy of `tree` with `value` placed at a dotted path.

    Mirrors setAtPath in src/lib/preview/contract.ts, including the behaviour
    of creating intermediate objects when the path does not exist yet.
    """
    if not path:
        return value
    head, _, rest = path.partition(".")
    if not rest:
        return {**(tree if isinstance(tree, dict) else {}), head: value}
    child = tree.get(head) if isinstance(tree, dict) else None
    branch = child if isinstance(child, dict) else {}
    return {**(tree if isinstance(tree, dict) else {}), head: set_at_path(branch, rest, value)}


def type_name(value: Json) -> str:
    """Distinguishes the types that JSON round-tripping can quietly confuse.

    bool is checked before int on purpose: in Python True is an int, and a
    boolean silently becoming the number 1 is precisely the class of drift the
    round-trip gate exists to catch.
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "str"
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "dict"
    return type(value).__name__


def structural_diff(expected: Json, actual: Json, prefix: str = "") -> list[str]:
    """A list of human-readable differences; empty means semantically equal.

    Checks, at every depth: key sets, list length *and* order, primitive types,
    and values. It reports everything it finds rather than stopping at the
    first difference, so one run tells you the whole story.
    """
    here = prefix or "<root>"
    problems: list[str] = []

    if type_name(expected) != type_name(actual):
        return [f"{here}: type {type_name(expected)} -> {type_name(actual)}"]

    if isinstance(expected, dict):
        missing = sorted(set(expected) - set(actual))
        added = sorted(set(actual) - set(expected))
        problems += [f"{here}.{key}: missing" for key in missing]
        problems += [f"{here}.{key}: unexpected" for key in added]
        for key in expected:
            if key in actual:
                child = f"{prefix}.{key}" if prefix else key
                problems += structural_diff(expected[key], actual[key], child)
        return problems

    if isinstance(expected, list):
        if len(expected) != len(actual):
            return [f"{here}: length {len(expected)} -> {len(actual)}"]
        for index, (want, got) in enumerate(zip(expected, actual)):
            problems += structural_diff(want, got, f"{prefix}[{index}]")
        return problems

    if expected != actual:
        problems.append(f"{here}: value {expected!r} -> {actual!r}")
    return problems


def max_depth(node: Json, depth: int = 0) -> int:
    if isinstance(node, dict) and node:
        return max(max_depth(value, depth + 1) for value in node.values())
    if isinstance(node, list) and node:
        return max(max_depth(value, depth + 1) for value in node)
    return depth
