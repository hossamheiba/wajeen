from django.contrib import admin

from .models import ContentBlock, ContentVersion


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    list_display = ("namespace", "locale", "version", "has_draft", "updated_at")
    list_filter = ("locale",)
    search_fields = ("namespace",)
    readonly_fields = ("version", "created_at", "updated_at")

    @admin.display(boolean=True, description="draft")
    def has_draft(self, obj):
        return obj.has_draft


@admin.register(ContentVersion)
class ContentVersionAdmin(admin.ModelAdmin):
    list_display = ("number", "source", "is_current", "label", "created_at")
    list_filter = ("source", "is_current")
    # History is immutable: the admin gets a read-only window onto it.
    readonly_fields = tuple(f.name for f in ContentVersion._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
