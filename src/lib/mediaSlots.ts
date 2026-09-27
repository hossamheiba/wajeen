/**
 * Every picture on the site that is not part of a content list.
 *
 * The media library binds a file to a content address — `(namespace, path)`.
 * Three namespaces carry *lists* of pictures (a project, a client, a gallery
 * item), and those addresses are read straight off the content tree. The rest
 * of the site's photography used to be `import photo from "public/images/…"`,
 * which no editor could reach: the dashboard showed the section's words and
 * the picture beside them was a constant.
 *
 * This is the register of those fixed pictures. One entry per slot, and the
 * same module is read by the section that draws it and by the studio screen
 * that offers it, so an address cannot drift between the two. The Python
 * importer keeps its own copy of the list — it cannot import TypeScript — and
 * `tests/studio/logic.spec.ts` holds the two side by side.
 *
 * `bundled` is the file that shipped with the build. It stays: it is what the
 * site draws until someone replaces it, and what it falls back to if the CMS
 * is unreachable, so adding a slot here changes nothing visible on its own.
 */

export type SlotRole = "cover" | "gallery";

export interface FixedSlot {
  /** Root key of messages/{locale}.json. */
  namespace: string;
  /** The address inside it. Need not exist in the content tree. */
  path: string;
  /** `gallery` is an ordered set behind one address — a slider. */
  role: SlotRole;
  /** What the studio calls this picture. */
  label: { en: string; ar: string };
  /** The file under /public that ships with the build, `null` for a set. */
  bundled: string | null;
  /** Roughly how the section draws it, so the studio can warn about shape. */
  hint?: { en: string; ar: string };
}

export const FIXED_MEDIA_SLOTS: Record<string, FixedSlot[]> = {
  hero: [
    slide(0, "buildings"),
    slide(1, "infrastructure"),
    slide(2, "energy"),
  ],
  aboutPreview: [
    {
      namespace: "aboutPreview",
      path: "photos",
      role: "gallery",
      label: { en: "Slider photos", ar: "صور السلايدر" },
      bundled: null,
      hint: {
        en: "Every photo here becomes one slide, in this order.",
        ar: "كل صورة هنا بتبقى شريحة، بنفس الترتيب ده.",
      },
    },
  ],
  stats: [
    stat(0, "values"),
    stat(1, "hero_bg"),
    stat(2, "projects/tanajib-tool-house"),
    stat(3, "projects/west-pier-wp1"),
  ],
  sustainability: [
    {
      namespace: "sustainability",
      path: "photo",
      role: "cover",
      label: { en: "Section photo", ar: "صورة القسم" },
      bundled: "/images/energy.jpg",
    },
  ],
  businessPage: [
    sector(0, "infrastructure"),
    sector(1, "energy"),
    sector(2, "buildings"),
    header("businessPage", "energy"),
  ],
  // The three About-family pages share one namespace and one block, so each
  // header is addressed by the page it belongs to.
  aboutPage: [
    header("aboutPage", "story", "pages.story.header", "Our story"),
    header("aboutPage", "leaders", "pages.leaders.header", "Leadership"),
    header("aboutPage", "values", "pages.values.header", "Values"),
  ],
  careersPage: [header("careersPage", "buildings")],
  contactPage: [header("contactPage", "infrastructure")],
};

/** The three photographs behind the hero's headlines, in their order. */
function slide(index: number, file: string): FixedSlot {
  return {
    namespace: "hero",
    path: `slides[${index}]`,
    role: "cover",
    label: { en: `Slide ${index + 1}`, ar: `الشريحة ${index + 1}` },
    bundled: `/images/${file}.jpg`,
  };
}

/** One medallion in "Wjeen in numbers". */
function stat(index: number, file: string): FixedSlot {
  return {
    namespace: "stats",
    path: `items[${index}]`,
    role: "cover",
    label: { en: `Figure ${index + 1}`, ar: `الرقم ${index + 1}` },
    bundled: `/images/${file}.jpg`,
  };
}

/**
 * One sector's photograph. The home page's services cards and the business
 * page's detail panels draw the same sector, so they share one address: an
 * editor replaces the picture of "Infrastructure" once.
 */
function sector(index: number, file: string): FixedSlot {
  return {
    namespace: "businessPage",
    path: `sectors[${index}]`,
    role: "cover",
    label: { en: `Sector ${index + 1}`, ar: `القطاع ${index + 1}` },
    bundled: `/images/${file}.jpg`,
  };
}

/** The photograph behind a page's title. */
function header(namespace: string, file: string, path = "header", page?: string): FixedSlot {
  return {
    namespace,
    path,
    role: "cover",
    label: page
      ? { en: `Page header — ${page}`, ar: `صورة رأس صفحة ${page}` }
      : { en: "Page header photo", ar: "صورة رأس الصفحة" },
    bundled: `/images/${file}.jpg`,
  };
}

/** The slots of one namespace, or none. */
export function slotsFor(namespace: string): FixedSlot[] {
  return FIXED_MEDIA_SLOTS[namespace] ?? [];
}

export function hasFixedSlots(namespace: string): boolean {
  return namespace in FIXED_MEDIA_SLOTS;
}
