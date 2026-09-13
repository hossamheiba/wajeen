from __future__ import annotations

from rest_framework import serializers

from ..models import MediaAsset, MediaBinding


class BindingBriefSerializer(serializers.ModelSerializer):
    """Where an asset is used -- the answer the delete dialog needs."""

    address = serializers.CharField(read_only=True)

    class Meta:
        model = MediaBinding
        fields = ["id", "namespace", "path", "address", "role", "position"]


class AssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    usage = BindingBriefSerializer(source="bindings", many=True, read_only=True)
    # Counted from the rows already prefetched for `usage`, so listing the
    # whole library is two queries however many assets there are.
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = [
            "id", "url", "checksum", "original_name", "content_type",
            "width", "height", "bytes", "alt_en", "alt_ar",
            "category", "status", "usage", "usage_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "checksum", "content_type", "width", "height", "bytes",
            "created_at", "updated_at",
        ]

    def get_url(self, asset: MediaAsset) -> str:
        return asset.file.url if asset.file else ""

    def get_usage_count(self, asset: MediaAsset) -> int:
        return len(asset.bindings.all())


class AssetUpdateSerializer(serializers.ModelSerializer):
    """Only the metadata a person writes. The bytes are immutable: replacing an
    image means binding a different asset, which is what keeps every URL
    content-addressed and every cache honest."""

    class Meta:
        model = MediaAsset
        fields = ["alt_en", "alt_ar", "category", "status"]


class BindingWriteSerializer(serializers.Serializer):
    asset = serializers.PrimaryKeyRelatedField(
        queryset=MediaAsset.objects.all(), allow_null=True
    )
    caption_en = serializers.CharField(required=False, allow_blank=True, default="")
    caption_ar = serializers.CharField(required=False, allow_blank=True, default="")


class GalleryWriteSerializer(serializers.Serializer):
    """The finished order, sent whole."""

    items = BindingWriteSerializer(many=True)

    def validate_items(self, items):
        if any(item["asset"] is None for item in items):
            raise serializers.ValidationError("A gallery entry needs an asset.")
        seen = [item["asset"].pk for item in items]
        if len(seen) != len(set(seen)):
            raise serializers.ValidationError(
                "The same image appears twice in this gallery."
            )
        return items
