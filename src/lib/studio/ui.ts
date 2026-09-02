/**
 * How the studio talks about content.
 *
 * The registry names things after components and next-intl namespaces —
 * `pillarGridValues`, `careersPage.values`, `safetyHSE`. Those are correct and
 * they stay correct, but they are not what an editor is looking for. This
 * module is the one place that translates them, so a label never gets invented
 * at a call site and the technical name is always still available underneath.
 */

import { STUDIO_ENTRIES, type StudioEntry } from "./registry";

export interface Presentation {
  /** What the editor reads. */
  name: string;
  /** One line saying where it appears or what it controls. */
  description: string;
}

/**
 * Written out rather than derived. Splitting `safetyHSE` on capitals gives
 * "Safety H S E", and no rule turns `ctaBanner` into "the closing call to
 * action band" — a person has to say what a thing is.
 */
const PRESENTATION: Record<string, Presentation> = {
  hero: { name: "Hero", description: "The headline slider at the top of the homepage" },
  stats: { name: "Wjeen in Numbers", description: "Key figures shown on the homepage" },
  ticker: { name: "Ticker", description: "The scrolling strip of short phrases" },
  aboutPreview: { name: "About Teaser", description: "Short About section on the homepage" },
  careersPreview: { name: "Careers Teaser", description: "Short Careers section on the homepage" },
  servicesShowcase: { name: "Services Showcase", description: "The three service cards" },
  ourClients: { name: "Clients", description: "The client and vendor wall" },
  presence: { name: "Our Reach", description: "The map of where Wjeen works" },
  gallery: { name: "Gallery", description: "Project photography" },
  testimonials: { name: "Testimonials", description: "What clients say" },
  awards: { name: "Awards", description: "Recognition and commendations" },
  certificates: { name: "Certificates", description: "Registrations and certifications" },
  resources: { name: "Resources", description: "Manpower and equipment figures" },
  safetyHSE: { name: "Safety & Environment", description: "Health, safety and environment" },
  sustainability: { name: "Sustainability", description: "Sustainability commitments" },
  orgChart: { name: "Organisation Chart", description: "How the company is structured" },
  officeLocation: { name: "Office Location", description: "Head office address and map" },
  ctaBanner: { name: "Closing Banner", description: "The call to action that ends a page" },
  servicesList: { name: "Services List", description: "The full list of services offered" },

  pageHeaderAbout: { name: "About — Page Header", description: "Title area of the About page" },
  aboutStory: { name: "Our Story", description: "The company history and milestones" },
  fromThePresident: { name: "From the President", description: "The president's message" },
  missionVision: { name: "Mission & Vision", description: "What Wjeen aims to do" },
  values: { name: "Our Values", description: "The values shown on the About page" },
  qualityPolicy: { name: "Quality Policy", description: "Quality commitments and certifications" },
  leadership: { name: "Leadership Team", description: "Senior people and their roles" },
  governance: { name: "Corporate Governance", description: "Board and governance pillars" },

  pageHeaderBusiness: { name: "Services — Page Header", description: "Title area of the Services page" },
  sectorDetails: { name: "Sector Details", description: "Detail for each service sector" },
  deliveryProcess: { name: "How We Deliver", description: "The delivery process steps" },

  pageHeaderProjects: { name: "Projects — Page Header", description: "Title area of the Projects page" },
  projectsGrid: { name: "Projects", description: "The project list and its filters" },

  pageHeaderCareers: { name: "Careers — Page Header", description: "Title area of the Careers page" },
  pillarGridValues: { name: "Why Join Wjeen", description: "Reasons to work at Wjeen" },
  pillarGridBenefits: { name: "Benefits", description: "What Wjeen offers employees" },
  openPositions: { name: "Open Positions", description: "Vacancies, or the empty state" },
  careersCta: { name: "Careers — Closing", description: "Send-your-CV call to action" },

  pageHeaderContact: { name: "Contact — Page Header", description: "Title area of the Contact page" },
  contactInfo: { name: "Contact Details", description: "Address, phone and email" },
  contactForm: { name: "Contact Form", description: "Field labels and messages on the form" },

  nav: { name: "Navigation", description: "The main menu across every page" },
  footer: { name: "Footer", description: "Footer columns and legal line" },
  meta: { name: "Search Listing", description: "Title and description used by search engines" },
  notFound: { name: "Page Not Found", description: "What visitors see on a broken link" },
};

/** Human group names. The registry's own are shorter and more technical. */
const GROUPS: Record<string, string> = {
  "Home & shared": "Homepage & shared",
  About: "About page",
  Business: "Services page",
  Projects: "Projects page",
  Careers: "Careers page",
  Contact: "Contact page",
  Global: "Site-wide",
};

export const GROUP_DISPLAY_ORDER = [
  "Homepage & shared",
  "About page",
  "Services page",
  "Projects page",
  "Careers page",
  "Contact page",
  "Site-wide",
] as const;

export function present(entry: StudioEntry): Presentation {
  return (
    PRESENTATION[entry.key] ?? {
      name: entry.label,
      description: "",
    }
  );
}

export function groupName(entry: StudioEntry): string {
  return GROUPS[entry.group] ?? entry.group;
}

/** The implementation name, shown only where someone asked to see it. */
export function technicalName(entry: StudioEntry): string {
  return entry.namespace;
}

/**
 * Other screens that write to the same underlying record.
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
  group: string;
  draftLocales: string[];
  updatedAt: string | null;
}

/** Case- and diacritic-insensitive contains, so Arabic search behaves. */
function matches(haystack: string, needle: string): boolean {
  const normalise = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ًͯ-ٟ]/g, "")
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
      matches(row.group, trimmed) ||
      matches(row.entry.namespace, trimmed)
    );
  });
}

/** Relative time in plain words. Absolute dates read as noise in a list. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * A name for a stored record, not for a screen.
 *
 * Activity comes from the API as one row per (namespace, locale), and several
 * screens can share a namespace — seven share `aboutPage`. Labelling such a
 * row with any one screen's name would be a small lie, so the multi-screen
 * roots get a page-level name and the rest borrow their only screen's.
 */
const ROOT_NAMES: Record<string, string> = {
  aboutPage: "About page",
  businessPage: "Services page",
  careersPage: "Careers page",
  contactPage: "Contact page",
  projectsPage: "Projects page",
};

export function rootName(root: string): string {
  if (ROOT_NAMES[root]) return ROOT_NAMES[root];
  const owners = STUDIO_ENTRIES.filter((entry) => entry.root === root);
  return owners.length === 1 ? present(owners[0]).name : root;
}

/** How many editing screens write to this record. */
export function rootScreenCount(root: string): number {
  return STUDIO_ENTRIES.filter((entry) => entry.root === root).length;
}

/** Where a record's row should send someone: its screen, or a filtered list. */
export function rootHref(root: string, locale: string): string {
  const owners = STUDIO_ENTRIES.filter((entry) => entry.root === root);
  if (owners.length === 1) return `/${locale}/studio/${owners[0].key}`;
  return `/${locale}/studio/sections?q=${encodeURIComponent(rootName(root))}`;
}
