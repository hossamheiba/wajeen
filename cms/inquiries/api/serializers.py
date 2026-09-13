"""Validation on the Django side.

The Next.js route validates with zod before anything reaches here. This layer
validates again anyway: "it came from our own server" is not a reason to trust
a payload, and Django is the final judge of what may be stored -- which is the
whole point of making the dashboard the reliable record.

The conditional rules live in `validate`, where the whole submission is
visible, and the database repeats the important ones as CHECK constraints. Two
layers on purpose: the serializer gives a person a readable message, the
constraint makes the rule impossible to bypass.
"""

from __future__ import annotations

from rest_framework import serializers

from .. import vocab
from ..models import Inquiry, PrivateFile


class CvSerializer(serializers.ModelSerializer):
    """Metadata only. There is no `url` field, and there must never be one."""

    available = serializers.BooleanField(source="is_available", read_only=True)

    class Meta:
        model = PrivateFile
        fields = [
            "id", "original_name", "content_type", "bytes",
            "created_at", "expires_at", "purged_at", "available",
        ]


class InquirySerializer(serializers.ModelSerializer):
    """What the dashboard reads."""

    cv = CvSerializer(read_only=True)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    handled_by = serializers.CharField(
        source="handled_by.username", read_only=True, default=None
    )

    class Meta:
        model = Inquiry
        fields = [
            "id", "kind", "kind_label", "status", "locale",
            "name", "email", "phone", "message",
            "send_to",
            "company_name", "city", "service_type",
            "is_aramco_vendor", "aramco_vendor_id",
            "cv",
            "notified", "notify_attempts", "notify_error",
            "created_at", "read_at", "replied_at", "handled_by",
        ]


class StatusSerializer(serializers.Serializer):
    """The only thing the dashboard may change."""

    status = serializers.ChoiceField(choices=Inquiry.Status.choices)


class SubmissionSerializer(serializers.Serializer):
    """What the public form may send.

    Written as a plain Serializer rather than a ModelSerializer so the
    conditional shape can be stated once and read in one place.
    """

    idempotency_key = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=Inquiry.Kind.choices)
    locale = serializers.ChoiceField(choices=[("en", "en"), ("ar", "ar")], default="en")

    # Shared by all three kinds. Phone is required everywhere, by decision.
    name = serializers.CharField(max_length=200, trim_whitespace=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40, trim_whitespace=True)

    # Contact and vendor.
    message = serializers.CharField(
        required=False, allow_blank=True, default="", trim_whitespace=True
    )

    # Contact.
    send_to = serializers.ChoiceField(
        choices=vocab.choices(vocab.SEND_TO), required=False, allow_blank=True, default=""
    )

    # Vendor.
    company_name = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default="", trim_whitespace=True
    )
    city = serializers.ChoiceField(
        choices=vocab.choices(vocab.CITY), required=False, allow_blank=True, default=""
    )
    service_type = serializers.ChoiceField(
        choices=vocab.choices(vocab.SERVICE_TYPE),
        required=False, allow_blank=True, default="",
    )
    is_aramco_vendor = serializers.BooleanField(required=False, default=False)
    aramco_vendor_id = serializers.CharField(
        max_length=40, required=False, allow_blank=True, allow_null=True,
        default=None, trim_whitespace=True,
    )

    # Career. The file itself arrives as multipart, not through this field.
    cv = serializers.FileField(required=False, allow_null=True, write_only=True)

    MESSAGE_MIN = 10

    def validate(self, attrs):
        kind = attrs["kind"]
        errors: dict[str, list[str]] = {}

        def need(field: str, label: str):
            if not attrs.get(field):
                errors[field] = [f"{label} is required."]

        if kind == Inquiry.Kind.CONTACT:
            need("send_to", "A recipient")
            if len(attrs.get("message", "")) < self.MESSAGE_MIN:
                errors["message"] = [
                    f"A message of at least {self.MESSAGE_MIN} characters is required."
                ]
            attrs = self._clear(attrs, "company_name", "city", "service_type")
            attrs["is_aramco_vendor"] = False
            attrs["aramco_vendor_id"] = None
            attrs["cv"] = None

        elif kind == Inquiry.Kind.VENDOR:
            need("company_name", "A company name")
            need("city", "A city")
            need("service_type", "A service type")
            if len(attrs.get("message", "")) < self.MESSAGE_MIN:
                errors["message"] = [
                    f"A message of at least {self.MESSAGE_MIN} characters is required."
                ]
            # The Aramco rule: an id exists if and only if the box is ticked,
            # and a value sent with the box off is dropped rather than stored.
            if attrs.get("is_aramco_vendor"):
                if not attrs.get("aramco_vendor_id"):
                    errors["aramco_vendor_id"] = [
                        "An Aramco vendor number is required when the box is ticked."
                    ]
            else:
                attrs["aramco_vendor_id"] = None
            attrs = self._clear(attrs, "send_to")
            attrs["cv"] = None

        elif kind == Inquiry.Kind.CAREER:
            if not attrs.get("cv"):
                errors["cv"] = ["A CV is required."]
            # Four fields and nothing else: anything else that arrived is
            # dropped here, and the database refuses it as well.
            attrs = self._clear(
                attrs, "message", "send_to", "company_name", "city", "service_type"
            )
            attrs["is_aramco_vendor"] = False
            attrs["aramco_vendor_id"] = None

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    @staticmethod
    def _clear(attrs: dict, *fields: str) -> dict:
        for field in fields:
            attrs[field] = ""
        return attrs
