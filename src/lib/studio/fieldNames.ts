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
  header: "ترويسة الصفحة",
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
  department: "الإدارة",
  type: "نوع التعاقد",
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
  footer: "أسفل الصفحة",
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
 * The same vocabulary in English.
 *
 * A peer of `FIELD_NAMES_AR`, key for key, and written the same way: sentence
 * case, plain words, self-explanatory. It exists because the fallback below
 * derives a label from the key name, which produced "Desc", "Cta Primary",
 * "Cv Hint" and "Send To Groups" — the key spelled out, not English an editor
 * reads. Proper nouns keep their capitals; everything else is a sentence, not
 * a Title.
 */
export const FIELD_NAMES_EN: Record<string, string> = {
  // ---- the words almost every section uses -------------------------------
  tag: "Small heading",
  headline: "Main heading",
  header: "Page header",
  title: "Title",
  titleEnd: "Rest of the heading",
  subtitle: "Subtitle",
  description: "Description",
  desc: "Description",
  summary: "Summary",
  body: "Paragraph",
  body1: "Paragraph 1",
  body2: "Paragraph 2",
  body3: "Paragraph 3",
  note: "Note",
  label: "Label",
  name: "Name",
  value: "Value",
  suffix: "Suffix",
  count: "Count",
  items: "Items",
  item: "Item",
  key: "Key",
  code: "Code",
  short: "Short form",
  quote: "Quote",
  role: "Role",
  year: "Year",
  image: "Image",
  logo: "Logo",
  category: "Category",
  status: "Status",
  statusLabel: "Status label",
  statusLabels: "Status labels",
  filters: "Filters",
  all: "All",
  scope: "Scope of work",
  location: "Location",
  department: "Department",
  type: "Contract type",
  city: "City",
  address: "Postal address",
  phone: "Phone",
  mobile: "Mobile",
  email: "Email",
  hours: "Working hours",
  company: "Company",
  companyName: "Company name",
  rights: "Copyright line",
  message: "Message",
  media: "Media",
  gallery: "Photo gallery",
  slides: "Slides",
  photos: "Photos",
  line1: "Line 1",
  line2: "Line 2",
  highlight: "Emphasised word",
  phrases: "Phrases",
  scroll: "Scroll hint",
  // ---- calls to action and navigation ------------------------------------
  cta: "Call-to-action",
  ctaPrimary: "Main button",
  ctaSecondary: "Secondary button",
  contactCta: "Contact button",
  homeCta: "Home button",
  applyLabel: "Apply button",
  viewAll: "View all",
  button: "Button",
  submit: "Submit button",
  submitting: "While sending",
  direct: "Reports directly to the board",
  directionsLabel: "Directions button",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  skipToContent: "Skip to content",
  nav: "Navigation",
  footer: "Page footer",
  meta: "Search listing",
  notFound: "Page not found",
  emptyState: "Shown when the list is empty",
  error: "Error",
  errors: "Error messages",
  success: "Success",
  pages: "Pages",
  home: "Home",
  about: "About Wjeen",
  aboutSub: "About menu",
  businessSub: "Services menu",
  contact: "Contact",
  careers: "Careers",
  projects: "Projects",
  business: "Services",
  story: "Our story",
  leaders: "Leadership",
  values: "Our values",
  sustainability: "Sustainability",
  newsroom: "Newsroom",
  mediaKit: "Media kit",
  resources: "Resources",
  // ---- the sections -------------------------------------------------------
  hero: "Hero",
  stats: "Figures",
  clients: "Clients",
  aboutPreview: "About preview",
  aboutPage: "About page",
  businessPage: "Services page",
  careersPage: "Careers page",
  careersPreview: "Careers preview",
  contactPage: "Contact page",
  projectsPage: "Projects page",
  servicesList: "Services list",
  sectors: "Sectors",
  testimonials: "Testimonials",
  certificates: "Certificates",
  certifications: "Accreditations",
  certificationsLabel: "Accreditations label",
  awards: "Awards",
  governance: "Governance",
  leadership: "Leadership",
  mission: "Mission and vision",
  milestones: "Milestones",
  orgChart: "Organisation chart",
  org: "Issued by",
  departments: "Departments",
  board: "Board",
  boardLabel: "Board name",
  boardCaption: "Caption under the board photo",
  members: "Members",
  president: "President",
  executive: "Executive management",
  ceo: "Chief executive",
  lead: "One-line intro",
  process: "How we work",
  steps: "Steps",
  delivery: "Delivery",
  delivered: "Delivered",
  ongoing: "Ongoing",
  quality: "Quality",
  hse: "Health and safety",
  pillars: "Pillars",
  capabilities: "Capabilities",
  cards: "Cards",
  positions: "Open positions",
  benefits: "Benefits",
  info: "Contact details",
  form: "Form",
  offices: "Offices",
  ticker: "Scrolling strip",
  stat: "Figure",
  badgeNumber: "Badge number",
  badgeText: "Badge text",
  // ---- figures the sections label ----------------------------------------
  manpower: "Manpower",
  manpowerLabel: "Manpower label",
  manpowerNote: "Manpower note",
  manpowerTitle: "Manpower heading",
  equipment: "Equipment",
  equipmentLabel: "Equipment label",
  equipmentNote: "Equipment note",
  equipmentTitle: "Equipment heading",
  unitsLabel: "The word for units",
  staffLabel: "The word for staff",
  contract: "Contract",
  contractLabel: "Contract label",
  trades: "Trades",
  po: "Purchase order number",
  vendor: "Vendor number",
  // ---- the contact form ---------------------------------------------------
  kinds: "Enquiry types",
  sendTo: "Send to",
  sendToGroups: "Department groups",
  sendToOptions: "Department options",
  sendToPlaceholder: "Send-to placeholder",
  sendToRequired: "Send-to required",
  serviceType: "Service type",
  serviceOptions: "Service options",
  serviceTypePlaceholder: "Service-type placeholder",
  serviceTypeRequired: "Service-type required",
  cityOptions: "City options",
  cityPlaceholder: "City placeholder",
  cityRequired: "City required",
  namePlaceholder: "Name placeholder",
  nameRequired: "Name required",
  companyNamePlaceholder: "Company-name placeholder",
  companyRequired: "Company required",
  contactPerson: "Contact person",
  contactPersonPlaceholder: "Contact-person placeholder",
  contactPersonRequired: "Contact-person required",
  emailPlaceholder: "Email placeholder",
  emailInvalid: "Email invalid",
  phonePlaceholder: "Phone placeholder",
  phoneRequired: "Phone required",
  messagePlaceholder: "Message placeholder",
  messageRequired: "Message required",
  messageMin: "Message too short",
  isAramcoVendor: "Aramco vendor",
  aramcoVendorId: "Aramco vendor number",
  aramcoVendorIdPlaceholder: "Vendor-number placeholder",
  aramcoIdRequired: "Vendor number required",
  career: "Careers",
  careerHint: "Careers hint",
  contactHint: "Contact hint",
  vendorHint: "Vendors hint",
  cv: "CV",
  cvChoose: "Choose CV",
  cvChosen: "CV chosen",
  cvHint: "Note under the CV box",
  cvRequired: "CV required",
  cvTooLarge: "File too large",
  cvWrongType: "File type not accepted",
  // ---- sectors and services, as the content keys them --------------------
  construction: "Construction",
  industrial: "Industrial",
  infrastructure: "Infrastructure",
  buildings: "Buildings",
  energy: "Energy",
  renovation: "Renovation",
  commercial: "Commercial",
  civil_works: "Civil works",
  mechanical: "Mechanical",
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  mep: "MEP",
  engineering_design: "Engineering and design",
  project_management: "Project management",
  operations_maintenance: "Operations and maintenance",
  facilities_management: "Facilities management",
  material_supply: "Material supply",
  equipment_rental: "Equipment rental",
  transportation_logistics: "Transport and logistics",
  consulting: "Consulting",
  hse_safety: "Health and safety",
  it_technology: "IT",
  human_resources: "Human resources",
  support: "Support",
  other: "Other",
  // ---- the job titles the org chart and the form use ---------------------
  general_manager: "General Manager",
  executive_director: "Executive Director",
  operations_manager: "Operations Manager",
  projects_manager: "Projects Manager",
  project_manager: "Project Manager",
  construction_manager: "Construction Manager",
  engineering_manager: "Engineering Manager",
  contracts_manager: "Contracts Manager",
  procurement_manager: "Procurement Manager",
  planning_manager: "Planning Manager",
  quality_manager: "Quality Manager",
  hse_manager: "HSE Manager",
  regional_manager: "Regional Manager",
  sales_manager: "Sales Manager",
  business_development_manager: "Business Development Manager",
  partnerships_manager: "Partnerships Manager",
  // ---- places, as the content keys them ----------------------------------
  riyadh: "Riyadh",
  jeddah: "Jeddah",
  makkah: "Makkah",
  madinah: "Madinah",
  dammam: "Dammam",
  khobar: "Al Khobar",
  dhahran: "Dhahran",
  jubail: "Jubail",
  yanbu: "Yanbu",
  rastanura: "Ras Tanura",
  tanajib: "Tanajib",
  juaymah: "Juaymah",
  khurais: "Khurais",
  khursaniyah: "Khursaniyah",
  safaniyah: "Safaniyah",
  abqaiq: "Abqaiq",
  qatif: "Qatif",
  alahsa: "Al Ahsa",
  alkharj: "Al Kharj",
  qassim: "Qassim",
  hail: "Hail",
  tabuk: "Tabuk",
  arar: "Arar",
  jazan: "Jazan",
  najran: "Najran",
  abha: "Abha",
  khamis_mushait: "Khamis Mushait",
  taif: "Taif",
  hafar_albatin: "Hafar Al Batin",
  rabigh: "Rabigh",
  duba: "Duba",
  thuwal: "Thuwal",
  sudair: "Sudair",
  neom: "NEOM",
  vp1: "First vice-presidency",
  vp2: "Second vice-presidency",
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
  "resources.trades[].count": {
    en: "Drawn against a round hundred, not against the other trades — this figure moves its own bar only.",
    ar: "الشريط مرسوم على مئة، مش بالمقارنة بباقي التخصصات — الرقم دا بيحرّك شريطه هو بس.",
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
  // Picks the card's icon, the way a sector's key picks its photograph.
  "aboutPage.mission.cards[].key",
  "business.cards[].key",
  "projectsPage.items[].image",
  "gallery.items[].image",
  "clients.items[].logo",
  // The form talking to itself, not the company talking to a visitor: what the
  // validator says about an empty field, what a failed send says, and the
  // button's own "sending…". They are wired to the checks that produce them —
  // editing the sentence cannot change when it appears, and wording it wrongly
  // leaves a visitor stuck with no way to know what the form wants. The
  // success line stays editable: that one is a message, not a mechanism.
  "contactPage.form.errors",
  "contactPage.form.error",
  "contactPage.form.submitting",
]);

/**
 * Names for keys whose meaning changes with where they sit.
 *
 * `contact` is "تواصل معنا" on a button and the name of a person inside an
 * office card. One flat vocabulary cannot say both, so the exact path wins
 * over the key's general name.
 */
export const FIELD_NAMES_BY_PATH: Record<string, { en: string; ar: string }> = {
  "location.offices[].contact": { en: "Person to ask for", ar: "مسؤول التواصل" },
};

export function fieldNameAt(
  namespace: string,
  path: string,
  locale: string,
): string | null {
  const entry = FIELD_NAMES_BY_PATH[`${namespace}.${path}`.replace(/\[\d+\]/g, "[]")];
  return entry ? entry[locale === "ar" ? "ar" : "en"] : null;
}

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
export function nameCoverage(
  names: string[],
  locale: string,
): { named: number; missing: string[] } {
  const table = locale === "ar" ? FIELD_NAMES_AR : FIELD_NAMES_EN;
  const missing = names.filter((name) => !(name in table));
  return { named: names.length - missing.length, missing };
}
