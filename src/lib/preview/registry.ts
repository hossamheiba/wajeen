/**
 * Section key → the component the public site actually renders.
 *
 * This registry is the whole reason the preview cannot drift from the site: it
 * hands back the real component, never a copy. Adding a section here is the
 * only work a new section needs to become previewable.
 *
 * `namespace` is the next-intl namespace the component reads. The preview host
 * merges incoming draft data at that key, so a component calling
 * `useTranslations("hero")` sees the draft with no knowledge of the studio.
 *
 * A key is NOT a component and a section is NOT a namespace. `PageHeader` is
 * rendered five times from five different namespaces and `PillarGrid` twice,
 * so those appear once per instance and use `toProps` to turn a namespace into
 * the props they expect. Everything else reads its namespace itself and needs
 * no adapter.
 */

import type { ComponentType } from "react";
import { PREVIEW_ENTRY_META, type PreviewEntryKey } from "./entries";
import type { StaticImageData } from "next/image";
import { AboutPreview } from "@/components/sections/AboutPreview";
import { AboutStory } from "@/components/sections/AboutStory";
import { Awards } from "@/components/sections/Awards";
import { CareersCta } from "@/components/sections/CareersCta";
import { CareersPreview } from "@/components/sections/CareersPreview";
import { Certificates } from "@/components/sections/Certificates";
import { ContactForm } from "@/components/sections/ContactForm";
import { ContactInfo } from "@/components/sections/ContactInfo";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { DeliveryProcess } from "@/components/sections/DeliveryProcess";
import { FromThePresident } from "@/components/sections/FromThePresident";
import { Gallery } from "@/components/sections/Gallery";
import { Governance } from "@/components/sections/Governance";
import { Hero } from "@/components/sections/Hero";
import { Leadership } from "@/components/sections/Leadership";
import { MissionVision } from "@/components/sections/MissionVision";
import { OfficeLocation } from "@/components/sections/OfficeLocation";
import { OpenPositions } from "@/components/sections/OpenPositions";
import { OrgChart } from "@/components/sections/OrgChart";
import { OurClients } from "@/components/sections/OurClients";
import { Presence } from "@/components/sections/Presence";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { QualityPolicy } from "@/components/sections/QualityPolicy";
import { Resources } from "@/components/sections/Resources";
import { SafetyHSE } from "@/components/sections/SafetyHSE";
import { SectorDetails } from "@/components/sections/SectorDetails";
import { ServicesList } from "@/components/sections/ServicesList";
import { ServicesShowcase } from "@/components/sections/ServicesShowcase";
import { Stats } from "@/components/sections/Stats";
import { Sustainability } from "@/components/sections/Sustainability";
import { Testimonials } from "@/components/sections/Testimonials";
import { Ticker } from "@/components/sections/Ticker";
import { Values } from "@/components/sections/Values";
import { PageHeader } from "@/components/sections/PageHeader";
import { PillarGrid } from "@/components/sections/PillarGrid";

import heroBg from "../../../public/images/hero_bg.jpg";
import buildings from "../../../public/images/buildings.jpg";
import energy from "../../../public/images/energy.jpg";
import infrastructure from "../../../public/images/infrastructure.jpg";

type Ns = Record<string, unknown>;

export interface PreviewEntry {
  /**
   * The registry holds components with unrelated prop shapes, so this is the
   * one place the union has to widen. `toProps` is what narrows it again per
   * entry, and the host never constructs props itself.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>;
  /** The next-intl namespace whose draft data drives this entry. */
  namespace: string;
  /** Shown in the studio's section list. */
  label: string;
  /**
   * Only for components that take their content as props instead of reading a
   * namespace. Given the draft namespace, return the props to render with.
   */
  toProps?: (ns: Ns) => Record<string, unknown>;
}

/** Page headers: one component, five namespaces, five different photographs. */
const pageHeader = (
  key: PreviewEntryKey,
  image: StaticImageData,
  minHeight?: string,
): PreviewEntry => ({
  Component: PageHeader,
  ...PREVIEW_ENTRY_META[key],
  toProps: (ns) => ({
    tag: ns.tag,
    title: ns.title,
    description: ns.description,
    image,
    ...(minHeight ? { minHeight } : {}),
  }),
});

/** Pillar grids: one component, two namespaces inside careersPage. */
const pillarGrid = (
  key: PreviewEntryKey,
  bg: "white" | "off-white",
): PreviewEntry => ({
  Component: PillarGrid,
  ...PREVIEW_ENTRY_META[key],
  toProps: (ns) => ({ tag: ns.tag, title: ns.title, items: ns.items, bg }),
});

export const PREVIEW_REGISTRY: Record<string, PreviewEntry> = {
  aboutPreview: { Component: AboutPreview, ...PREVIEW_ENTRY_META.aboutPreview },
  aboutStory: { Component: AboutStory, ...PREVIEW_ENTRY_META.aboutStory },
  awards: { Component: Awards, ...PREVIEW_ENTRY_META.awards },
  careersCta: { Component: CareersCta, ...PREVIEW_ENTRY_META.careersCta },
  careersPreview: { Component: CareersPreview, ...PREVIEW_ENTRY_META.careersPreview },
  certificates: { Component: Certificates, ...PREVIEW_ENTRY_META.certificates },
  contactForm: { Component: ContactForm, ...PREVIEW_ENTRY_META.contactForm },
  contactInfo: { Component: ContactInfo, ...PREVIEW_ENTRY_META.contactInfo },
  ctaBanner: { Component: CtaBanner, ...PREVIEW_ENTRY_META.ctaBanner },
  deliveryProcess: { Component: DeliveryProcess, ...PREVIEW_ENTRY_META.deliveryProcess },
  fromThePresident: { Component: FromThePresident, ...PREVIEW_ENTRY_META.fromThePresident },
  gallery: { Component: Gallery, ...PREVIEW_ENTRY_META.gallery },
  governance: { Component: Governance, ...PREVIEW_ENTRY_META.governance },
  hero: { Component: Hero, ...PREVIEW_ENTRY_META.hero },
  leadership: { Component: Leadership, ...PREVIEW_ENTRY_META.leadership },
  missionVision: { Component: MissionVision, ...PREVIEW_ENTRY_META.missionVision },
  officeLocation: { Component: OfficeLocation, ...PREVIEW_ENTRY_META.officeLocation },
  openPositions: { Component: OpenPositions, ...PREVIEW_ENTRY_META.openPositions },
  orgChart: { Component: OrgChart, ...PREVIEW_ENTRY_META.orgChart },
  ourClients: { Component: OurClients, ...PREVIEW_ENTRY_META.ourClients },
  presence: { Component: Presence, ...PREVIEW_ENTRY_META.presence },
  projectsGrid: { Component: ProjectsGrid, ...PREVIEW_ENTRY_META.projectsGrid },
  qualityPolicy: { Component: QualityPolicy, ...PREVIEW_ENTRY_META.qualityPolicy },
  resources: { Component: Resources, ...PREVIEW_ENTRY_META.resources },
  safetyHSE: { Component: SafetyHSE, ...PREVIEW_ENTRY_META.safetyHSE },
  sectorDetails: { Component: SectorDetails, ...PREVIEW_ENTRY_META.sectorDetails },
  servicesList: { Component: ServicesList, ...PREVIEW_ENTRY_META.servicesList },
  servicesShowcase: { Component: ServicesShowcase, ...PREVIEW_ENTRY_META.servicesShowcase },
  stats: { Component: Stats, ...PREVIEW_ENTRY_META.stats },
  sustainability: { Component: Sustainability, ...PREVIEW_ENTRY_META.sustainability },
  testimonials: { Component: Testimonials, ...PREVIEW_ENTRY_META.testimonials },
  ticker: { Component: Ticker, ...PREVIEW_ENTRY_META.ticker },
  values: { Component: Values, ...PREVIEW_ENTRY_META.values },

  // Prop-driven instances.
  pageHeaderAbout: pageHeader("pageHeaderAbout", heroBg, "min-h-[55vh]"),
  pageHeaderProjects: pageHeader("pageHeaderProjects", buildings),
  pageHeaderBusiness: pageHeader("pageHeaderBusiness", energy),
  pageHeaderCareers: pageHeader("pageHeaderCareers", buildings),
  pageHeaderContact: pageHeader("pageHeaderContact", infrastructure),
  pillarGridValues: pillarGrid("pillarGridValues", "white"),
  pillarGridBenefits: pillarGrid("pillarGridBenefits", "off-white"),
};

export type PreviewSectionKey = keyof typeof PREVIEW_REGISTRY;

export function getPreviewEntry(key: string): PreviewEntry | undefined {
  return PREVIEW_REGISTRY[key];
}
