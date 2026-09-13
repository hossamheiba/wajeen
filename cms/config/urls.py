from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("content.api.urls")),
    path("api/v1/", include("media_library.api.urls")),
    path("api/v1/", include("inquiries.api.urls")),
]

# Development only. With DEBUG off these paths disappear and the files are
# expected to be served by the web server, an object store or a CDN -- which
# is also why nothing in the codebase builds a media URL by hand.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
