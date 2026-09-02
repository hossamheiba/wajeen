"""The hard gate, as a test as well as a command."""

import json
from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from content.models import ContentBlock
from content.services.assembler import PUBLISHED, assemble
from content.services.paths import key_paths, max_depth, structural_diff, type_name

from .helpers import import_real_content, load_repository_messages


class RoundTripGateTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def test_gate_command_passes_on_real_content(self):
        out = StringIO()
        call_command("verify_roundtrip", stdout=out)
        self.assertIn("ROUND-TRIP GATE PASSED", out.getvalue())

    def test_semantic_equality_in_both_locales(self):
        rebuilt = assemble(PUBLISHED)
        for locale in ("en", "ar"):
            original = load_repository_messages(locale)
            self.assertEqual(structural_diff(original, rebuilt[locale]), [], locale)

    def test_every_key_path_survives(self):
        rebuilt = assemble(PUBLISHED)
        for locale in ("en", "ar"):
            original = set(key_paths(load_repository_messages(locale)))
            self.assertEqual(original, set(key_paths(rebuilt[locale])), locale)
            self.assertEqual(len(original), 962)

    def test_nested_depth_is_preserved(self):
        rebuilt = assemble(PUBLISHED)
        for locale in ("en", "ar"):
            original = load_repository_messages(locale)
            self.assertEqual(max_depth(original), max_depth(rebuilt[locale]))
            self.assertEqual(max_depth(original), 5)

    def test_list_order_and_length_are_preserved(self):
        rebuilt = assemble(PUBLISHED)["en"]
        original = load_repository_messages("en")

        def walk(want, got, where=""):
            if isinstance(want, list):
                self.assertEqual(len(want), len(got), where)
                for index, (a, b) in enumerate(zip(want, got)):
                    walk(a, b, f"{where}[{index}]")
            elif isinstance(want, dict):
                for key in want:
                    walk(want[key], got[key], f"{where}.{key}")

        walk(original, rebuilt)

    def test_primitive_types_are_preserved(self):
        """A string "230" must not come back as the integer 230, or vice versa."""
        rebuilt = assemble(PUBLISHED)["en"]
        original = load_repository_messages("en")
        census_before = self._census(original)
        census_after = self._census(rebuilt)
        self.assertEqual(census_before, census_after)
        self.assertEqual(census_before, {"str": 867, "int": 94, "list": 1})

    def test_the_empty_list_is_not_silently_dropped(self):
        """careersPage.positions.items is deliberately empty -- and must stay a list."""
        block = ContentBlock.objects.get(namespace="careersPage", locale="en")
        self.assertEqual(block.published_data["positions"]["items"], [])
        self.assertIsInstance(block.published_data["positions"]["items"], list)

    def test_whitespace_and_key_order_are_irrelevant(self):
        """Reserialising with different formatting must not change the verdict."""
        original = load_repository_messages("en")
        reshuffled = json.loads(
            json.dumps(
                {key: original[key] for key in reversed(list(original))},
                indent=8,
                ensure_ascii=False,
            )
        )
        self.assertEqual(structural_diff(original, reshuffled), [])

    def test_gate_fails_loudly_when_a_key_goes_missing(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        data = dict(block.published_data)
        removed = sorted(data)[0]
        data.pop(removed)
        block.published_data = data
        block.save()

        with self.assertRaises(CommandError):
            call_command("verify_roundtrip", stdout=StringIO(), stderr=StringIO())

    def test_gate_fails_when_a_type_changes(self):
        block = ContentBlock.objects.get(namespace="stats", locale="en")
        data = json.loads(json.dumps(block.published_data))

        def stringify(node):
            if isinstance(node, dict):
                return {k: stringify(v) for k, v in node.items()}
            if isinstance(node, list):
                return [stringify(v) for v in node]
            return str(node) if isinstance(node, int) and not isinstance(node, bool) else node

        block.published_data = stringify(data)
        block.save()
        if block.published_data != data:
            with self.assertRaises(CommandError):
                call_command("verify_roundtrip", stdout=StringIO(), stderr=StringIO())

    def _census(self, tree):
        census = {}

        def walk(node):
            if isinstance(node, dict) and node:
                for value in node.values():
                    walk(value)
            elif isinstance(node, list) and node:
                for value in node:
                    walk(value)
            else:
                name = type_name(node)
                census[name] = census.get(name, 0) + 1

        walk(tree)
        return census
