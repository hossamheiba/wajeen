"""
Key preservation, checked recursively.

The approved invariant is explicit about this: validating top-level
Object.keys() would pass happily while a subtree three levels down quietly
disappeared. Every assertion here walks the whole tree.
"""

from django.test import TestCase

from content.models import ContentBlock, ContentVersion
from content.services import publishing
from content.services.assembler import DRAFT, PUBLISHED, assemble
from content.services.errors import KeyLossError
from content.services.paths import key_paths
from content.services.patching import apply_patch

from .helpers import import_real_content, load_repository_messages

# Namespaces with real nesting, chosen so the walk has something to lose.
DEEP = ["careersPage", "contactPage", "aboutPage", "projectsPage", "businessPage"]


class RecursiveKeyPreservationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def paths(self, namespace, locale="en"):
        block = ContentBlock.objects.get(namespace=namespace, locale=locale)
        return set(key_paths(block.effective_data))

    def test_top_level_key_count_alone_would_not_catch_a_nested_loss(self):
        """The reason the invariant says 'recursively'."""
        before = {"a": {"b": {"c": 1, "d": 2}}, "e": 3}
        after = {"a": {"b": {"c": 1}}, "e": 3}
        self.assertEqual(set(before), set(after), "top-level keys are identical")
        self.assertNotEqual(set(key_paths(before)), set(key_paths(after)))

    def test_a_patch_at_any_depth_preserves_every_deeper_path(self):
        for namespace in DEEP:
            with self.subTest(namespace=namespace):
                before = self.paths(namespace)
                version = ContentBlock.objects.get(namespace=namespace, locale="en").version
                block = apply_patch(
                    namespace=namespace,
                    locale="en",
                    patch={"__probe__": "value"},
                    expected_version=version,
                )
                after = set(key_paths(block.draft_data))
                self.assertTrue(before <= after, f"{namespace} lost paths")
                self.assertEqual(after - before, {"__probe__"})

    def test_patching_a_nested_path_preserves_the_whole_namespace(self):
        before = self.paths("careersPage")
        version = ContentBlock.objects.get(namespace="careersPage", locale="en").version
        block = apply_patch(
            namespace="careersPage",
            locale="en",
            path="values",
            patch={"tag": "new"},
            expected_version=version,
        )
        self.assertEqual(before, set(key_paths(block.draft_data)))

    def test_a_deeply_nested_patch_preserves_its_siblings(self):
        block = ContentBlock.objects.get(namespace="contactPage", locale="en")
        nested = [key for key, value in block.published_data.items() if isinstance(value, dict)]
        self.assertTrue(nested, "contactPage should have nested subtrees")

        target = nested[0]
        subtree = block.published_data[target]
        siblings = set(subtree)
        leaf = next(key for key, value in subtree.items() if isinstance(value, str))
        patched = apply_patch(
            namespace="contactPage",
            locale="en",
            path=target,
            patch={leaf: "rewritten"},
            expected_version=block.version,
        )
        self.assertEqual(siblings, set(patched.draft_data[target]))
        self.assertEqual(set(key_paths(block.published_data)), set(key_paths(patched.draft_data)))

    def test_a_patch_that_drops_a_deep_path_is_rejected(self):
        block = ContentBlock.objects.get(namespace="careersPage", locale="en")
        with self.assertRaises(KeyLossError):
            apply_patch(
                namespace="careersPage",
                locale="en",
                patch={"values": {"items": "no longer a list"}},
                expected_version=block.version,
            )

    def test_publishing_preserves_every_key_path_in_both_locales(self):
        expected = {locale: set(key_paths(load_repository_messages(locale))) for locale in ("en", "ar")}

        for namespace in DEEP:
            for locale in ("en", "ar"):
                version = ContentBlock.objects.get(namespace=namespace, locale=locale).version
                apply_patch(
                    namespace=namespace,
                    locale=locale,
                    patch={"tag": f"edited {locale}"},
                    expected_version=version,
                )

        publishing.publish()
        rebuilt = assemble(PUBLISHED)
        for locale in ("en", "ar"):
            self.assertEqual(expected[locale], set(key_paths(rebuilt[locale])), locale)

    def test_the_draft_assembly_is_as_complete_as_the_published_one(self):
        version = ContentBlock.objects.get(namespace="hero", locale="en").version
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "x"}, expected_version=version)
        published = assemble(PUBLISHED)
        draft = assemble(DRAFT)
        for locale in ("en", "ar"):
            self.assertEqual(set(key_paths(published[locale])), set(key_paths(draft[locale])))

    def test_a_rollback_restores_every_key_path(self):
        expected = {locale: set(key_paths(load_repository_messages(locale))) for locale in ("en", "ar")}
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "later"},
                    expected_version=block.version)
        publishing.publish()
        publishing.rollback(target_number=1)

        rebuilt = assemble(PUBLISHED)
        for locale in ("en", "ar"):
            self.assertEqual(expected[locale], set(key_paths(rebuilt[locale])), locale)

    def test_every_snapshot_ever_written_carries_the_full_key_set(self):
        expected = {locale: set(key_paths(load_repository_messages(locale))) for locale in ("en", "ar")}
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "a"},
                    expected_version=block.version)
        publishing.publish()
        publishing.rollback(target_number=1)

        for version in ContentVersion.objects.all():
            for locale in ("en", "ar"):
                self.assertEqual(
                    expected[locale],
                    set(key_paths(version.snapshot[locale])),
                    f"v{version.number} [{locale}]",
                )
