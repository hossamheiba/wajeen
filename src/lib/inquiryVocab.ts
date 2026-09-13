/**
 * The closed vocabularies an inquiry may use.
 *
 * Codes, never translated text. A submission stores `riyadh`, and the labels
 * live in `src/messages/{locale}.json` under `contactPage.form.*Options` — so
 * an editor can reword any option in the studio without a single stored value
 * changing, and a report grouped by city keeps working in both languages.
 *
 * This file is the twin of `cms/inquiries/vocab.py`. Python and TypeScript
 * cannot share a module, so the copies are not trusted to stay in step:
 * `cms/inquiries/tests/test_vocab.py` reads both files and fails if they
 * differ, and fails again if any code is missing a label in either locale.
 * Drift is a red test, not a form that quietly rejects a valid choice.
 *
 * Order matters — it is the order the options appear in the form.
 */

/** Who a general enquiry is addressed to. */
export const SEND_TO = [
  "ceo",
  "executive_director",
  "general_manager",
  "regional_manager",
  "projects_manager",
  "project_manager",
  "construction_manager",
  "operations_manager",
  "engineering_manager",
  "planning_manager",
  "procurement_manager",
  "contracts_manager",
  "business_development_manager",
  "sales_manager",
  "partnerships_manager",
  "quality_manager",
  "hse_manager",
  "human_resources",
  "other",
] as const;

/**
 * How the recipients are presented.
 *
 * Nineteen names in one flat list is a wall; four `<optgroup>`s make it
 * scannable. The grouping is presentation only — the stored value is the bare
 * code, so regrouping later changes nothing in the database.
 */
export const SEND_TO_GROUPS = [
  { key: "executive", codes: ["ceo", "executive_director", "general_manager", "regional_manager"] },
  {
    key: "delivery",
    codes: [
      "projects_manager",
      "project_manager",
      "construction_manager",
      "operations_manager",
      "engineering_manager",
      "planning_manager",
    ],
  },
  {
    key: "commercial",
    codes: [
      "procurement_manager",
      "contracts_manager",
      "business_development_manager",
      "sales_manager",
      "partnerships_manager",
    ],
  },
  { key: "support", codes: ["quality_manager", "hse_manager", "human_resources", "other"] },
] as const;

/** What a vendor supplies: trades, then professional services, then supply. */
export const SERVICE_TYPE = [
  "construction",
  "civil_works",
  "mep",
  "electrical",
  "mechanical",
  "hvac",
  "plumbing",
  "engineering_design",
  "consulting",
  "project_management",
  "facilities_management",
  "operations_maintenance",
  "equipment_rental",
  "material_supply",
  "transportation_logistics",
  "manpower",
  "hse_safety",
  "it_technology",
  "other",
] as const;

/**
 * Saudi cities, wide enough to cover industrial and contracting activity
 * rather than only the large ones.
 *
 * Eighteen of these codes are already the site's own vocabulary — they are the
 * keys of `SAUDI_CITY_PINS` in `src/lib/saudiMap.ts` and the `city` values of
 * `projectsPage.items`. Reused deliberately, so a vendor's city and a
 * project's city are one vocabulary and not two to reconcile later.
 */
export const CITY = [
  "riyadh",
  "alkharj",
  "sudair",
  "qassim",
  "hail",
  "jeddah",
  "makkah",
  "madinah",
  "taif",
  "yanbu",
  "rabigh",
  "thuwal",
  "jazan",
  "abha",
  "khamis_mushait",
  "najran",
  "tabuk",
  "neom",
  "duba",
  "dammam",
  "khobar",
  "dhahran",
  "jubail",
  "rastanura",
  "juaymah",
  "abqaiq",
  "alahsa",
  "qatif",
  "khurais",
  "khursaniyah",
  "safaniyah",
  "tanajib",
  "hafar_albatin",
  "arar",
  "other",
] as const;

export type SendTo = (typeof SEND_TO)[number];
export type ServiceType = (typeof SERVICE_TYPE)[number];
export type City = (typeof CITY)[number];
export type InquiryKind = "contact" | "vendor" | "career";
