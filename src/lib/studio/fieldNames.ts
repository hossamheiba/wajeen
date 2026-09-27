/**
 * Arabic names for the content's own keys.
 *
 * The editor infers its fields from the data, so a field's label is the JSON
 * key, tidied up: `ctaPrimary` → "Cta primary". That reads as English no
 * matter which language the studio is in, which is why an Arabic editor was
 * looking at "Tag", "Title" and "Pillars" over Arabic values.
 *
 * These keys are not content — they are the shape of it — so they cannot live
 * in `messages/*.json`, where every key is published, versioned and rolled
 * back. They belong beside the studio's own interface copy.
 *
 * A key with no entry here falls back to the English tidy-up rather than to
 * nothing: an unnamed field is still editable, and a missing word is a gap to
 * fill, not a failure. `tests/studio/logic.spec.ts` reports how much of the
 * live content vocabulary is covered, so the gap stays visible.
 */

import { SAUDI_CITY_NAMES } from "@/lib/saudiMap";

export const FIELD_NAMES_AR: Record<string, string> = {
  // ---- the words almost every section uses -------------------------------
  tag: "العنوان الصغير",
  headline: "العنوان الرئيسي",
  title: "العنوان",
  titleEnd: "تكملة العنوان",
  subtitle: "العنوان الفرعي",
  description: "الوصف",
  desc: "الوصف",
  summary: "الملخص",
  body: "النص",
  body1: "النص ١",
  body2: "النص ٢",
  body3: "النص ٣",
  note: "ملاحظة",
  label: "التسمية",
  name: "الاسم",
  value: "القيمة",
  suffix: "اللاحقة",
  count: "العدد",
  items: "العناصر",
  item: "عنصر",
  key: "المفتاح",
  code: "الرمز",
  short: "مختصر",
  quote: "اقتباس",
  role: "الدور",
  year: "السنة",
  image: "الصورة",
  logo: "الشعار",
  category: "التصنيف",
  status: "الحالة",
  statusLabel: "تسمية الحالة",
  statusLabels: "تسميات الحالة",
  filters: "التصفية",
  all: "الكل",
  scope: "نطاق العمل",
  location: "الموقع",
  city: "المدينة",
  address: "العنوان البريدي",
  phone: "الهاتف",
  mobile: "الجوال",
  email: "البريد الإلكتروني",
  hours: "ساعات العمل",
  company: "الشركة",
  companyName: "اسم الشركة",
  rights: "حقوق النشر",
  message: "الرسالة",
  media: "الوسائط",
  gallery: "معرض الصور",
  slides: "الشرائح",
  photos: "الصور",
  line1: "السطر ١",
  line2: "السطر ٢",
  highlight: "الكلمة المميّزة",
  phrases: "العبارات",
  scroll: "تلميح التمرير",

  // ---- calls to action and navigation ------------------------------------
  cta: "زر الإجراء",
  ctaPrimary: "الزر الرئيسي",
  ctaSecondary: "الزر الثانوي",
  contactCta: "زر التواصل",
  homeCta: "زر الرئيسية",
  applyLabel: "زر التقديم",
  viewAll: "عرض الكل",
  button: "الزر",
  submit: "إرسال",
  submitting: "جارٍ الإرسال",
  direct: "تواصل مباشر",
  directionsLabel: "زر الاتجاهات",
  openMenu: "فتح القائمة",
  closeMenu: "إغلاق القائمة",
  skipToContent: "تخطٍّ إلى المحتوى",
  nav: "القائمة",
  footer: "التذييل",
  meta: "بيانات محركات البحث",
  notFound: "صفحة غير موجودة",
  emptyState: "حالة الفراغ",
  error: "خطأ",
  errors: "رسائل الخطأ",
  success: "نجاح",
  pages: "الصفحات",
  home: "الرئيسية",
  about: "عن وجين",
  aboutSub: "قائمة عن وجين",
  businessSub: "قائمة الخدمات",
  contact: "تواصل معنا",
  careers: "الوظائف",
  projects: "المشاريع",
  business: "الخدمات",
  story: "قصتنا",
  leaders: "القيادة",
  values: "قيمنا",
  sustainability: "الاستدامة",
  newsroom: "الأخبار",
  mediaKit: "الملف الإعلامي",
  resources: "الموارد",

  // ---- the sections -------------------------------------------------------
  hero: "الواجهة",
  stats: "الأرقام",
  clients: "العملاء",
  aboutPreview: "نبذة عن وجين",
  aboutPage: "صفحة عن وجين",
  businessPage: "صفحة الخدمات",
  careersPage: "صفحة الوظائف",
  careersPreview: "نبذة الوظائف",
  contactPage: "صفحة التواصل",
  projectsPage: "صفحة المشاريع",
  servicesList: "قائمة الخدمات",
  sectors: "القطاعات",
  testimonials: "آراء العملاء",
  certificates: "الشهادات",
  certifications: "الاعتمادات",
  certificationsLabel: "تسمية الاعتمادات",
  awards: "الجوائز",
  governance: "الحوكمة",
  leadership: "القيادة",
  mission: "الرسالة والرؤية",
  milestones: "المحطات",
  orgChart: "الهيكل التنظيمي",
  org: "المنظمة",
  departments: "الإدارات",
  board: "مجلس الإدارة",
  boardLabel: "تسمية المجلس",
  boardCaption: "تعليق المجلس",
  members: "الأعضاء",
  president: "الرئيس",
  executive: "الإدارة التنفيذية",
  ceo: "الرئيس التنفيذي",
  lead: "المقدمة",
  process: "مراحل العمل",
  steps: "الخطوات",
  delivery: "التنفيذ",
  delivered: "منجَز",
  ongoing: "جارٍ",
  quality: "الجودة",
  hse: "الصحة والسلامة",
  pillars: "المحاور",
  capabilities: "القدرات",
  cards: "البطاقات",
  positions: "الوظائف الشاغرة",
  benefits: "المزايا",
  facilities: "المنشآت",
  info: "بيانات التواصل",
  form: "النموذج",
  offices: "المكاتب",
  ticker: "الشريط المتحرك",
  stat: "الرقم",
  badgeNumber: "رقم الشارة",
  badgeText: "نص الشارة",

  // ---- figures the sections label ----------------------------------------
  manpower: "العمالة",
  manpowerLabel: "تسمية العمالة",
  manpowerNote: "ملاحظة العمالة",
  manpowerTitle: "عنوان العمالة",
  equipment: "المعدات",
  equipmentLabel: "تسمية المعدات",
  equipmentNote: "ملاحظة المعدات",
  equipmentTitle: "عنوان المعدات",
  unitsLabel: "تسمية الوحدات",
  staffLabel: "تسمية الموظفين",
  contract: "العقد",
  contractLabel: "تسمية العقد",
  trades: "التخصصات",
  po: "رقم أمر الشراء",
  vendor: "رقم المورّد",

  // ---- the contact form ---------------------------------------------------
  kinds: "أنواع الطلبات",
  sendTo: "الجهة المستقبِلة",
  sendToGroups: "مجموعات الجهات",
  sendToOptions: "خيارات الجهات",
  sendToPlaceholder: "تلميح الجهة",
  sendToRequired: "الجهة مطلوبة",
  serviceType: "نوع الخدمة",
  serviceOptions: "خيارات الخدمة",
  serviceTypePlaceholder: "تلميح نوع الخدمة",
  serviceTypeRequired: "نوع الخدمة مطلوب",
  cityOptions: "خيارات المدن",
  cityPlaceholder: "تلميح المدينة",
  cityRequired: "المدينة مطلوبة",
  namePlaceholder: "تلميح الاسم",
  nameRequired: "الاسم مطلوب",
  companyNamePlaceholder: "تلميح اسم الشركة",
  companyRequired: "اسم الشركة مطلوب",
  contactPerson: "الشخص المسؤول",
  contactPersonPlaceholder: "تلميح الشخص المسؤول",
  contactPersonRequired: "الشخص المسؤول مطلوب",
  emailPlaceholder: "تلميح البريد",
  emailInvalid: "بريد غير صالح",
  phonePlaceholder: "تلميح الهاتف",
  phoneRequired: "الهاتف مطلوب",
  messagePlaceholder: "تلميح الرسالة",
  messageRequired: "الرسالة مطلوبة",
  messageMin: "الرسالة قصيرة",
  isAramcoVendor: "مورّد أرامكو",
  aramcoVendorId: "رقم مورّد أرامكو",
  aramcoVendorIdPlaceholder: "تلميح رقم المورّد",
  aramcoIdRequired: "رقم المورّد مطلوب",
  career: "التوظيف",
  careerHint: "تلميح التوظيف",
  contactHint: "تلميح التواصل",
  vendorHint: "تلميح الموردين",
  cv: "السيرة الذاتية",
  cvChoose: "اختيار السيرة",
  cvChosen: "تم اختيار السيرة",
  cvHint: "تلميح السيرة",
  cvRequired: "السيرة مطلوبة",
  cvTooLarge: "الملف كبير",
  cvWrongType: "نوع ملف غير مقبول",

  // ---- sectors and services, as the content keys them --------------------
  construction: "الإنشاءات",
  industrial: "الصناعي",
  infrastructure: "البنية التحتية",
  buildings: "المباني",
  energy: "الطاقة",
  renovation: "الترميم",
  commercial: "التجاري",
  civil_works: "الأعمال المدنية",
  mechanical: "الميكانيكا",
  electrical: "الكهرباء",
  plumbing: "السباكة",
  hvac: "التكييف",
  mep: "الأعمال الكهروميكانيكية",
  engineering_design: "التصميم الهندسي",
  project_management: "إدارة المشاريع",
  operations_maintenance: "التشغيل والصيانة",
  facilities_management: "إدارة المرافق",
  material_supply: "توريد المواد",
  equipment_rental: "تأجير المعدات",
  transportation_logistics: "النقل واللوجستيات",
  consulting: "الاستشارات",
  hse_safety: "الصحة والسلامة",
  it_technology: "تقنية المعلومات",
  human_resources: "الموارد البشرية",
  support: "الدعم",
  other: "أخرى",

  // ---- the job titles the org chart and the form use ---------------------
  general_manager: "المدير العام",
  executive_director: "المدير التنفيذي",
  operations_manager: "مدير العمليات",
  projects_manager: "مدير المشاريع",
  project_manager: "مدير مشروع",
  construction_manager: "مدير الإنشاءات",
  engineering_manager: "مدير الهندسة",
  contracts_manager: "مدير العقود",
  procurement_manager: "مدير المشتريات",
  planning_manager: "مدير التخطيط",
  quality_manager: "مدير الجودة",
  hse_manager: "مدير الصحة والسلامة",
  regional_manager: "المدير الإقليمي",
  sales_manager: "مدير المبيعات",
  business_development_manager: "مدير تطوير الأعمال",
  partnerships_manager: "مدير الشراكات",

  // ---- places, as the content keys them ----------------------------------
  riyadh: "الرياض",
  jeddah: "جدة",
  makkah: "مكة المكرمة",
  madinah: "المدينة المنورة",
  dammam: "الدمام",
  khobar: "الخبر",
  dhahran: "الظهران",
  jubail: "الجبيل",
  yanbu: "ينبع",
  rastanura: "رأس تنورة",
  tanajib: "تناجيب",
  juaymah: "الجعيمة",
  khurais: "خريص",
  khursaniyah: "الخرسانية",
  safaniyah: "السفانية",
  abqaiq: "بقيق",
  qatif: "القطيف",
  alahsa: "الأحساء",
  alkharj: "الخرج",
  qassim: "القصيم",
  hail: "حائل",
  tabuk: "تبوك",
  arar: "عرعر",
  jazan: "جازان",
  najran: "نجران",
  abha: "أبها",
  khamis_mushait: "خميس مشيط",
  taif: "الطائف",
  hafar_albatin: "حفر الباطن",
  rabigh: "رابغ",
  duba: "ضباء",
  thuwal: "ثول",
  sudair: "سدير",
  neom: "نيوم",
  vp1: "رصيف ١",
  vp2: "رصيف ٢",
};

/**
 * Notes under a field, for the handful that carry a convention rather than
 * plain text. Keyed by `namespace.path`, with the array index written as `[]`
 * so one note covers every row of a list.
 */
export const FIELD_HINTS: Record<string, { en: string; ar: string }> = {
  "cta.title": {
    en: "Wrap the phrase to underline in *asterisks*.",
    ar: "حُط العبارة اللي عايزها تحتها خط بين *نجمتين*.",
  },
  "projectsPage.items[].city": {
    en: "Where the pin goes on the map. Leave it unset to list the project without a pin.",
    ar: "مكان الدبوس على الخريطة. سيبها بدون لو المشروع مالوش مكان محدد.",
  },
  "projectsPage.items[].location": {
    en: "The place as it reads on the card — the site and the client.",
    ar: "المكان زي ما يظهر في البطاقة — الموقع والعميل.",
  },
  "hero.slides[].headline": {
    en: "Wrap the closing phrase in *asterisks* to set it in the lighter weight.",
    ar: "حُط العبارة الأخيرة بين *نجمتين* عشان تظهر بخط أفتح.",
  },
};

/** The note for a field, if it has one. `items[2].x` looks up `items[].x`. */
export function fieldHint(namespace: string, path: string, locale: string): string | null {
  const key = `${namespace}.${path}`.replace(/\[\d+\]/g, "[]");
  const hint = FIELD_HINTS[key];
  return hint ? hint[locale === "ar" ? "ar" : "en"] : null;
}

/**
 * Fields the editor does not show.
 *
 * These name a file that shipped with the build — `berri-gas-plant` — and the
 * media library owns pictures now: the Media panel picks one, and this string
 * is only the copy under /public that the site falls back to. Leaving it in
 * the form put an English file name in an Arabic dashboard and invited an edit
 * that would quietly break the fallback. The value stays in the record; the
 * form simply does not offer it.
 */
export const FIELD_HIDDEN = new Set([
  // The sector's own id. It is what `/business#infrastructure` matches on, so
  // the footer's links break if it changes — and it means nothing to an
  // editor, who knows the sector by its title.
  "businessPage.sectors[].key",
  "business.cards[].key",
  "projectsPage.items[].image",
  "gallery.items[].image",
  "clients.items[].logo",
]);

export function fieldHidden(namespace: string, path: string): boolean {
  return FIELD_HIDDEN.has(`${namespace}.${path}`.replace(/\[\d+\]/g, "[]"));
}

/**
 * Fields that are a choice, not a sentence.
 *
 * A project's city has to be one of the places the map has a pin for, and its
 * status and sector have to be one of the keys the section already labels.
 * Typed by hand, all three were a guess: an unknown city left the project off
 * the map with nothing to explain it, and `ongoing` in a box is not a word
 * anyone chose. `from` reads the choices out of the record being edited, so
 * adding a sector to `filters` adds it to this list too.
 */
export const FIELD_CHOICES: Record<
  string,
  { source: "cities" } | { source: "record"; from: string; omit?: string[] }
> = {
  "projectsPage.items[].city": { source: "cities" },
  "projectsPage.items[].status": { source: "record", from: "statusLabels" },
  "projectsPage.items[].category": { source: "record", from: "filters", omit: ["all"] },
};

export interface FieldChoice {
  value: string;
  label: string;
}

/**
 * The choices for a field, or null when it is free text. `record` is the block
 * being edited, so labels come from the same content the site renders.
 */
export function fieldChoices(
  namespace: string,
  path: string,
  locale: string,
  record: unknown,
): FieldChoice[] | null {
  const spec = FIELD_CHOICES[`${namespace}.${path}`.replace(/\[\d+\]/g, "[]")];
  if (!spec) return null;

  if (spec.source === "cities") {
    return Object.entries(SAUDI_CITY_NAMES)
      .map(([value, name]) => ({ value, label: name[locale === "ar" ? "ar" : "en"] }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }

  const table = (record as Record<string, unknown> | null)?.[spec.from];
  if (!table || typeof table !== "object") return null;
  return Object.entries(table as Record<string, unknown>)
    .filter(([value]) => !spec.omit?.includes(value))
    .map(([value, label]) => ({ value, label: typeof label === "string" ? label : value }));
}

/** How many of the given key names this file can name in Arabic. */
export function arabicCoverage(names: string[]): { named: number; missing: string[] } {
  const missing = names.filter((name) => !(name in FIELD_NAMES_AR));
  return { named: names.length - missing.length, missing };
}
