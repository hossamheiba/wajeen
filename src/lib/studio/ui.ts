/**
 * How the studio talks about content, in both languages.
 *
 * The registry names things after components and next-intl namespaces —
 * `pillarGridValues`, `careersPage.values`, `safetyHSE`. Those are correct and
 * stay correct, but they are not what an editor is looking for. This module is
 * the one place that translates them.
 *
 * The Arabic names follow the site's own vocabulary rather than a translation
 * of the English label: the careers page really does say "لماذا وجين", so that
 * is what the screen editing it is called.
 */

import { studioCopy, type Copy, type StudioLocale } from "./i18n";
import { STUDIO_ENTRIES, type StudioEntry } from "./registry";

export interface Presentation {
  /** What the editor reads. */
  name: string;
  /** One line saying where it appears or what it controls. */
  description: string;
}

type Bilingual = Record<StudioLocale, Presentation>;

/**
 * Written out rather than derived. Splitting `safetyHSE` on capitals gives
 * "Safety H S E", and no rule turns `ctaBanner` into "the closing call to
 * action band" — a person has to say what a thing is, in both languages.
 */
const PRESENTATION: Record<string, Bilingual> = {
  hero: {
    en: { name: "Hero", description: "The headline slider at the top of the homepage" },
    ar: { name: "الواجهة", description: "شريط العناوين المتحرك أعلى الصفحة الرئيسية" },
  },
  stats: {
    en: { name: "Wjeen in Numbers", description: "Key figures shown on the homepage" },
    ar: { name: "وجين في أرقام", description: "الأرقام الرئيسية في الصفحة الرئيسية" },
  },
  ticker: {
    en: { name: "Ticker", description: "The scrolling strip of short phrases" },
    ar: { name: "الشريط المتحرك", description: "الشريط النصي المتحرك" },
  },
  aboutPreview: {
    en: { name: "About Teaser", description: "Short About section on the homepage" },
    ar: { name: "لمحة عن وجين", description: "قسم مختصر عن الشركة في الصفحة الرئيسية" },
  },
  careersPreview: {
    en: { name: "Careers Teaser", description: "Short Careers section on the homepage" },
    ar: { name: "لمحة عن الوظائف", description: "قسم مختصر عن الوظائف في الصفحة الرئيسية" },
  },
  servicesShowcase: {
    en: { name: "Services Showcase", description: "The three service cards" },
    ar: { name: "القدرات الأساسية", description: "بطاقات الخدمات الثلاث" },
  },
  ourClients: {
    en: { name: "Clients", description: "The client and vendor wall" },
    ar: { name: "عملاؤنا", description: "جدار العملاء والموردين" },
  },
  presence: {
    en: { name: "Our Reach", description: "The map of where Wjeen works" },
    ar: { name: "أين نعمل", description: "خريطة مواقع وجين في المملكة" },
  },
  gallery: {
    en: { name: "Gallery", description: "Project photography" },
    ar: { name: "المعرض", description: "صور المشاريع" },
  },
  testimonials: {
    en: { name: "Testimonials", description: "What clients say" },
    ar: { name: "بكلماتهم", description: "ما يقوله العملاء" },
  },
  awards: {
    en: { name: "Awards", description: "Recognition and commendations" },
    ar: { name: "التقدير", description: "الشهادات وخطابات الشكر" },
  },
  certificates: {
    en: { name: "Certificates", description: "Registrations and certifications" },
    ar: { name: "الاعتمادات", description: "الشهادات والتسجيلات" },
  },
  resources: {
    en: { name: "Resources", description: "Manpower and equipment figures" },
    ar: { name: "الموارد والمرافق", description: "أرقام العمالة والمعدات" },
  },
  safetyHSE: {
    en: { name: "Safety & Environment", description: "Health, safety and environment" },
    ar: { name: "السلامة والبيئة", description: "الصحة والسلامة والبيئة" },
  },
  sustainability: {
    en: { name: "Sustainability", description: "Sustainability commitments" },
    ar: { name: "الاستدامة", description: "التزامات الاستدامة" },
  },
  orgChart: {
    en: { name: "Organisation Chart", description: "How the company is structured" },
    ar: { name: "الهيكل التنظيمي", description: "كيف تنتظم الشركة" },
  },
  officeLocation: {
    en: { name: "Office Location", description: "Head office address and map" },
    ar: { name: "مكاتبنا", description: "عنوان المقر الرئيسي والخريطة" },
  },
  ctaBanner: {
    en: { name: "Closing Banner", description: "The call to action that ends a page" },
    ar: { name: "شريط الدعوة الختامي", description: "الدعوة لاتخاذ إجراء في نهاية الصفحة" },
  },
  servicesList: {
    en: { name: "Services List", description: "The full list of services offered" },
    ar: { name: "قائمة الخدمات", description: "قائمة الخدمات الكاملة" },
  },

  pageHeaderAbout: {
    en: { name: "About — Page Header", description: "Title area of the About page" },
    ar: { name: "من نحن — ترويسة الصفحة", description: "منطقة العنوان في صفحة من نحن" },
  },
  aboutStory: {
    en: { name: "Our Story", description: "The company history and milestones" },
    ar: { name: "قصتنا", description: "تاريخ الشركة ومحطاتها" },
  },
  fromThePresident: {
    en: { name: "From the President", description: "The president's message" },
    ar: { name: "كلمة الرئيس", description: "رسالة الرئيس والمدير التنفيذي" },
  },
  missionVision: {
    en: { name: "Mission & Vision", description: "What Wjeen aims to do" },
    ar: { name: "الرسالة والرؤية", description: "ما الذي يوجّه عملنا" },
  },
  values: {
    en: { name: "Our Values", description: "The values shown on the About page" },
    ar: { name: "قيمنا", description: "القيم في صفحة من نحن" },
  },
  qualityPolicy: {
    en: { name: "Quality Policy", description: "Quality commitments and certifications" },
    ar: { name: "سياسة الجودة", description: "التزامات الجودة والشهادات" },
  },
  leadership: {
    en: { name: "Leadership Team", description: "Senior people and their roles" },
    ar: { name: "فريق القيادة", description: "القيادات وأدوارهم" },
  },
  governance: {
    en: { name: "Corporate Governance", description: "Board and governance pillars" },
    ar: { name: "الحوكمة المؤسسية", description: "المجلس وركائز الحوكمة" },
  },

  pageHeaderBusiness: {
    en: { name: "Services — Page Header", description: "Title area of the Services page" },
    ar: { name: "الخدمات — ترويسة الصفحة", description: "منطقة العنوان في صفحة الخدمات" },
  },
  sectorDetails: {
    en: { name: "Sector Details", description: "Detail for each service sector" },
    ar: { name: "تفاصيل القطاعات", description: "تفصيل كل قطاع خدمي" },
  },
  deliveryProcess: {
    en: { name: "How We Deliver", description: "The delivery process steps" },
    ar: { name: "كيف ننفّذ", description: "خطوات التنفيذ من الترسية إلى التسليم" },
  },

  pageHeaderProjects: {
    en: { name: "Projects — Page Header", description: "Title area of the Projects page" },
    ar: { name: "المشاريع — ترويسة الصفحة", description: "منطقة العنوان في صفحة المشاريع" },
  },
  projectsGrid: {
    en: { name: "Projects", description: "The project list and its filters" },
    ar: { name: "المشاريع", description: "قائمة المشاريع وعوامل التصفية" },
  },

  pageHeaderCareers: {
    en: { name: "Careers — Page Header", description: "Title area of the Careers page" },
    ar: { name: "الوظائف — ترويسة الصفحة", description: "منطقة العنوان في صفحة الوظائف" },
  },
  pillarGridValues: {
    en: { name: "Why Join Wjeen", description: "Reasons to work at Wjeen" },
    ar: { name: "لماذا وجين", description: "أسباب العمل في وجين" },
  },
  pillarGridBenefits: {
    en: { name: "Benefits", description: "What Wjeen offers employees" },
    ar: { name: "التخصصات", description: "أين يعمل فريقنا" },
  },
  openPositions: {
    en: { name: "Open Positions", description: "Vacancies, or the empty state" },
    ar: { name: "الوظائف الشاغرة", description: "الشواغر، أو الحالة الفارغة" },
  },
  careersCta: {
    en: { name: "Careers — Closing", description: "Send-your-CV call to action" },
    ar: { name: "الوظائف — الخاتمة", description: "دعوة إرسال السيرة الذاتية" },
  },

  pageHeaderContact: {
    en: { name: "Contact — Page Header", description: "Title area of the Contact page" },
    ar: { name: "التواصل — ترويسة الصفحة", description: "منطقة العنوان في صفحة التواصل" },
  },
  contactInfo: {
    en: { name: "Contact Details", description: "Address, phone and email" },
    ar: { name: "بيانات التواصل", description: "العنوان والهاتف والبريد" },
  },
  contactForm: {
    en: { name: "Contact Form", description: "Field labels and messages on the form" },
    ar: { name: "نموذج التواصل", description: "تسميات الحقول ورسائل النموذج" },
  },

  nav: {
    en: { name: "Navigation", description: "The main menu across every page" },
    ar: { name: "القائمة الرئيسية", description: "القائمة الظاهرة في كل الصفحات" },
  },
  footer: {
    en: { name: "Footer", description: "Footer columns and legal line" },
    ar: { name: "التذييل", description: "أعمدة التذييل والسطر القانوني" },
  },
  meta: {
    en: { name: "Search Listing", description: "Title and description used by search engines" },
    ar: { name: "بيانات محركات البحث", description: "العنوان والوصف في نتائج البحث" },
  },
  notFound: {
    en: { name: "Page Not Found", description: "What visitors see on a broken link" },
    ar: { name: "صفحة غير موجودة", description: "ما يراه الزائر عند رابط مكسور" },
  },
};

/** The registry's own group names, which are shorter and more technical. */
const GROUP_KEYS: Record<string, keyof Copy["groups"]> = {
  "Home & shared": "Homepage & shared",
  About: "About page",
  Business: "Services page",
  Projects: "Projects page",
  Careers: "Careers page",
  Contact: "Contact page",
  Global: "Site-wide",
};

/** Stable identifiers, ordered. Display text comes from the copy. */
export const GROUP_ORDER: (keyof Copy["groups"])[] = [
  "Homepage & shared",
  "About page",
  "Services page",
  "Projects page",
  "Careers page",
  "Contact page",
  "Site-wide",
];

function forLocale(locale: string): StudioLocale {
  return locale === "ar" ? "ar" : "en";
}

export function present(entry: StudioEntry, locale: string): Presentation {
  const record = PRESENTATION[entry.key];
  if (!record) return { name: entry.label, description: "" };
  return record[forLocale(locale)];
}

/** The stable group key an entry belongs to. */
export function groupKey(entry: StudioEntry): keyof Copy["groups"] {
  return GROUP_KEYS[entry.group] ?? "Site-wide";
}

export function groupLabel(entry: StudioEntry, locale: string): string {
  return studioCopy(locale).groups[groupKey(entry)];
}

/** The implementation name, shown only where someone asked to see it. */
export function technicalName(entry: StudioEntry): string {
  return entry.namespace;
}

/**
 * Other screens that write to the same stored record.
 *
 * Seven entries share `aboutPage`, so editing one moves the version the others
 * hold. The editor has to be able to say that in words rather than showing a
 * root key.
 */
export function siblings(entry: StudioEntry): StudioEntry[] {
  return STUDIO_ENTRIES.filter(
    (other) => other.root === entry.root && other.key !== entry.key,
  );
}

export type StatusFilter = "all" | "draft" | "published";

export interface SectionRow {
  entry: StudioEntry;
  presentation: Presentation;
  group: keyof Copy["groups"];
  groupLabel: string;
  draftLocales: string[];
  updatedAt: string | null;
}

/** Case- and diacritic-insensitive contains, so Arabic search behaves. */
function matches(haystack: string, needle: string): boolean {
  const normalise = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯؐ-ًؚ-ٰٟ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .toLowerCase();
  return normalise(haystack).includes(normalise(needle));
}

export function filterRows(
  rows: SectionRow[],
  { query, status, locale }: { query: string; status: StatusFilter; locale: string | "all" },
): SectionRow[] {
  const trimmed = query.trim();

  return rows.filter((row) => {
    if (status === "draft" && row.draftLocales.length === 0) return false;
    if (status === "published" && row.draftLocales.length > 0) return false;
    if (locale !== "all" && status === "draft" && !row.draftLocales.includes(locale)) {
      return false;
    }
    if (!trimmed) return true;
    return (
      matches(row.presentation.name, trimmed) ||
      matches(row.presentation.description, trimmed) ||
      matches(row.groupLabel, trimmed) ||
      matches(row.entry.namespace, trimmed)
    );
  });
}

/**
 * A name for a stored record, not for a screen.
 *
 * Activity comes from the API as one row per (namespace, locale), and several
 * screens can share a namespace — seven share `aboutPage`. Labelling such a
 * row with any one screen's name would be a small lie, so the multi-screen
 * roots borrow the page group's name and the rest borrow their only screen's.
 */
const ROOT_GROUPS: Record<string, keyof Copy["groups"]> = {
  aboutPage: "About page",
  businessPage: "Services page",
  careersPage: "Careers page",
  contactPage: "Contact page",
  projectsPage: "Projects page",
};

export function rootName(root: string, locale: string): string {
  const group = ROOT_GROUPS[root];
  if (group) return studioCopy(locale).groups[group];
  const owners = STUDIO_ENTRIES.filter((entry) => entry.root === root);
  return owners.length === 1 ? present(owners[0], locale).name : root;
}

/** How many editing screens write to this record. */
export function rootScreenCount(root: string): number {
  return STUDIO_ENTRIES.filter((entry) => entry.root === root).length;
}

/** Where a record's row should send someone: its screen, or a filtered list. */
export function rootHref(root: string, locale: string): string {
  const owners = STUDIO_ENTRIES.filter((entry) => entry.root === root);
  if (owners.length === 1) return `/${locale}/studio/${owners[0].key}`;
  return `/${locale}/studio/sections?q=${encodeURIComponent(rootName(root, locale))}`;
}

/** Relative time in plain words. Absolute dates read as noise in a list. */
export function timeAgo(iso: string | null, locale: string): string {
  const copy = studioCopy(locale).time;
  if (!iso) return copy.never;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return copy.never;

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return copy.justNow;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return copy.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return copy.hours(hours);
  const days = Math.round(hours / 24);
  if (days === 1) return copy.yesterday;
  if (days < 30) return copy.days(days);
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar" : "en");
}
