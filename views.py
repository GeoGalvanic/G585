from django.shortcuts import render
from django.core.serializers import serialize
from django.http import JsonResponse
from .models import DriveTimePolygon
from django.db import connections

# Create your views here.
def index(request):
    return render(request, 'G585/index.html')

#Handle Drive-Time Polygon api requests
def getDriveTimePolygons(request):
    #Get the starting node from the GET request
    start_node = int(request.GET.get("nodeID"))
    
    #Connect to backend db, generate a temporary "distances" table that contains all nodes within range
    #Preset range of "12000" translates to 15mins assuming 800m/min (~30mph) travel speed
    with connections["G585"].cursor() as cursor:
        cursor.execute(
            """DROP TABLE IF EXISTS distances;
            CREATE TABLE distances AS (
                SELECT a.node AS id, a.agg_cost AS distance, b.the_geom
                FROM pgr_drivingDistance(
                    'SELECT id, source, target, cost FROM la_bus_lines_noded',
                    %s,
                    12000,
                    true
                ) a, la_bus_lines_noded_vertices_pgr b WHERE a.node = b.id
            );""",
            [start_node]
        )

        #Execute a second SQL query that creates a new "shape" table containing concave hull polygons for 3 preset
        #travel distances.
        cursor.execute(
            """DO $$
            DECLARE
            dist int;
            arr int[] := ARRAY[12000,8000,4000];
            BEGIN
            DROP TABLE IF EXISTS shape;
            CREATE TABLE shape(
                distance integer,
                polygon geometry(polygon,4326)
            );

            FOREACH dist IN ARRAY arr
            LOOP
                WITH polygon AS (
                    SELECT (ST_Dump((ST_CollectionExtract((ST_ConcaveHull((
                        SELECT ST_Collect(the_geom)
                        FROM distances
                        WHERE distance <= dist
                    ), 0.99) )) )) ).geom AS geom
                )
                INSERT INTO shape (distance,polygon)
                    SELECT dist, ST_SetSRID(polygon.geom,4326) FROM polygon;
                END LOOP;
            END$$;

            ALTER TABLE shape ADD COLUMN id SERIAL PRIMARY KEY;"""
        )

    #Use the Django raw manager to return the shape table as "DriveTimePolygon" model objects
    polys = DriveTimePolygon.objects.using("G585").raw(
        'SELECT id, distance, %s as polygon FROM shape;' % (connections["G585"].ops.select % 'polygon')
    )
    
    #Convert the model objects into a geojson feature collection
    geojson_polys = serialize('geojson', polys, geometry_field="polygon")

    #Send the geojson as a response to the GET request
    return JsonResponse({
        "polys": geojson_polys
    })

    