from django.urls import path

from . import views

app_name = "media_library"

urlpatterns = [
    # Public: what the website reads.
    path("media/manifest/", views.MediaManifestView.as_view(), name="manifest"),
    # Admin: authenticated, CSRF-protected, same cookie policy as content.
    path("admin/media/", views.AssetListView.as_view(), name="asset-list"),
    path("admin/media/<int:pk>/", views.AssetDetailView.as_view(), name="asset-detail"),
    path("admin/media/bindings/", views.BindingListView.as_view(), name="binding-list"),
    path("admin/media/slot/<str:role>/", views.SlotView.as_view(), name="slot"),
]
