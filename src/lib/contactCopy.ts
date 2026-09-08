/**
 * Labels for the vendor half of the contact form.
 *
 * TEMPORARY, and deliberately not in `src/messages/*.json`.
 *
 * Those files are the CMS's content: they are imported, versioned, published
 * and rolled back, and their shape is pinned at 28 namespaces and 962 key
 * paths by tests on both sides. Adding fields there mid-flight would move that
 * baseline, need the CMS database re-imported, and touch ground that is frozen
 * until the inquiry work is approved.
 *
 * The consequence is worth stating plainly: these five labels are the only
 * contact-form copy an editor cannot change in the studio. When the inquiry
 * work lands they move into `contactPage.form` with the rest and this file
 * goes away.
 */

export type Destination = "wjeen" | "vendor";

interface Copy {
  chooseLabel: string;
  wjeen: string;
  wjeenHint: string;
  vendor: string;
  vendorHint: string;
  companyName: string;
  companyNamePlaceholder: string;
  supplyType: string;
  supplyOptions: Record<"materials" | "equipment" | "subcontracting" | "services", string>;
  crNumber: string;
  crNumberPlaceholder: string;
  /** Prefixed to the message so nothing collected is lost before the API. */
  summaryHeading: string;
}

const COPY: Record<"en" | "ar", Copy> = {
  en: {
    chooseLabel: "Who is this for?",
    wjeen: "Wjeen",
    wjeenHint: "General enquiries",
    vendor: "Vendor",
    vendorHint: "Suppliers and subcontractors",
    companyName: "Company Name",
    companyNamePlaceholder: "Your company",
    supplyType: "What do you supply?",
    supplyOptions: {
      materials: "Materials",
      equipment: "Equipment",
      subcontracting: "Subcontracting",
      services: "Services",
    },
    crNumber: "Commercial Registration",
    crNumberPlaceholder: "CR number",
    summaryHeading: "Vendor enquiry",
  },
  ar: {
    chooseLabel: "الرسالة موجهة لمين؟",
    wjeen: "وجين",
    wjeenHint: "استفسارات عامة",
    vendor: "مزود خدمة",
    vendorHint: "الموردون والمقاولون من الباطن",
    companyName: "اسم الشركة",
    companyNamePlaceholder: "اسم شركتك",
    supplyType: "نوع التوريد",
    supplyOptions: {
      materials: "مواد",
      equipment: "معدات",
      subcontracting: "مقاولات من الباطن",
      services: "خدمات",
    },
    crNumber: "السجل التجاري",
    crNumberPlaceholder: "رقم السجل التجاري",
    summaryHeading: "طلب مزود خدمة",
  },
};

export function contactCopy(locale: string): Copy {
  return COPY[locale === "ar" ? "ar" : "en"];
}
