"""The two copies of the vocabulary, and the labels they need.

`cms/inquiries/vocab.py` and `src/lib/inquiryVocab.ts` hold the same lists
because Python and TypeScript cannot share a module. Nothing keeps them in
step except this file: if they drift, a visitor picks an option the server
refuses, and the form reports a validation error nobody can explain.

The label check is the other half. A code with no entry in
`contactPage.form.*Options` renders as an empty `<option>` -- present,
selectable and invisible.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from django.conf import settings
from django.test import TestCase

from inquiries import vocab

TS = Path(settings.REPO_ROOT) / "src" / "lib" / "inquiryVocab.ts"


def ts_list(name: str) -> list[str]:
    """Read one `export const NAME = [...] as const;` array out of the file."""
    source = TS.read_text(encoding="utf-8")
    match = re.search(rf"export const {name} = \[(.*?)\] as const;", source, re.S)
    assert match, f"{name} is not declared in {TS.name}"
    return re.findall(r'"([^"]+)"', match.group(1))


def messages(locale: str) -> dict:
    path = Path(settings.MESSAGES_DIR) / f"{locale}.json"
    return json.loads(path.read_text(encoding="utf-8"))["contactPage"]["form"]


class VocabularyParityTests(TestCase):
    def test_send_to_is_the_same_list_on_both_sides(self):
        self.assertEqual(list(vocab.SEND_TO), ts_list("SEND_TO"))

    def test_service_type_is_the_same_list_on_both_sides(self):
        self.assertEqual(list(vocab.SERVICE_TYPE), ts_list("SERVICE_TYPE"))

    def test_city_is_the_same_list_on_both_sides(self):
        self.assertEqual(list(vocab.CITY), ts_list("CITY"))

    def test_no_code_is_repeated(self):
        for name, codes in (
            ("SEND_TO", vocab.SEND_TO),
            ("SERVICE_TYPE", vocab.SERVICE_TYPE),
            ("CITY", vocab.CITY),
        ):
            self.assertEqual(len(codes), len(set(codes)), name)

    def test_the_open_ended_lists_offer_other(self):
        """A visitor whose answer is not listed must still be able to answer."""
        self.assertIn("other", vocab.SEND_TO)
        self.assertIn("other", vocab.SERVICE_TYPE)
        self.assertIn("other", vocab.CITY)

    def test_the_city_codes_reuse_the_site_vocabulary(self):
        """A vendor's city and a project's city must be one vocabulary.

        These codes are already the keys of SAUDI_CITY_PINS and the `city`
        values of projectsPage.items; inventing a second spelling would mean
        reconciling two lists later.
        """
        projects = json.loads(
            (Path(settings.MESSAGES_DIR) / "en.json").read_text(encoding="utf-8")
        )["projectsPage"]["items"]
        used = {item["city"] for item in projects if item.get("city")}
        self.assertTrue(used, "the content should name some project cities")
        self.assertTrue(
            used <= set(vocab.CITY),
            f"project cities missing from the vendor list: {sorted(used - set(vocab.CITY))}",
        )


class LabelCoverageTests(TestCase):
    def test_every_code_has_a_label_in_both_languages(self):
        for locale in ("en", "ar"):
            form = messages(locale)
            for field, codes in (
                ("sendToOptions", vocab.SEND_TO),
                ("serviceOptions", vocab.SERVICE_TYPE),
                ("cityOptions", vocab.CITY),
            ):
                labels = form[field]
                missing = [code for code in codes if not labels.get(code)]
                self.assertEqual(missing, [], f"{locale}.{field}")

    def test_no_label_exists_for_a_code_that_does_not(self):
        """A label with no code is dead content an editor would maintain forever."""
        for locale in ("en", "ar"):
            form = messages(locale)
            for field, codes in (
                ("sendToOptions", vocab.SEND_TO),
                ("serviceOptions", vocab.SERVICE_TYPE),
                ("cityOptions", vocab.CITY),
            ):
                extra = sorted(set(form[field]) - set(codes))
                self.assertEqual(extra, [], f"{locale}.{field}")

    def test_the_send_to_groups_cover_every_recipient_exactly_once(self):
        source = TS.read_text(encoding="utf-8")
        block = re.search(r"export const SEND_TO_GROUPS = \[(.*?)\] as const;", source, re.S)
        assert block
        grouped = re.findall(r'"([^"]+)"', block.group(1))
        # The group keys are in there too; drop anything that is not a code.
        codes = [code for code in grouped if code in set(vocab.SEND_TO)]
        self.assertEqual(sorted(codes), sorted(vocab.SEND_TO))
        self.assertEqual(len(codes), len(set(codes)), "a recipient appears in two groups")

    def test_the_group_headings_are_translated(self):
        for locale in ("en", "ar"):
            groups = messages(locale)["sendToGroups"]
            for key in ("executive", "delivery", "commercial", "support"):
                self.assertTrue(groups.get(key), f"{locale}.sendToGroups.{key}")

    def test_the_sector_field_is_gone(self):
        """Contact Wjeen no longer asks for a sector, so its copy must not linger."""
        for locale in ("en", "ar"):
            form = messages(locale)
            self.assertNotIn("sector", form)
            self.assertNotIn("sectorOptions", form)
