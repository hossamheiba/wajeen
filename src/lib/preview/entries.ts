/**
 * The preview catalogue as plain data: key → namespace + label.
 *
 * Split out of `registry.ts` so the studio — and the tests that check every
 * namespace is reachable — can read the catalogue without importing forty
 * React sections. `registry.ts` still owns the components and spreads these
 * in, so there is exactly one place a namespace or a label is written down.
 */

export interface PreviewEntryMeta {
  /** The next-intl namespace whose draft data drives this entry. */
  namespace: string;
  /** Shown in the studio's section list. */
  label: string;
}

export const PREVIEW_ENTRY_META = {
  aboutPreview: { namespace: "aboutPreview", label: "AboutPreview" },
  aboutStory: { namespace: "aboutPage.story", label: "AboutStory" },
  awards: { namespace: "awards", label: "Awards" },
  careersCta: { namespace: "careersPage.cta", label: "CareersCta" },
  careersPreview: { namespace: "careersPreview", label: "CareersPreview" },
  certificates: { namespace: "certificates", label: "Certificates" },
  contactForm: { namespace: "contactPage.form", label: "ContactForm" },
  contactInfo: { namespace: "contactPage.info", label: "ContactInfo" },
  ctaBanner: { namespace: "cta", label: "CtaBanner" },
  deliveryProcess: { namespace: "businessPage.process", label: "DeliveryProcess" },
  fromThePresident: { namespace: "aboutPage.president", label: "FromThePresident" },
  gallery: { namespace: "gallery", label: "Gallery" },
  governance: { namespace: "aboutPage.governance", label: "Governance" },
  hero: { namespace: "hero", label: "Hero" },
  leadership: { namespace: "aboutPage.leadership", label: "Leadership" },
  missionVision: { namespace: "aboutPage.mission", label: "MissionVision" },
  officeLocation: { namespace: "location", label: "OfficeLocation" },
  openPositions: { namespace: "careersPage.positions", label: "OpenPositions" },
  orgChart: { namespace: "orgChart", label: "OrgChart" },
  ourClients: { namespace: "clients", label: "OurClients" },
  presence: { namespace: "presence", label: "Presence" },
  projectsGrid: { namespace: "projectsPage", label: "ProjectsGrid" },
  qualityPolicy: { namespace: "aboutPage.quality", label: "QualityPolicy" },
  resources: { namespace: "resources", label: "Resources" },
  safetyHSE: { namespace: "hse", label: "SafetyHSE" },
  sectorDetails: { namespace: "businessPage", label: "SectorDetails" },
  servicesList: { namespace: "servicesList", label: "ServicesList" },
  servicesShowcase: { namespace: "business", label: "ServicesShowcase" },
  stats: { namespace: "stats", label: "Stats" },
  sustainability: { namespace: "sustainability", label: "Sustainability" },
  testimonials: { namespace: "testimonials", label: "Testimonials" },
  ticker: { namespace: "ticker", label: "Ticker" },
  values: { namespace: "aboutPage.values", label: "Values" },
  pageHeaderAbout: { namespace: "aboutPage", label: "Page header — About" },
  pageHeaderProjects: { namespace: "projectsPage", label: "Page header — Projects" },
  pageHeaderBusiness: { namespace: "businessPage", label: "Page header — Business" },
  pageHeaderCareers: { namespace: "careersPage", label: "Page header — Careers" },
  pageHeaderContact: { namespace: "contactPage", label: "Page header — Contact" },
  pillarGridValues: { namespace: "careersPage.values", label: "Careers — Values" },
  pillarGridBenefits: { namespace: "careersPage.benefits", label: "Careers — Benefits" },
} as const satisfies Record<string, PreviewEntryMeta>;

export type PreviewEntryKey = keyof typeof PREVIEW_ENTRY_META;
