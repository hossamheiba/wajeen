"""Phase 0 -- the equality gate the website's CMS reader stands on.

The rest of this suite proves the *services* round-trip: importer in, assembler
out, compared against the file. This proves the **HTTP payload** does, because
that is the thing `src/i18n/request.ts` will parse once
`WJEEN_CONTENT_SOURCE=cms`.

The numbers are pinned on purpose. A drift of one key is the difference between
a page of content and a page showing `aboutPreview.title` to a visitor, and the
reader's fallback merge is the safety net -- not the plan. If this gate fails,
the CMS is not allowed to become the site's source of text.
"""

import json

from django.test import TestCase
from rest_framework.test import APIClient

from content.models import ContentBlock
from content.services.paths import key_paths, structural_diff

from .helpers import import_real_content, load_repository_messages

LOCALES = ("en", "ar")
#: Leaf paths per locale, list indices counted. Also pinned in test_roundtrip.
KEY_PATHS = 1207
#: Root keys of messages/{locale}.json.
NAMESPACES = 27


class PublicTreeParityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def served(self, locale: str) -> dict:
        response = APIClient().get(f"/api/v1/content/{locale}/")
        self.assertEqual(response.status_code, 200, locale)
        return response.json()

    def test_the_served_tree_is_the_bundled_tree(self):
        for locale in LOCALES:
            bundled = load_repository_messages(locale)
            served = self.served(locale)
            # Readable first: names the paths that differ instead of printing
            # sixty kilobytes of JSON.
            self.assertEqual(structural_diff(bundled, served), [], locale)
            # Then the strict one: equal values, not merely equal shape.
            self.assertEqual(
                json.dumps(served, sort_keys=True, ensure_ascii=False),
                json.dumps(bundled, sort_keys=True, ensure_ascii=False),
                locale,
            )

    def test_every_key_path_is_served(self):
        for locale in LOCALES:
            bundled = set(key_paths(load_repository_messages(locale)))
            served = set(key_paths(self.served(locale)))
            self.assertEqual(len(bundled), KEY_PATHS, locale)
            self.assertEqual(len(served), KEY_PATHS, locale)
            self.assertEqual(served, bundled, locale)

    def test_every_namespace_is_served(self):
        for locale in LOCALES:
            bundled = set(load_repository_messages(locale))
            served = set(self.served(locale))
            self.assertEqual(len(served), NAMESPACES, locale)
            self.assertEqual(served, bundled, locale)

    def test_the_locales_are_served_with_the_same_shape(self):
        """A tree that drifted in one language would break that language only."""
        english, arabic = (set(key_paths(self.served(locale))) for locale in LOCALES)
        self.assertEqual(english, arabic)

    def test_a_draft_never_reaches_the_served_tree(self):
        """The reader asks for published text; this is what makes that true."""
        row = ContentBlock.objects.get(namespace="hero", locale="en")
        published = row.published_data["subtitle"]
        row.draft_data = {**row.published_data, "subtitle": "draft only"}
        row.save(update_fields=["draft_data"])

        self.assertEqual(self.served("en")["hero"]["subtitle"], published)
