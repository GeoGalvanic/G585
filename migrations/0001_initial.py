# Generated by Django 3.2.5 on 2021-12-11 07:39

import django.contrib.gis.db.models.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='DriveTimePolygon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('distance', models.IntegerField()),
                ('polygon', django.contrib.gis.db.models.fields.PolygonField(srid=4326)),
            ],
        ),
    ]
