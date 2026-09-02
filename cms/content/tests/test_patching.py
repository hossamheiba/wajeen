"""Deep merge, path semantics, and the no-key-loss invariant."""

from django.test import TestCase

from content.models import ContentBlock
from content.services.errors import ConcurrencyError, KeyLossError, UnknownBlockError
from content.services.paths import deep_merge, get_at_path, key_paths, set_at_path
from content.services.patching import apply_patch, discard_draft, split_namespace_path

from .helpers import import_real_content


class PathContractTests(TestCase):
    def test_namespace_and_path_split_on_the_first_dot(self):
        self.assertEqual(split_namespace_path("careersPage.values"), ("careersPage", "values"))
        self.assertEqual(split_namespace_path("hero"), ("hero", ""))
        self.assertEqual(
            split_namespace_path("contactPage.form.fields"), ("contactPage", "form.fields")
        )

    def test_get_and_set_mirror_the_typescript_helpers(self):
        tree = {"a": {"b": {"c": 1}}, "d": 2}
        self.assertEqual(get_at_path(tree, "a.b.c"), 1)
        self.assertEqual(get_at_path(tree, ""), tree)
        self.assertIsNone(get_at_path(tree, "a.missing.deep"))

        updated = set_at_path(tree, "a.b.c", 9)
        self.assertEqual(updated["a"]["b"]["c"], 9)
        self.assertEqual(updated["d"], 2)
        self.assertEqual(tree["a"]["b"]["c"], 1, "the original tree must not be mutated")

    def test_deep_merge_replaces_lists_wholesale(self):
        base = {"items": [1, 2, 3], "meta": {"a": 1, "b": 2}}
        merged = deep_merge(base, {"items": [9], "meta": {"b": 5}})
        self.assertEqual(merged["items"], [9])
        self.assertEqual(merged["meta"], {"a": 1, "b": 5})


class ApplyPatchTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def block(self, namespace="hero", locale="en"):
        return ContentBlock.objects.get(namespace=namespace, locale=locale)

    def test_root_patch_merges_without_dropping_siblings(self):
        before = self.block()
        original_paths = set(key_paths(before.published_data))

        block = apply_patch(
            namespace="hero",
            locale="en",
            path="",
            patch={"subtitle": "New headline"},
            expected_version=before.version,
        )

        self.assertEqual(block.draft_data["subtitle"], "New headline")
        self.assertTrue(original_paths <= set(key_paths(block.draft_data)))
        self.assertEqual(block.published_data, before.published_data, "publish untouched")

    def test_nested_path_lands_inside_the_namespace_root(self):
        """careersPage.values is namespace careersPage + path values."""
        before = self.block("careersPage")
        block = apply_patch(
            namespace="careersPage",
            locale="en",
            path="values",
            patch={"tag": "Patched tag"},
            expected_version=before.version,
        )
        self.assertEqual(block.draft_data["values"]["tag"], "Patched tag")
        self.assertNotIn("careersPage.values", block.draft_data)
        self.assertNotIn("careersPage", block.draft_data)

    def test_nested_patch_keeps_every_sibling_at_every_depth(self):
        before = self.block("careersPage")
        original_paths = set(key_paths(before.published_data))
        block = apply_patch(
            namespace="careersPage",
            locale="en",
            path="values",
            patch={"tag": "x"},
            expected_version=before.version,
        )
        self.assertEqual(original_paths, set(key_paths(block.draft_data)))

    def test_second_patch_builds_on_the_first(self):
        block = apply_patch(
            namespace="hero", locale="en", patch={"subtitle": "one"},
            expected_version=self.block().version,
        )
        block = apply_patch(
            namespace="hero", locale="en", patch={"tag": "two"},
            expected_version=block.version,
        )
        self.assertEqual(block.draft_data["subtitle"], "one")
        self.assertEqual(block.draft_data["tag"], "two")

    def test_patch_bumps_only_this_blocks_version(self):
        arabic_before = self.block("hero", "ar").version
        block = apply_patch(
            namespace="hero", locale="en", patch={"subtitle": "x"},
            expected_version=self.block().version,
        )
        self.assertEqual(block.version, 2)
        self.assertEqual(self.block("hero", "ar").version, arabic_before)

    def test_stale_version_is_refused(self):
        apply_patch(
            namespace="hero", locale="en", patch={"subtitle": "x"},
            expected_version=self.block().version,
        )
        with self.assertRaises(ConcurrencyError):
            apply_patch(
                namespace="hero", locale="en", patch={"subtitle": "y"}, expected_version=1
            )

    def test_unknown_namespace_is_refused(self):
        with self.assertRaises(UnknownBlockError):
            apply_patch(
                namespace="nope", locale="en", patch={"a": 1}, expected_version=1
            )

    def test_a_namespace_containing_a_dot_is_refused(self):
        """The API must never accept careersPage.values as a namespace."""
        with self.assertRaises(UnknownBlockError):
            apply_patch(
                namespace="careersPage.values",
                locale="en",
                patch={"tag": "x"},
                expected_version=1,
            )

    def test_a_scalar_patch_is_refused(self):
        with self.assertRaises(KeyLossError):
            apply_patch(
                namespace="hero", locale="en", patch="just a string",
                expected_version=self.block().version,
            )

    def test_replacing_a_subtree_with_a_scalar_is_refused(self):
        """This is the whole reason PUT does not exist."""
        with self.assertRaises(KeyLossError):
            apply_patch(
                namespace="careersPage",
                locale="en",
                patch={"values": "flattened"},
                expected_version=self.block("careersPage").version,
            )

    def test_discarding_a_draft_leaves_published_content_alone(self):
        block = apply_patch(
            namespace="hero", locale="en", patch={"subtitle": "draft only"},
            expected_version=self.block().version,
        )
        published = dict(block.published_data)
        block = discard_draft(namespace="hero", locale="en", expected_version=block.version)
        self.assertIsNone(block.draft_data)
        self.assertEqual(block.published_data, published)
