from django.contrib.gis.db import models

# Create your models here.

#Model class that is used as a translation from SQL query to geoJSON serializer
class DriveTimePolygon(models.Model):

    distance = models.IntegerField()
    polygon = models.PolygonField()

    def __str__(self):
        return f"Drive-time Polygon: {self.distance}"