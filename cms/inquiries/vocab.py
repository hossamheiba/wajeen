"""The closed vocabularies an inquiry may use.

Codes, never translated text. A submission stores `riyadh`, and the Arabic and
English labels live in `src/messages/{locale}.json` under
`contactPage.form.*Options` -- so an editor can reword any option in the studio
without a single stored value changing, and a report grouped by city keeps
working in both languages.

These lists exist twice, here and in `src/lib/inquiryVocab.ts`, because Python
and TypeScript cannot share a module. The copies are not trusted to stay in
step: `tests/test_vocab.py` reads both files and fails if they differ, and it
also fails if any code is missing a label in either locale. Drift becomes a red
test rather than a silently rejected form.

Order matters -- it is the order the options appear in the form.
"""

from __future__ import annotations

#: Who a general enquiry is addressed to. Grouped in the UI; the grouping is
#: presentation only and lives in the form, not in the stored value.
SEND_TO: tuple[str, ...] = (
    # Executive
    "ceo",
    "executive_director",
    "general_manager",
    "regional_manager",
    # Delivery
    "projects_manager",
    "project_manager",
    "construction_manager",
    "operations_manager",
    "engineering_manager",
    "planning_manager",
    # Commercial
    "procurement_manager",
    "contracts_manager",
    "business_development_manager",
    "sales_manager",
    "partnerships_manager",
    # Assurance & support
    "quality_manager",
    "hse_manager",
    "human_resources",
    "other",
)

#: What a vendor supplies. Trades first, then professional services, then
#: supply and logistics, then support.
SERVICE_TYPE: tuple[str, ...] = (
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
)

#: Saudi cities, wide enough to cover industrial and contracting activity
#: rather than only the large ones.
#:
#: Eighteen of these codes are already the site's own vocabulary -- they are
#: the keys of SAUDI_CITY_PINS in src/lib/saudiMap.ts and the `city` values of
#: projectsPage.items -- and they are reused deliberately, so a vendor's city
#: and a project's city are one vocabulary and not two that have to be
#: reconciled later.
CITY: tuple[str, ...] = (
    # Central
    "riyadh",
    "alkharj",
    "sudair",
    "qassim",
    "hail",
    # Western
    "jeddah",
    "makkah",
    "madinah",
    "taif",
    "yanbu",
    "rabigh",
    "thuwal",
    # Southern
    "jazan",
    "abha",
    "khamis_mushait",
    "najran",
    # North-western
    "tabuk",
    "neom",
    "duba",
    # Eastern
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
    # Northern
    "hafar_albatin",
    "arar",
    "other",
)


def choices(codes: tuple[str, ...]) -> list[tuple[str, str]]:
    """Django/DRF choices. The second element is never shown to a visitor --
    the form reads its labels from the CMS -- so the code stands in for it."""
    return [(code, code) for code in codes]
