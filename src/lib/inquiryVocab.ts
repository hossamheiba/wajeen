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

export interface RecipientGroup {
  key: string;
  /** Empty when the editor cleared the heading: the names then list bare. */
  label: string;
  options: { code: string; label: string }[];
}

/**
 * The "send to" list as a visitor should see it.
 *
 * The codes are fixed — a stored inquiry names its recipient by code — so the
 * studio cannot delete one; the only thing an editor can do to take a person
 * off the list is to clear their name. Drawn as it stood, that left a blank
 * line in the menu for each cleared name and a heading over nothing for each
 * group that emptied: fifteen of nineteen names cleared made a menu that was
 * mostly air.
 *
 * So a blank name is a removed name, and a group with no names left is not
 * drawn. A group whose heading was cleared keeps its names but not the heading.
 *
 * If every name is blank the form would have no recipient to offer and could
 * not be sent at all — a contact form that silently swallows every enquiry is
 * worse than a menu that is wider than the editor meant — so the one catch-all
 * option stays, under a label the caller supplies.
 */
export function recipientGroups(
  optionLabels: unknown,
  groupLabels: unknown,
  fallbackLabel: string,
): RecipientGroup[] {
  const read = (source: unknown, key: string): string => {
    if (source === null || typeof source !== "object") return "";
    const value = (source as Record<string, unknown>)[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const groups = SEND_TO_GROUPS.map((group) => ({
    key: group.key as string,
    label: read(groupLabels, group.key),
    options: group.codes
      .map((code) => ({ code: code as string, label: read(optionLabels, code) }))
      .filter((option) => option.label !== ""),
  })).filter((group) => group.options.length > 0);

  return groups.length > 0
    ? groups
    : [{ key: "other", label: "", options: [{ code: "other", label: fallbackLabel }] }];
}

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
