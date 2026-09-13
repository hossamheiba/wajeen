"""The media endpoints.

Authentication follows the content app exactly: an HttpOnly JWT cookie plus a
CSRF token on every mutation, via the project-wide DEFAULT_AUTHENTICATION_CLASSES.
The one public endpoint is the manifest, which the website reads and which
carries nothing an anonymous visitor cannot already see on the page.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, ProtectedError
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import MediaAsset, MediaBinding
from ..services import DuplicateAsset, manifest, set_gallery, set_single, store_image
from .serializers import (
    AssetSerializer,
    AssetUpdateSerializer,
    BindingWriteSerializer,
    GalleryWriteSerializer,
)


def problem(message: str, status_code: int, **extra) -> Response:
    """Same error shape the content API uses: a sentence, then a machine code.

    The status argument is `status_code`, not `code`: several callers also pass
    a machine-readable `code` in the body, and naming both the same made the
    second one a duplicate-argument TypeError at exactly the moment an error
    was being reported.
    """
    return Response({"detail": message, **extra}, status=status_code)


class MediaManifestView(APIView):
    """Public. Every active binding, addressed by content path.

    The website calls this on a revalidation schedule and falls back to its
    bundled images if it cannot be reached, so this endpoint being down is a
    slow path, never a broken page.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"bindings": manifest()})


class AssetListView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        # Annotated under a different name from the model's own `usage_count`
        # property: Django assigns annotations with setattr, and a property
        # without a setter turns the whole query into an AttributeError.
        assets = MediaAsset.objects.annotate(binding_total=Count("bindings"))

        category = request.query_params.get("category")
        if category:
            assets = assets.filter(category=category)

        asset_status = request.query_params.get("status")
        if asset_status:
            assets = assets.filter(status=asset_status)

        search = (request.query_params.get("search") or "").strip()
        if search:
            assets = assets.filter(original_name__icontains=search)

        used = request.query_params.get("used")
        if used == "true":
            assets = assets.filter(binding_total__gt=0)
        elif used == "false":
            assets = assets.filter(binding_total=0)

        assets = assets.prefetch_related("bindings")
        return Response({"results": AssetSerializer(assets, many=True).data})

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return problem("Attach an image as `file`.", status.HTTP_400_BAD_REQUEST)

        try:
            asset, created = store_image(
                upload,
                original_name=request.data.get("original_name", "") or upload.name,
                alt_en=request.data.get("alt_en", ""),
                alt_ar=request.data.get("alt_ar", ""),
                category=request.data.get("category", MediaAsset.Category.OTHER),
                user=request.user,
                on_duplicate="reject",
            )
        except DuplicateAsset as duplicate:
            # Not an error the uploader caused -- tell them which row already
            # holds these bytes so the dashboard can select it instead.
            return problem(
                "That exact image is already in the library.",
                status.HTTP_409_CONFLICT,
                code="duplicate_asset",
                asset=AssetSerializer(duplicate.existing).data,
            )
        except DjangoValidationError as invalid:
            return problem(
                "; ".join(invalid.messages),
                status.HTTP_400_BAD_REQUEST,
                code="invalid_image",
            )

        return Response(
            AssetSerializer(asset).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AssetDetailView(APIView):
    def _load(self, pk: int) -> MediaAsset | None:
        return MediaAsset.objects.filter(pk=pk).prefetch_related("bindings").first()

    def get(self, request, pk: int):
        asset = self._load(pk)
        if asset is None:
            return problem("No such image.", status.HTTP_404_NOT_FOUND)
        return Response(AssetSerializer(asset).data)

    def patch(self, request, pk: int):
        asset = self._load(pk)
        if asset is None:
            return problem("No such image.", status.HTTP_404_NOT_FOUND)
        serializer = AssetUpdateSerializer(asset, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AssetSerializer(self._load(pk)).data)

    def delete(self, request, pk: int):
        asset = self._load(pk)
        if asset is None:
            return problem("No such image.", status.HTTP_404_NOT_FOUND)

        stored = asset.file.name
        try:
            asset.delete()
        except ProtectedError:
            # The database refused, which is the guarantee: an image the site
            # shows cannot be deleted by any route. Say exactly where it is.
            places = [binding.address for binding in asset.bindings.all()]
            return problem(
                "That image is in use and was not deleted.",
                status.HTTP_409_CONFLICT,
                code="media_in_use",
                usage=places,
            )

        # Only once the row is gone, and only if no other row shares the file.
        if stored and not MediaAsset.objects.filter(file=stored).exists():
            asset.file.storage.delete(stored)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BindingListView(APIView):
    """Every placement, optionally narrowed to one address."""

    def get(self, request):
        bindings = MediaBinding.objects.select_related("asset")
        namespace = request.query_params.get("namespace")
        if namespace:
            bindings = bindings.filter(namespace=namespace)
        path = request.query_params.get("path")
        if path is not None:
            bindings = bindings.filter(path=path)
        return Response(
            {
                "results": [
                    {
                        "id": binding.id,
                        "namespace": binding.namespace,
                        "path": binding.path,
                        "address": binding.address,
                        "role": binding.role,
                        "position": binding.position,
                        "asset": AssetSerializer(binding.asset).data,
                        "caption_en": binding.caption_en,
                        "caption_ar": binding.caption_ar,
                    }
                    for binding in bindings
                ]
            }
        )


class SlotView(APIView):
    """One address, one role. PUT sets it; DELETE clears it.

    `cover` and `logo` take a single asset (or null, to clear). `gallery` takes
    the finished ordered list, because the dashboard always knows the whole
    order and sending it whole is what makes reordering atomic.
    """

    def _address(self, request):
        namespace = request.data.get("namespace") or request.query_params.get("namespace")
        path = request.data.get("path")
        if path is None:
            path = request.query_params.get("path", "")
        return namespace, path

    def put(self, request, role: str):
        namespace, path = self._address(request)
        if not namespace:
            return problem("`namespace` is required.", status.HTTP_400_BAD_REQUEST)

        if role == MediaBinding.Role.GALLERY:
            serializer = GalleryWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            bindings = set_gallery(namespace, path, serializer.validated_data["items"])
            return Response({"count": len(bindings)})

        if role not in MediaBinding.Role.values:
            return problem(f"Unknown role `{role}`.", status.HTTP_400_BAD_REQUEST)

        serializer = BindingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        set_single(
            namespace,
            path,
            role,
            data["asset"],
            caption_en=data.get("caption_en", ""),
            caption_ar=data.get("caption_ar", ""),
        )
        return Response({"ok": True})

    def delete(self, request, role: str):
        namespace, path = self._address(request)
        if not namespace:
            return problem("`namespace` is required.", status.HTTP_400_BAD_REQUEST)
        removed, _ = MediaBinding.objects.filter(
            namespace=namespace, path=path, role=role
        ).delete()
        return Response({"removed": removed})
