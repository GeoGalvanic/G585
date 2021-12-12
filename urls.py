from django.urls import path
from . import views

app_name = 'G585'
urlpatterns = [
            path('', views.index, name='G585'),
            path('getDriveTime', views.getDriveTimePolygons, name='getDriveTime'),
            ]