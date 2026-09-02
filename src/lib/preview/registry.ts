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
  namespace: string,
  label: string,
  image: StaticImageData,
  minHeight?: string,
): PreviewEntry => ({
  Component: PageHeader,
  namespace,
  label,
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
  namespace: string,
  label: string,
  bg: "white" | "off-white",
): PreviewEntry => ({
  Component: PillarGrid,
  namespace,
  label,
  toProps: (ns) => ({ tag: ns.tag, title: ns.title, items: ns.items, bg }),
});

export const PREVIEW_REGISTRY: Record<string, PreviewEntry> = {
  aboutPreview: { Component: AboutPreview, namespace: "aboutPreview", label: "AboutPreview" },
  aboutStory: { Component: AboutStory, namespace: "aboutPage.story", label: "AboutStory" },
  awards: { Component: Awards, namespace: "awards", label: "Awards" },
  careersCta: { Component: CareersCta, namespace: "careersPage.cta", label: "CareersCta" },
  careersPreview: { Component: CareersPreview, namespace: "careersPreview", label: "CareersPreview" },
  certificates: { Component: Certificates, namespace: "certificates", label: "Certificates" },
  contactForm: { Component: ContactForm, namespace: "contactPage.form", label: "ContactForm" },
  contactInfo: { Component: ContactInfo, namespace: "contactPage.info", label: "ContactInfo" },
  ctaBanner: { Component: CtaBanner, namespace: "cta", label: "CtaBanner" },
  deliveryProcess: { Component: DeliveryProcess, namespace: "businessPage.process", label: "DeliveryProcess" },
  fromThePresident: { Component: FromThePresident, namespace: "aboutPage.president", label: "FromThePresident" },
  gallery: { Component: Gallery, namespace: "gallery", label: "Gallery" },
  governance: { Component: Governance, namespace: "aboutPage.governance", label: "Governance" },
  hero: { Component: Hero, namespace: "hero", label: "Hero" },
  leadership: { Component: Leadership, namespace: "aboutPage.leadership", label: "Leadership" },
  missionVision: { Component: MissionVision, namespace: "aboutPage.mission", label: "MissionVision" },
  officeLocation: { Component: OfficeLocation, namespace: "location", label: "OfficeLocation" },
  openPositions: { Component: OpenPositions, namespace: "careersPage.positions", label: "OpenPositions" },
  orgChart: { Component: OrgChart, namespace: "orgChart", label: "OrgChart" },
  ourClients: { Component: OurClients, namespace: "clients", label: "OurClients" },
  presence: { Component: Presence, namespace: "presence", label: "Presence" },
  projectsGrid: { Component: ProjectsGrid, namespace: "projectsPage", label: "ProjectsGrid" },
  qualityPolicy: { Component: QualityPolicy, namespace: "aboutPage.quality", label: "QualityPolicy" },
  resources: { Component: Resources, namespace: "resources", label: "Resources" },
  safetyHSE: { Component: SafetyHSE, namespace: "hse", label: "SafetyHSE" },
  sectorDetails: { Component: SectorDetails, namespace: "businessPage", label: "SectorDetails" },
  servicesList: { Component: ServicesList, namespace: "servicesList", label: "ServicesList" },
  servicesShowcase: { Component: ServicesShowcase, namespace: "business", label: "ServicesShowcase" },
  stats: { Component: Stats, namespace: "stats", label: "Stats" },
  sustainability: { Component: Sustainability, namespace: "sustainability", label: "Sustainability" },
  testimonials: { Component: Testimonials, namespace: "testimonials", label: "Testimonials" },
  ticker: { Component: Ticker, namespace: "ticker", label: "Ticker" },
  values: { Component: Values, namespace: "aboutPage.values", label: "Values" },

  // Prop-driven instances.
  pageHeaderAbout: pageHeader("aboutPage", "Page header — About", heroBg, "min-h-[55vh]"),
  pageHeaderProjects: pageHeader("projectsPage", "Page header — Projects", buildings),
  pageHeaderBusiness: pageHeader("businessPage", "Page header — Business", energy),
  pageHeaderCareers: pageHeader("careersPage", "Page header — Careers", buildings),
  pageHeaderContact: pageHeader("contactPage", "Page header — Contact", infrastructure),
  pillarGridValues: pillarGrid("careersPage.values", "Careers — Values", "white"),
  pillarGridBenefits: pillarGrid("careersPage.benefits", "Careers — Benefits", "off-white"),
};

export type PreviewSectionKey = keyof typeof PREVIEW_REGISTRY;

export function getPreviewEntry(key: string): PreviewEntry | undefined {
  return PREVIEW_REGISTRY[key];
}
