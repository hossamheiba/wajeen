"""End-to-end API behaviour: preconditions, path semantics, publish, rollback."""

from django.test import TestCase
from rest_framework.test import APIClient

from content.models import ContentBlock, ContentVersion
from content.services.paths import key_paths, structural_diff

from .helpers import import_real_content, load_repository_messages, login, make_editor


class ApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()
        make_editor()

    def setUp(self):
        self.client = APIClient()
        login(self.client)

    def version_of(self, namespace="hero", locale="en") -> int:
        return ContentBlock.objects.get(namespace=namespace, locale=locale).version

    def patch(self, namespace="hero", locale="en", body=None, if_match=None, **extra):
        given = if_match if if_match is not None else self.version_of(namespace, locale)
        return self.client.patch(
            f"/api/v1/admin/content/{namespace}/{locale}/",
            body or {"patch": {"subtitle": "changed"}},
            format="json",
            HTTP_IF_MATCH=str(given),
            **extra,
        )


class PublicReadTests(ApiTestCase):
    def test_public_messages_match_the_repository_file_exactly(self):
        for locale in ("en", "ar"):
            response = APIClient().get(f"/api/v1/content/{locale}/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                structural_diff(load_repository_messages(locale), response.json()), [], locale
            )

    def test_public_read_carries_the_revision_etag(self):
        response = APIClient().get("/api/v1/content/en/")
        self.assertEqual(response.headers["ETag"], '"1"')

    def test_an_unknown_locale_is_a_404(self):
        self.assertEqual(APIClient().get("/api/v1/content/fr/").status_code, 404)

    def test_public_read_shows_published_content_not_drafts(self):
        original = load_repository_messages("en")["hero"]["subtitle"]
        self.patch(body={"patch": {"subtitle": "draft only"}})
        self.assertEqual(APIClient().get("/api/v1/content/en/").json()["hero"]["subtitle"], original)


class BlockApiTests(ApiTestCase):
    def test_block_list_reports_drafts_and_the_current_revision(self):
        response = self.client.get("/api/v1/admin/content/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["blocks"]), 56)
        self.assertEqual(response.json()["pendingDrafts"], 0)
        self.assertEqual(response.json()["currentRevision"], 1)

    def test_block_detail_returns_published_draft_and_effective(self):
        response = self.client.get("/api/v1/admin/content/hero/en/")
        body = response.json()
        self.assertEqual(response.headers["ETag"], '"1"')
        self.assertIsNone(body["draft"])
        self.assertFalse(body["hasDraft"])
        self.assertEqual(body["effective"], body["published"])

    def test_unknown_namespace_is_a_404(self):
        self.assertEqual(self.client.get("/api/v1/admin/content/nope/en/").status_code, 404)

    def test_patch_without_a_precondition_is_412(self):
        response = self.client.patch(
            "/api/v1/admin/content/hero/en/", {"patch": {"subtitle": "x"}}, format="json"
        )
        self.assertEqual(response.status_code, 412)

    def test_patch_with_a_stale_precondition_is_412(self):
        self.patch()
        response = self.patch(if_match=1)
        self.assertEqual(response.status_code, 412)

    def test_quoted_etag_preconditions_are_accepted(self):
        response = self.client.patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "quoted"}},
            format="json",
            HTTP_IF_MATCH='"1"',
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_the_body_version_may_stand_in_for_if_match(self):
        response = self.client.patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "body version"}, "version": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_a_disagreeing_header_and_body_version_is_a_400(self):
        response = self.client.patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "x"}, "version": 5},
            format="json",
            HTTP_IF_MATCH="1",
        )
        self.assertEqual(response.status_code, 400)

    def test_the_canonical_nested_path_lands_inside_the_namespace(self):
        response = self.patch(
            namespace="careersPage",
            body={"path": "values", "patch": {"tag": "Patched"}},
        )
        self.assertEqual(response.status_code, 200, response.data)
        draft = response.json()["draft"]
        self.assertEqual(draft["values"]["tag"], "Patched")
        self.assertNotIn("careersPage", draft)
        self.assertNotIn("careersPage.values", draft)

    def test_a_root_patch_is_just_an_empty_path(self):
        response = self.patch(body={"path": "", "patch": {"subtitle": "root"}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["draft"]["subtitle"], "root")

    def test_an_omitted_path_means_the_root(self):
        response = self.patch(body={"patch": {"subtitle": "no path key"}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["draft"]["subtitle"], "no path key")

    def test_a_dotted_namespace_in_the_url_is_refused(self):
        response = self.client.patch(
            "/api/v1/admin/content/careersPage.values/en/",
            {"patch": {"tag": "x"}},
            format="json",
            HTTP_IF_MATCH="1",
        )
        self.assertEqual(response.status_code, 404)

    def test_an_empty_patch_is_a_400(self):
        response = self.patch(body={"patch": {}})
        self.assertEqual(response.status_code, 400)

    def test_a_malformed_path_is_a_400(self):
        response = self.patch(body={"path": "a..b", "patch": {"x": 1}})
        self.assertEqual(response.status_code, 400)

    def test_a_patch_that_would_flatten_a_subtree_is_a_409(self):
        response = self.patch(
            namespace="careersPage", body={"patch": {"values": "flattened"}}
        )
        self.assertEqual(response.status_code, 409)

    def test_there_is_no_put_endpoint(self):
        response = self.client.put(
            "/api/v1/admin/content/hero/en/", {"subtitle": "replaced"}, format="json"
        )
        self.assertEqual(response.status_code, 405)

    def test_a_draft_can_be_discarded(self):
        self.patch()
        version = self.version_of()
        response = self.client.delete(
            "/api/v1/admin/content/hero/en/", HTTP_IF_MATCH=str(version)
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(ContentBlock.objects.get(namespace="hero", locale="en").draft_data)

    def test_the_preview_read_shows_drafts_over_published_content(self):
        self.patch(body={"patch": {"subtitle": "previewed"}})
        preview = self.client.get("/api/v1/admin/preview/en/").json()
        self.assertEqual(preview["hero"]["subtitle"], "previewed")
        self.assertEqual(len(list(key_paths(preview))), 962, "preview stays complete")


class PublishApiTests(ApiTestCase):
    def test_publishing_with_no_drafts_is_a_409(self):
        self.assertEqual(
            self.client.post("/api/v1/admin/publish/", {}, format="json").status_code, 409
        )

    def test_publish_creates_a_revision_and_clears_the_draft(self):
        self.patch(body={"patch": {"subtitle": "shipped"}})
        response = self.client.post(
            "/api/v1/admin/publish/", {"label": "ship it"}, format="json", HTTP_IF_MATCH="1"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.json()["number"], 2)
        self.assertIsNone(ContentBlock.objects.get(namespace="hero", locale="en").draft_data)
        self.assertEqual(APIClient().get("/api/v1/content/en/").json()["hero"]["subtitle"], "shipped")

    def test_publishing_against_a_stale_revision_is_a_412(self):
        self.patch()
        self.client.post("/api/v1/admin/publish/", {}, format="json")
        self.patch(namespace="clients", body={"patch": {"tag": "x"}})
        response = self.client.post(
            "/api/v1/admin/publish/", {}, format="json", HTTP_IF_MATCH="1"
        )
        self.assertEqual(response.status_code, 412)

    def test_the_published_snapshot_is_always_complete(self):
        self.patch(body={"patch": {"subtitle": "one namespace only"}})
        self.client.post("/api/v1/admin/publish/", {}, format="json")
        snapshot = ContentVersion.objects.get(number=2).snapshot
        self.assertEqual(sorted(snapshot), ["ar", "en"])
        self.assertEqual(len(list(key_paths(snapshot["en"]))), 962)
        self.assertEqual(len(list(key_paths(snapshot["ar"]))), 962)


class RollbackApiTests(ApiTestCase):
    def ship(self, title):
        self.patch(body={"patch": {"subtitle": title}})
        return self.client.post(
            "/api/v1/admin/publish/", {"label": title}, format="json"
        ).json()["number"]

    def test_versions_are_listed_newest_first(self):
        self.ship("two")
        versions = self.client.get("/api/v1/admin/versions/").json()["versions"]
        self.assertEqual([v["number"] for v in versions], [2, 1])
        self.assertTrue(versions[0]["is_current"])
        self.assertFalse(versions[1]["is_current"])

    def test_rollback_appends_a_revision(self):
        first = self.ship("two")
        self.ship("three")
        response = self.client.post(
            f"/api/v1/admin/versions/{first}/rollback/", {}, format="json", HTTP_IF_MATCH="3"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.json()["number"], 4)
        self.assertEqual(response.json()["source"], "rollback")
        self.assertEqual(response.json()["rolledBackFrom"], 2)
        self.assertEqual(APIClient().get("/api/v1/content/en/").json()["hero"]["subtitle"], "two")

    def test_rollback_against_a_stale_revision_is_a_412(self):
        first = self.ship("two")
        self.ship("three")
        response = self.client.post(
            f"/api/v1/admin/versions/{first}/rollback/", {}, format="json", HTTP_IF_MATCH="1"
        )
        self.assertEqual(response.status_code, 412)

    def test_rolling_back_to_an_unknown_revision_is_a_404(self):
        self.assertEqual(
            self.client.post(
                "/api/v1/admin/versions/999/rollback/", {}, format="json"
            ).status_code,
            404,
        )
