from rest_framework import serializers

from ..models import NAMESPACE_RE


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, style={"input_type": "password"})


class PatchSerializer(serializers.Serializer):
    """The canonical patch body.

    `namespace` and `locale` come from the URL and are deliberately *not*
    repeated here -- duplicating them was the ambiguity the approved plan
    removed. `path` is relative to the namespace root; omit it to patch the
    root itself.
    """

    path = serializers.CharField(required=False, allow_blank=True, default="")
    patch = serializers.DictField(required=True)
    version = serializers.IntegerField(required=False, min_value=0)

    def validate_path(self, value: str) -> str:
        value = (value or "").strip()
        if value.startswith(".") or value.endswith(".") or ".." in value:
            raise serializers.ValidationError("Malformed path.")
        return value

    def validate_patch(self, value):
        if not value:
            raise serializers.ValidationError("An empty patch would change nothing.")
        return value


class PublishSerializer(serializers.Serializer):
    label = serializers.CharField(required=False, allow_blank=True, default="")


class RollbackSerializer(serializers.Serializer):
    label = serializers.CharField(required=False, allow_blank=True, default="")


class BlockSerializer(serializers.Serializer):
    namespace = serializers.RegexField(NAMESPACE_RE)
    locale = serializers.CharField()
    version = serializers.IntegerField()
    has_draft = serializers.BooleanField()
    updated_at = serializers.DateTimeField()


class VersionSerializer(serializers.Serializer):
    number = serializers.IntegerField()
    label = serializers.CharField()
    source = serializers.CharField()
    is_current = serializers.BooleanField()
    rolled_back_from = serializers.IntegerField(source="rolled_back_from.number", allow_null=True)
    created_at = serializers.DateTimeField()
