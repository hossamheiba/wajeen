"""The endpoints, over real HTTP, with the real cookie and CSRF policy."""

from __future__ import annotations

import shutil
import tempfile

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from content.tests.helpers import csrf_token, login, make_editor
from media_library.models import MediaAsset, MediaBinding
from media_library.services import set_single, store_image

from .helpers import upload

MEDIA = tempfile.mkdtemp(prefix="wjeen-media-api-test-")


@override_settings(MEDIA_ROOT=MEDIA)
class MediaApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        make_editor()
        login(self.client)
        self.token = csrf_token(self.client)

    def post_file(self, handle, **fields):
        return self.client.post(
            "/api/v1/admin/media/",
            {"file": handle, **fields},
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token,
        )

    # ---- authentication --------------------------------------------------

    def test_the_library_is_closed_to_anonymous_callers(self):
        anonymous = APIClient()
        for method, path in (
            ("get", "/api/v1/admin/media/"),
            ("get", "/api/v1/admin/media/bindings/"),
        ):
            response = getattr(anonymous, method)(path)
            self.assertEqual(response.status_code, 401, path)

    def test_an_upload_without_a_csrf_token_is_refused(self):
        # `enforce_csrf_checks` is not the default: without it DRF's test
        # client skips the very check this test exists to prove.
        strict = APIClient(enforce_csrf_checks=True)
        login(strict)
        response = strict.post(
            "/api/v1/admin/media/", {"file": upload()}, format="multipart"
        )
        self.assertIn(response.status_code, (401, 403))
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_the_manifest_is_public(self):
        response = APIClient().get("/api/v1/media/manifest/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"bindings": {}})

    # ---- upload ----------------------------------------------------------

    def test_uploading_an_image_creates_an_asset(self):
        response = self.post_file(upload("berri.jpg"), alt_en="Berri", category="project")
        self.assertEqual(response.status_code, 201)

        body = response.json()
        self.assertEqual(body["original_name"], "berri.jpg")
        self.assertEqual(body["alt_en"], "Berri")
        self.assertEqual(body["category"], "project")
        self.assertEqual((body["width"], body["height"]), (400, 300))
        self.assertEqual(body["usage_count"], 0)
        self.assertTrue(body["url"])

    def test_uploading_something_that_is_not_an_image_is_refused_with_a_reason(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        response = self.post_file(
            SimpleUploadedFile("shell.jpg", b"not an image at all", content_type="image/jpeg")
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_image")
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_uploading_the_same_image_twice_reports_the_one_already_stored(self):
        first = self.post_file(upload("a.jpg")).json()
        response = self.post_file(upload("b.jpg"))

        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["code"], "duplicate_asset")
        self.assertEqual(body["asset"]["id"], first["id"])
        self.assertEqual(MediaAsset.objects.count(), 1)

    def test_an_upload_with_no_file_says_so(self):
        response = self.client.post(
            "/api/v1/admin/media/", {}, format="multipart", HTTP_X_CSRFTOKEN=self.token
        )
        self.assertEqual(response.status_code, 400)

    # ---- listing and filtering ------------------------------------------

    def test_the_list_can_be_narrowed(self):
        self.post_file(upload("a.jpg", colour=(1, 1, 1)), category="project")
        self.post_file(upload("b.jpg", colour=(2, 2, 2)), category="client")

        self.assertEqual(len(self.client.get("/api/v1/admin/media/").json()["results"]), 2)
        narrowed = self.client.get("/api/v1/admin/media/?category=client").json()["results"]
        self.assertEqual([asset["original_name"] for asset in narrowed], ["b.jpg"])

        found = self.client.get("/api/v1/admin/media/?search=a.j").json()["results"]
        self.assertEqual([asset["original_name"] for asset in found], ["a.jpg"])

    def test_the_list_can_separate_used_from_unused(self):
        used = self.post_file(upload("a.jpg", colour=(1, 1, 1))).json()
        self.post_file(upload("b.jpg", colour=(2, 2, 2)))
        set_single("projectsPage", "items[0]", "cover", MediaAsset.objects.get(pk=used["id"]))

        self.assertEqual(
            [a["original_name"] for a in self.client.get("/api/v1/admin/media/?used=true").json()["results"]],
            ["a.jpg"],
        )
        self.assertEqual(
            [a["original_name"] for a in self.client.get("/api/v1/admin/media/?used=false").json()["results"]],
            ["b.jpg"],
        )

    # ---- metadata --------------------------------------------------------

    def test_alt_text_can_be_edited(self):
        asset = self.post_file(upload()).json()
        response = self.client.patch(
            f"/api/v1/admin/media/{asset['id']}/",
            {"alt_en": "West Pier", "alt_ar": "الرصيف الغربي"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["alt_ar"], "الرصيف الغربي")

    def test_the_bytes_are_not_editable(self):
        """Replacing an image means binding a different one; a file whose
        contents could change behind its URL would serve stale caches."""
        asset = self.post_file(upload()).json()
        response = self.client.patch(
            f"/api/v1/admin/media/{asset['id']}/",
            {"checksum": "0" * 64, "width": 1},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["checksum"], asset["checksum"])
        self.assertEqual(response.json()["width"], asset["width"])

    # ---- deletion --------------------------------------------------------

    def test_deleting_an_unused_image_works(self):
        asset = self.post_file(upload()).json()
        response = self.client.delete(
            f"/api/v1/admin/media/{asset['id']}/", HTTP_X_CSRFTOKEN=self.token
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_deleting_an_image_in_use_is_refused_and_says_where(self):
        asset = self.post_file(upload()).json()
        set_single(
            "projectsPage", "items[3]", "cover", MediaAsset.objects.get(pk=asset["id"])
        )

        response = self.client.delete(
            f"/api/v1/admin/media/{asset['id']}/", HTTP_X_CSRFTOKEN=self.token
        )
        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["code"], "media_in_use")
        self.assertEqual(body["usage"], ["projectsPage.items[3]"])
        self.assertEqual(MediaAsset.objects.count(), 1)

    # ---- slots -----------------------------------------------------------

    def test_a_cover_can_be_set_and_cleared_through_the_api(self):
        asset = self.post_file(upload()).json()

        response = self.client.put(
            "/api/v1/admin/media/slot/cover/",
            {"namespace": "projectsPage", "path": "items[3]", "asset": asset["id"]},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(MediaBinding.objects.count(), 1)

        self.client.put(
            "/api/v1/admin/media/slot/cover/",
            {"namespace": "projectsPage", "path": "items[3]", "asset": None},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(MediaBinding.objects.count(), 0)

    def test_a_gallery_is_written_whole_and_read_back_in_order(self):
        ids = [
            self.post_file(upload(f"{index}.jpg", colour=(index * 40, 10, 10))).json()["id"]
            for index in range(1, 4)
        ]
        response = self.client.put(
            "/api/v1/admin/media/slot/gallery/",
            {
                "namespace": "projectsPage",
                "path": "items[3]",
                "items": [{"asset": asset_id} for asset_id in reversed(ids)],
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 3)

        manifest = APIClient().get("/api/v1/media/manifest/").json()["bindings"]
        urls = [image["url"] for image in manifest["projectsPage.items[3]"]["gallery"]]
        expected = [
            MediaAsset.objects.get(pk=asset_id).file.url for asset_id in reversed(ids)
        ]
        self.assertEqual(urls, expected)

    def test_the_same_image_cannot_be_put_in_a_gallery_twice(self):
        asset = self.post_file(upload()).json()
        response = self.client.put(
            "/api/v1/admin/media/slot/gallery/",
            {
                "namespace": "projectsPage",
                "path": "items[3]",
                "items": [{"asset": asset["id"]}, {"asset": asset["id"]}],
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 400)

    def test_a_slot_write_needs_a_namespace(self):
        asset = self.post_file(upload()).json()
        response = self.client.put(
            "/api/v1/admin/media/slot/cover/",
            {"path": "items[3]", "asset": asset["id"]},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 400)

    def test_bindings_can_be_listed_for_one_namespace(self):
        asset = MediaAsset.objects.get(pk=self.post_file(upload()).json()["id"])
        set_single("projectsPage", "items[3]", "cover", asset)
        set_single("clients", "items[0]", "logo", asset)

        results = self.client.get(
            "/api/v1/admin/media/bindings/?namespace=projectsPage"
        ).json()["results"]
        self.assertEqual([binding["address"] for binding in results], ["projectsPage.items[3]"])
        self.assertEqual(results[0]["asset"]["id"], asset.id)

    def test_an_asset_reports_every_place_that_shows_it(self):
        asset, _ = store_image(upload())
        set_single("projectsPage", "items[3]", "cover", asset)
        set_single("gallery", "items[1]", "cover", asset)

        body = self.client.get(f"/api/v1/admin/media/{asset.id}/").json()
        self.assertEqual(body["usage_count"], 2)
        self.assertEqual(
            sorted(where["address"] for where in body["usage"]),
            ["gallery.items[1]", "projectsPage.items[3]"],
        )
