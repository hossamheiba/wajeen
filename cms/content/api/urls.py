from django.urls import path

from . import views

app_name = "content"

urlpatterns = [
    # Public: published messages for one locale.
    path("content/<str:locale>/", views.PublicMessagesView.as_view(), name="public-messages"),
    # Admin: authenticated, CSRF-protected.
    path("admin/auth/csrf/", views.CSRFView.as_view(), name="csrf"),
    path("admin/auth/login/", views.LoginView.as_view(), name="login"),
    path("admin/auth/refresh/", views.RefreshView.as_view(), name="refresh"),
    path("admin/auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("admin/content/", views.BlockListView.as_view(), name="block-list"),
    path(
        "admin/content/<str:namespace>/<str:locale>/",
        views.BlockDetailView.as_view(),
        name="block-detail",
    ),
    path("admin/preview/<str:locale>/", views.DraftMessagesView.as_view(), name="draft-messages"),
    path("admin/publish/", views.PublishView.as_view(), name="publish"),
    path("admin/versions/", views.VersionListView.as_view(), name="version-list"),
    path(
        "admin/versions/<int:number>/",
        views.VersionDetailView.as_view(),
        name="version-detail",
    ),
    path("admin/versions/<int:number>/rollback/", views.RollbackView.as_view(), name="rollback"),
]
