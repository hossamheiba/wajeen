/**
 * The gates that do not need a browser.
 *
 * Everything here is about one question: can the studio lose content? The
 * registry checks answer "is every namespace reachable", the path checks
 * answer "does an edit preserve what it did not touch", and the type checks
 * answer "does a form control change what something *is*".
 */

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PREVIEW_ENTRY_META } from "../../src/lib/preview/entries";
import {
  PICTURE_ARRAYS,
  GROUP_ORDER,
  STUDIO_ENTRIES,
  STUDIO_REGISTRY,
  STUDIO_ROOTS,
  entriesSharingRoot,
  carriesPictures,
} from "../../src/lib/studio/registry";
import {
  deepMerge,
  diffPaths,
  getAt,
  keyPaths,
  lostPaths,
  readPath,
  setAt,
  splitNamespace,
  typeName,
} from "../../src/lib/studio/paths";
import { blankFrom, coerce, describe as describeShape, humanise, leaves } from "../../src/lib/studio/fields";
import { FIXED_MEDIA_SLOTS } from "../../src/lib/mediaSlots";
import { arabicCoverage, fieldHidden, fieldNameAt } from "../../src/lib/studio/fieldNames";
import { safeNext } from "../../src/lib/studio/redirect";

const ROOT = join(__dirname, "..", "..");
const messages = (locale: string) =>
  JSON.parse(readFileSync(join(ROOT, "src", "messages", `${locale}.json`), "utf8"));

const EN = messages("en");
const AR = messages("ar");

// ---------------------------------------------------------------- registry

test.describe("Gate 1-4 — registry coverage", () => {
  test("there are 42 studio entries", () => {
    expect(STUDIO_ENTRIES).toHaveLength(42);
    expect(Object.keys(STUDIO_REGISTRY)).toHaveLength(42);
  });

  test("38 of them are previewable and 4 are plain", () => {
    const previewable = STUDIO_ENTRIES.filter((entry) => entry.previewKey !== null);
    const plain = STUDIO_ENTRIES.filter((entry) => entry.previewKey === null);
    expect(previewable).toHaveLength(38);
    expect(plain).toHaveLength(4);
    expect(plain.map((entry) => entry.namespace).sort()).toEqual([
      "footer",
      "meta",
      "nav",
      "notFound",
    ]);
  });

  test("the preview catalogue is untouched at 38 entries", () => {
    expect(Object.keys(PREVIEW_ENTRY_META)).toHaveLength(38);
  });

  test("34 distinct components remain, and the 4 plain entries add none", () => {
    // Counted from the source, because importing the registry would pull in
    // forty React sections that cannot run outside the Next bundler.
    const source = readFileSync(join(ROOT, "src/lib/preview/registry.ts"), "utf8");
    // The trailing comma excludes the `Component: ComponentType<any>` type field.
    const components = new Set([...source.matchAll(/Component: (\w+),/g)].map((m) => m[1]));
    expect(components.size).toBe(34);
    // Every entry in the catalogue is constructed there, one way or another.
    const constructed =
      [...source.matchAll(/^  \w+: \{ Component:/gm)].length +
      [...source.matchAll(/^  \w+: (?:pageHeader|pillarGrid)\(/gm)].length;
    expect(constructed).toBe(38);
  });

  test("every previewable entry points at a real catalogue key", () => {
    for (const entry of STUDIO_ENTRIES) {
      if (entry.previewKey === null) continue;
      const meta = PREVIEW_ENTRY_META[entry.previewKey as keyof typeof PREVIEW_ENTRY_META];
      expect(meta, entry.key).toBeDefined();
      expect(meta.namespace).toBe(entry.namespace);
    }
  });

  test("27/27 namespaces are reachable", () => {
    expect(STUDIO_ROOTS).toHaveLength(27);
    expect(STUDIO_ROOTS).toEqual(Object.keys(EN).sort());
  });

  test("54/54 ContentBlock rows are reachable", () => {
    const rows = STUDIO_ROOTS.flatMap((root) => [`${root}:en`, `${root}:ar`]);
    expect(new Set(rows).size).toBe(54);
  });

  test("no namespace contains a dot, and every path resolves in the messages", () => {
    for (const entry of STUDIO_ENTRIES) {
      expect(entry.root, entry.key).not.toContain(".");
      expect(EN[entry.root], entry.key).toBeDefined();
      const segments = entry.path ? entry.path.split(".") : [];
      expect(getAt(EN[entry.root], segments), `${entry.key} → ${entry.namespace}`).toBeDefined();
      expect(getAt(AR[entry.root], segments), `${entry.key} → ${entry.namespace} (ar)`).toBeDefined();
    }
  });

  test("entries that share a root are reported as sharing it", () => {
    expect(entriesSharingRoot("aboutPage").length).toBeGreaterThan(1);
    expect(entriesSharingRoot("hero")).toHaveLength(1);
  });

  test("every entry lands in a known group", () => {
    for (const entry of STUDIO_ENTRIES) {
      expect(GROUP_ORDER, entry.key).toContain(entry.group);
    }
  });

  test("exactly the lists whose rows carry pictures are marked", () => {
    expect(PICTURE_ARRAYS.size).toBe(3);
    // These three have one media binding per row, keyed by its index.
    expect(carriesPictures("projectsPage", "items")).toBe(true);
    expect(carriesPictures("clients", "items")).toBe(true);
    expect(carriesPictures("gallery", "items")).toBe(true);
    // These do not, so nothing about them is special.
    expect(carriesPictures("servicesList", "items")).toBe(false);
    expect(carriesPictures("certificates", "items")).toBe(false);
    expect(carriesPictures("hero", "slides")).toBe(false);
  });
});

// ---------------------------------------------------------------- paths

test.describe("path helpers", () => {
  test("a namespace splits on its first dot only", () => {
    expect(splitNamespace("careersPage.values")).toEqual(["careersPage", "values"]);
    expect(splitNamespace("hero")).toEqual(["hero", ""]);
    expect(splitNamespace("a.b.c")).toEqual(["a", "b.c"]);
  });

  test("setAt copies rather than mutates, at every depth", () => {
    const tree = { a: { b: [{ c: 1 }] }, d: 2 };
    const next = setAt(tree, ["a", "b", 0, "c"], 9) as typeof tree;
    expect(next.a.b[0].c).toBe(9);
    expect(next.d).toBe(2);
    expect(tree.a.b[0].c).toBe(1);
  });

  test("keyPaths counts the real content exactly", () => {
    expect(keyPaths(EN)).toHaveLength(919);
    expect(keyPaths(AR)).toHaveLength(919);
  });

  test("readPath round-trips every key path in the real content", () => {
    for (const path of keyPaths(EN)) {
      expect(readPath(EN, path), path).not.toBeUndefined();
    }
  });

  test("the empty list is a path, not a hole", () => {
    // Every namespace now ships something in every container — vacancies
    // filled the last empty one — so the case is constructed. The rule is
    // what matters: a list emptied in the studio comes back as a path.
    const emptied = { careersPage: { positions: { items: [], tag: "x" } } };
    expect(keyPaths(emptied)).toContain("careersPage.positions.items");
    expect(readPath(emptied, "careersPage.positions.items")).toEqual([]);
  });

  test("deepMerge replaces lists and merges objects, matching the backend", () => {
    expect(deepMerge({ a: [1, 2], b: { c: 1, d: 2 } }, { a: [9], b: { d: 5 } })).toEqual({
      a: [9],
      b: { c: 1, d: 5 },
    });
  });
});

// ---------------------------------------------------------------- gate 5-7

test.describe("Gate 5-7 — key preservation, parity, types", () => {
  test("en and ar have identical key paths", () => {
    expect(new Set(keyPaths(EN))).toEqual(new Set(keyPaths(AR)));
  });

  test("editing one leaf of every entry preserves every other path", () => {
    for (const entry of STUDIO_ENTRIES) {
      const root = EN[entry.root];
      const segments = entry.path ? entry.path.split(".") : [];
      const before = keyPaths(root);

      // Touch the first editable leaf, exactly as the form would.
      const shape = describeShape(getAt(root, segments));
      const leaf = leaves(shape).find((node) => node.kind === "text");
      if (!leaf) continue;

      const target = [...segments, ...leaf.segments];
      const previous = getAt(root, target);
      const edited = setAt(root, target, coerce("edited", previous));

      expect(lostPaths(root, edited), `${entry.key} lost paths`).toEqual([]);
      expect(keyPaths(edited)).toHaveLength(before.length);
    }
  });

  test("a whole-subtree patch merges back without losing siblings", () => {
    for (const entry of STUDIO_ENTRIES) {
      const root = EN[entry.root];
      const segments = entry.path ? entry.path.split(".") : [];
      const subtree = getAt(root, segments);

      // What the server does: deep-merge the submitted subtree at that path.
      const merged = segments.length
        ? setAt(root, segments, deepMerge(getAt(root, segments), subtree))
        : deepMerge(root, subtree);

      expect(lostPaths(root, merged), entry.key).toEqual([]);
      expect(diffPaths(root, merged).changed, entry.key).toEqual([]);
    }
  });

  test("every primitive keeps its type through an edit", () => {
    for (const path of keyPaths(EN)) {
      const value = readPath(EN, path);
      if (typeName(value) === "list" || typeName(value) === "dict") continue;
      const round = coerce(
        typeof value === "number" ? String(value) : String(value ?? ""),
        value,
      );
      expect(typeName(round), path).toBe(typeName(value));
    }
  });

  test("an integer stays an integer even when the control hands back a string", () => {
    expect(coerce("160", 100)).toBe(160);
    expect(typeName(coerce("160", 100))).toBe("int");
    expect(coerce("abc", 100)).toBe(100);
  });

  test("a blank array item keeps the shape and the types of its neighbours", () => {
    const sample = EN.projectsPage.items[0];
    const blank = blankFrom(sample) as Record<string, unknown>;
    expect(new Set(Object.keys(blank))).toEqual(new Set(Object.keys(sample)));
    for (const key of Object.keys(sample)) {
      expect(typeName(blank[key]), key).toBe(typeName(sample[key]));
    }
  });
});

// ---------------------------------------------------------------- fields

test.describe("field inference", () => {
  test("shape is read off the content, including nesting and arrays", () => {
    const shape = describeShape(EN.hero);
    expect(shape.kind).toBe("object");
    const slides = shape.kind === "object" ? shape.children.find((c) => c.label === "Slides") : null;
    expect(slides?.kind).toBe("array");
  });

  test("an empty container is described, never dropped", () => {
    // Constructed, not borrowed: no namespace ships an empty container now.
    const shape = describeShape({ tag: "Open positions", items: [] });
    const items =
      shape.kind === "object" ? shape.children.find((c) => c.label === "Items") : null;
    expect(items?.kind).toBe("empty");
  });

  test("long copy becomes a textarea and a headline does not", () => {
    const long = describeShape("x".repeat(200));
    const short = describeShape("Hello");
    expect(long.kind === "text" && long.multiline).toBe(true);
    expect(short.kind === "text" && short.multiline).toBe(false);
  });

  test("labels are readable", () => {
    expect(humanise("ctaPrimary")).toBe("Cta Primary");
    expect(humanise("line1")).toBe("Line 1");
    expect(humanise(3)).toBe("Item 4");
  });

  test("every entry produces a renderable shape in both locales", () => {
    for (const entry of STUDIO_ENTRIES) {
      for (const [locale, tree] of [["en", EN], ["ar", AR]] as const) {
        const segments = entry.path ? entry.path.split(".") : [];
        const subtree = getAt(tree[entry.root], segments);
        expect(subtree, `${entry.key} [${locale}]`).toBeDefined();
        expect(() => describeShape(subtree)).not.toThrow();
      }
    }
  });
});

// ---------------------------------------------------------------- gate 13

test.describe("Gate 13 — ?next= cannot leave the studio", () => {
  const hostile = [
    "https://evil.example/steal",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "http://evil.example",
    "/en/story",
    "/en/studioevil",
    "/../../etc/passwd",
    "javascript:alert(1)",
    "%2F%2Fevil.example",
    "/%5C%5Cevil.example",
    "",
    null,
  ];

  for (const value of hostile) {
    test(`rejects ${JSON.stringify(value)}`, () => {
      expect(safeNext(value, "en")).toBe("/en/studio");
    });
  }

  test("accepts genuine studio paths", () => {
    expect(safeNext("/en/studio", "en")).toBe("/en/studio");
    expect(safeNext("/en/studio/hero", "en")).toBe("/en/studio/hero");
    expect(safeNext("/ar/studio/versions", "en")).toBe("/ar/studio/versions");
    expect(safeNext("/en/studio/hero?x=1", "en")).toBe("/en/studio/hero");
  });
});

// ------------------------------------------------------------- media slots

/**
 * The site's fixed pictures are registered twice — once in TypeScript, which
 * the sections and the studio read, and once in the Python importer, which
 * seeds the library from the files the build ships. Neither can import the
 * other, so this is what keeps them the same list.
 */
test.describe("fixed image slots", () => {
  const slots = Object.values(FIXED_MEDIA_SLOTS).flat();

  test("every slot has a namespace, a path and a label in both languages", () => {
    for (const slot of slots) {
      expect(slot.namespace, JSON.stringify(slot)).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
      // The CMS validator's grammar: `items[3]`, `pages.story.header`, `photo`.
      expect(slot.path, slot.namespace).toMatch(
        /^[A-Za-z][A-Za-z0-9]*(\[\d+\])*(\.[A-Za-z][A-Za-z0-9]*(\[\d+\])*)*$/,
      );
      expect(slot.label.en.length, slot.path).toBeGreaterThan(0);
      expect(slot.label.ar.length, slot.path).toBeGreaterThan(0);
    }
  });

  test("no address is registered twice", () => {
    const addresses = slots.map((slot) => `${slot.namespace}.${slot.path}`);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  test("the importer seeds every slot that names a file", () => {
    const python = readFileSync(
      join(ROOT, "cms/media_library/management/commands/import_media.py"),
      "utf8",
    );
    const block = python.slice(python.indexOf("FIXED_SLOTS = ["));
    for (const slot of slots) {
      if (slot.bundled === null) continue; // a slider has no single file to adopt
      expect(block, `${slot.namespace}.${slot.path} is not seeded`).toContain(
        `("${slot.namespace}", "${slot.path}",`,
      );
    }
  });

  test("every bundled file the registry names is actually shipped", () => {
    for (const slot of slots) {
      if (!slot.bundled) continue;
      const file = join(ROOT, "public", slot.bundled.replace(/^\//, ""));
      expect(readFileSync(file).length, slot.bundled).toBeGreaterThan(0);
    }
  });
});

// ------------------------------------------------------- field names in AR

/**
 * The editor's field labels are the content's own keys, tidied up. In English
 * that reads fine; in Arabic it used to read "Tag" and "Pillars" over Arabic
 * values, which is what `lib/studio/fieldNames` fixes.
 *
 * The gate is coverage, not existence: every key the live content actually
 * uses must have an Arabic name, so a key added tomorrow fails here rather
 * than surfacing as an English word in an Arabic dashboard.
 */
test.describe("Arabic field names", () => {
  const keyNames = (tree: unknown, out = new Set<string>()): Set<string> => {
    if (Array.isArray(tree)) {
      for (const item of tree) keyNames(item, out);
    } else if (tree && typeof tree === "object") {
      for (const [key, value] of Object.entries(tree)) {
        out.add(key);
        keyNames(value, out);
      }
    }
    return out;
  };

  test("every key the content uses has an Arabic name", () => {
    const names = [...keyNames(EN)].sort();
    const { missing } = arabicCoverage(names);
    expect(missing, `no Arabic name for:\n${missing.join("\n")}`).toEqual([]);
  });

  test("a key whose meaning depends on where it sits is named by its path", () => {
    // `contact` is a call-to-action everywhere else and a person here.
    expect(fieldNameAt("location", "offices[0].contact")).toBe("مسؤول التواصل");
    expect(fieldNameAt("cta", "contact")).toBe(null);
    expect(humanise("contact", "ar")).toBe("تواصل معنا");

    const tree = describeShape(AR.location, [], "ar", "location");
    const offices = tree.kind === "object"
      ? tree.children.find((child) => child.segments.at(-1) === "offices")
      : null;
    const first = offices?.kind === "array" ? offices.items[0] : null;
    const contact = first?.kind === "object"
      ? first.children.find((child) => child.segments.at(-1) === "contact")
      : null;
    expect(contact?.label).toBe("مسؤول التواصل");
  });

  test("a number is an item, and an unknown key still gets a label", () => {
    expect(humanise(0, "ar")).toBe("عنصر 1");
    expect(humanise("tag", "ar")).toBe("العنوان الصغير");
    // Unknown keys fall back rather than disappearing.
    expect(humanise("somethingNew", "ar")).toBe("Something New");
    expect(humanise("tag")).toBe("Tag");
  });
});

// ------------------------------------------------- what the studio may edit

test.describe("fields the system owns", () => {
  test("the contact form's own messages are not editable text", () => {
    for (const path of ["errors", "error", "submitting"]) {
      expect(fieldHidden("contactPage.form", path), path).toBe(true);
    }
    // The thank-you line is a message, not a mechanism: it stays editable.
    expect(fieldHidden("contactPage.form", "success")).toBe(false);
    expect(fieldHidden("contactPage.form", "submit")).toBe(false);
  });

  test("the whole branch leaves the form, not just its parent", () => {
    const tree = describeShape(AR.contactPage.form, [], "ar", "contactPage.form");
    const keys = tree.kind === "object" ? tree.children.map((c) => c.segments.at(-1)) : [];
    expect(keys).not.toContain("errors");
    expect(keys).not.toContain("error");
    expect(keys).toContain("success");
    // And nothing under it survives by another route.
    expect(leaves(tree).some((node) => node.segments.includes("errors"))).toBe(false);
  });

  test("the fields the owner removed are gone from the content itself", () => {
    for (const locale of [EN, AR]) {
      expect(locale.resources.facilities).toBeUndefined();
      for (const stat of locale.hse.stats) expect(stat.suffix).toBeUndefined();
    }
  });

  test("every office carries an address a map can resolve", () => {
    for (const locale of [EN, AR]) {
      expect(locale.location.offices.length).toBe(6);
      for (const office of locale.location.offices) {
        expect(office.city?.trim()).toBeTruthy();
        expect(office.address?.trim()).toBeTruthy();
      }
    }
  });
});
