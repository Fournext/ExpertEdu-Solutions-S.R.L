"""URL configuration for ExpertEdu corporate backend."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("corporate.urls")),
]
