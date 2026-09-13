from django.urls import path

from . import views

app_name = "inquiries"

urlpatterns = [
    # Server-to-server: the website's route handler posts here. Not for browsers.
    path("inquiries/", views.SubmitView.as_view(), name="submit"),
    path(
        "inquiries/pending-notification/",
        views.PendingNotificationView.as_view(),
        name="pending-notification",
    ),
    path(
        "inquiries/<int:pk>/notified/",
        views.NotifyResultView.as_view(),
        name="notified",
    ),
    # Dashboard: authenticated, CSRF-protected, staff only.
    path("admin/inquiries/", views.InquiryListView.as_view(), name="list"),
    path("admin/inquiries/<int:pk>/", views.InquiryDetailView.as_view(), name="detail"),
    path("admin/inquiries/<int:pk>/cv/", views.CvDownloadView.as_view(), name="cv"),
    path(
        "admin/inquiries/<int:pk>/notify/",
        views.NotifyRetryView.as_view(),
        name="notify",
    ),
]
