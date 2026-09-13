"""Django admin, read-mostly.

The dashboard at /studio/inbox is where this work is meant to happen; this is
the fallback for an operator with a shell. Adding and deleting are both off:
an inquiry comes from the public form, and nothing should be able to erase a
record of who contacted the company.

There is no link to a CV here either -- the only route to one is the
authenticated download view, which checks `view_cv` and writes an access log.
"""

from __future__ import annotations

from django.contrib import admin

from .models import CvAccessLog, Inquiry, PrivateFile


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "status", "name", "email", "notified", "created_at")
    list_filter = ("kind", "status", "notified")
    search_fields = ("name", "email", "company_name")
    readonly_fields = [field.name for field in Inquiry._meta.fields if field.name != "status"]
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PrivateFile)
class PrivateFileAdmin(admin.ModelAdmin):
    list_display = ("id", "original_name", "content_type", "bytes", "expires_at", "purged_at")
    readonly_fields = [field.name for field in PrivateFile._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(CvAccessLog)
class CvAccessLogAdmin(admin.ModelAdmin):
    list_display = ("id", "inquiry", "user", "at")
    readonly_fields = [field.name for field in CvAccessLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
