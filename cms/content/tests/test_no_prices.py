"""The site quotes no prices, and nothing may put them back.

Contract values were taken off Wjeen deliberately. The repository JSON is the
source, the blocks are imported from it and the API serves the blocks, so a
price can only re-enter at one of those three points -- and this file watches
all three at once.

What is *not* a price matters as much as what is. Years, project counts,
areas in m², head counts, phone numbers, postal codes, PO numbers and
certification numbers are all plain facts and all stay; several of them are
bare numbers that a lazier check would have swept up with the money.
"""

from __future__ import annotations

import re

from django.test import TestCase

from content.models import ContentBlock, ContentVersion
from content.services.assembler import PUBLISHED, assemble

from .helpers import import_real_content, load_repository_messages

# Every way a riyal has been written on this site, plus the two foreign
# currencies and the magnitudes that only ever appeared beside one.
#
#   SAR 60 Million | 60 مليون ريال | ر.س | ﷼ | SR 4,630,000 | $1,200 | USD
#
# Anchored on the currency, never on the digits: "2008" and "15,000 m²" must
# not match, and neither may "+966 12 667 80222".
MONEY = re.compile(
    r"\bSAR\b|\bUSD\b|\bSR\s*[\d٠-٩]|[$€£]\s*[\d٠-٩]"
    r"|﷼|ر\.?\s?س\b|\bريال|\bريالا|\bمليون\b|\bمليار\b"
    r"|\b[\d,.]+\s*(?:million|billion|bn)\b",
    re.IGNORECASE,
)


def money_in(value) -> list[str]:
    """Every monetary string inside an arbitrary content tree, with its path."""
    found: list[str] = []

    def walk(node, path=""):
        if isinstance(node, dict):
            for key, child in node.items():
                walk(child, f"{path}.{key}" if path else key)
        elif isinstance(node, list):
            for index, child in enumerate(node):
                walk(child, f"{path}[{index}]")
        elif isinstance(node, str) and MONEY.search(node):
            found.append(f"{path} = {node}")

    walk(value)
    return found


class NoPricesInTheSourceTests(TestCase):
    def test_the_repository_json_quotes_no_price(self):
        for locale in ("en", "ar"):
            hits = money_in(load_repository_messages(locale))
            self.assertEqual(hits, [], f"{locale}.json quotes a price:\n" + "\n".join(hits))

    def test_no_project_row_carries_a_monetary_field(self):
        """The contract value was removed from the data, not hidden in the UI."""
        for locale in ("en", "ar"):
            items = load_repository_messages(locale)["projectsPage"]["items"]
            for index, item in enumerate(items):
                for field in ("value", "price", "cost", "budget", "contractValue"):
                    self.assertNotIn(
                        field, item, f"{locale} projectsPage.items[{index}].{field}"
                    )

    def test_the_numbers_that_are_not_prices_survive(self):
        """A guard on the guard: this file must not be passing by deleting facts."""
        english = load_repository_messages("en")
        self.assertTrue(any("2008" in str(v) for v in english["aboutPage"].values()))
        areas = str(english["presence"]["metrics"])
        self.assertIn("15,000", areas)
        self.assertIn("18,000", areas)
        self.assertIn("+966", str(english["contactPage"]))
        self.assertEqual(len(english["projectsPage"]["items"]), 44)


class NoPricesInTheCMSTests(TestCase):
    def setUp(self):
        import_real_content()

    def test_no_published_block_quotes_a_price(self):
        for block in ContentBlock.objects.all():
            hits = money_in(block.published_data)
            self.assertEqual(hits, [], f"{block} publishes a price:\n" + "\n".join(hits))

    def test_no_draft_quotes_a_price(self):
        for block in ContentBlock.objects.exclude(draft_data=None):
            hits = money_in(block.draft_data)
            self.assertEqual(hits, [], f"{block} drafts a price:\n" + "\n".join(hits))

    def test_the_current_revision_quotes_no_price(self):
        current = ContentVersion.objects.filter(is_current=True).first()
        self.assertIsNotNone(current)
        hits = money_in(current.snapshot)
        self.assertEqual(hits, [], f"v{current.number} quotes a price:\n" + "\n".join(hits))

    def test_the_assembled_tree_quotes_no_price(self):
        """What publish would snapshot, and what the public endpoint serves."""
        hits = money_in(assemble(PUBLISHED))
        self.assertEqual(hits, [], "\n".join(hits))

    def test_the_public_api_serves_no_price(self):
        for locale in ("en", "ar"):
            response = self.client.get(f"/api/v1/content/{locale}/")
            self.assertEqual(response.status_code, 200)
            hits = money_in(response.json())
            self.assertEqual(hits, [], f"/api/v1/content/{locale}/:\n" + "\n".join(hits))


class TheGuardItselfWorksTests(TestCase):
    """A regex that matches nothing would make every test above pass."""

    def test_it_catches_every_form_the_site_used_to_carry(self):
        for wrote in (
            "Seven-year SAR 60 million building trade service contract concluded.",
            "SAR 60M",
            "SAR 4.63 Million",
            "إتمام عقد خدمة أعمال المباني لسبع سنوات بقيمة 60 مليون ريال.",
            "60 مليون ريال",
            "تكلفة 5,000 ر.س",
            "SR 4,630,000",
            "$1,200",
            "USD 900",
        ):
            self.assertTrue(MONEY.search(wrote), wrote)

    def test_it_leaves_the_facts_alone(self):
        for fact in (
            "Founded in 2008 as a joint venture between Arabian Fal and Eng. Ismail AlSayed.",
            "15,000 m²",
            "18,000 م²",
            "230",
            "+966 12 667 80222",
            "P.O. Box 8147, Jeddah 23455",
            "ISO 9001:2015",
            "PO 4512345678",
            "2017–2024",
            "1,200 m",
            "١٥٬٠٠٠ م²",
        ):
            self.assertIsNone(MONEY.search(fact), fact)
