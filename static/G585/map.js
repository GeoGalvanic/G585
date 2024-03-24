var map;

document.addEventListener('DOMContentLoaded', init);

var heatLayer, foodHeatData, eduHeatData;

function radioSelect(selected) {
    (selected.value == "food") ? heatLayer.setData(foodHeatData) : heatLayer.setData(eduHeatData)
}

function init() {
    /**
     * This function sends an api request to calculate "Drive Time" polygons for an input point. The nearest nodes is
     * calculating using Turf.js. This function is also responsible for adding a marker representing the node to the
     * map.
     * @param {Point} latlng The latlng object returned from a map click event
     * @returns {Array} An array containing the calculated drive-time polygons
     */
    async function getDriveTimePolygons (latlng) {
        var poly_12000, poly_8000, poly_4000;
        startNode = turf.nearestPoint(turf.point([latlng.lng,latlng.lat]), busNodes)

        await gp_results.closePopup();
        await gp_results.setLatLng([startNode.geometry.coordinates[1], startNode.geometry.coordinates[0]]);

        await fetch(`getDriveTime?nodeID=${startNode.properties.id}`)
        .then( response => response.json() )
        .then( data => {
            polys_collection = JSON.parse(data.polys)
            polys_collection.features.forEach( (poly_feat) => {
                switch (poly_feat.properties.distance) {
                    case 12000:
                        poly_12000 = poly_feat;
                        break;
                    case 8000:
                        poly_8000 = poly_feat;
                        break;
                    case 4000:
                        poly_4000 = poly_feat;
                        break;
                    default:
                        console.warn("Returned drive time polygon that did not match a known distance.")
                        break;
                }
            })
            return true
        })
        return [poly_12000, poly_8000, poly_4000]
    }

    /**
     * This function uses Turf.js to count all of the amenities within the input polygons. Also opens a popup with the
     * results.
     * @param {Polygon} long The polygon calculated using the furthest distance 
     * @param {Polygon} mid The polygon calculated using a mid-range distance
     * @param {Polygon} short The polygon calculated using the shortest distance
     */
    function countAmenities(long, mid, short) {
        var short_food, short_edu, mid_food, mid_edu, long_food, long_edu;
        short_food = short_edu = mid_food = mid_edu = long_food = long_edu = 0;

        osmEdu.features.forEach((feat) => {
            if (turf.booleanWithin(turf.point(feat.geometry.coordinates[0]), short)) {
                long_edu++
                mid_edu++
                short_edu++
            } else if (turf.booleanWithin(turf.point(feat.geometry.coordinates[0]), mid)) {
                mid_edu++
                long_edu++
            } else if (turf.booleanWithin(turf.point(feat.geometry.coordinates[0]), long)) {
                long_edu++
            }
        })

        osmFood.features.forEach((feat) => {
            if (turf.booleanWithin(turf.point(feat.geometry.coordinates[0]), short)) {
                long_food++
                mid_food++
                short_food++
            } else if (turf.booleanWithin(turf.point(feat.geometry.coordinates[0]), mid)) {
                mid_food++
                long_food++
            } else if (turf.booleanWithin(turf.point(feat.geometry.coordinates[0]), long)) {
                long_food++
            }
        })

        //formating popup
        gp_results.bindPopup(
            `<i>Number of amenities within <b>X</b> Minutes using bus transportation.</i><br />
            <table style="border: thin solid black; border-collapse: collapse;">
            <tr> <th style="border: thin solid black; padding: 5px">X</th>
            <th style="border: thin solid black; padding: 5px">Food</th>
            <th style="border: thin solid black; padding: 5px">Educational</th> </tr>
            <tr> <td style="border: thin solid black; padding: 5px">5</td>
            <td style="border: thin solid black; padding: 5px">${short_food}</td>
            <td style="border: thin solid black; padding: 5px">${short_edu}</td></tr>
            <tr> <td style="border: thin solid black; padding: 5px">10</td>
            <td style="border: thin solid black; padding: 5px">${mid_food}</td>
            <td style="border: thin solid black; padding: 5px">${mid_edu}</td> </tr>
            <tr> <td style="border: thin solid black; padding: 5px">15</td>
            <td style="border: thin solid black; padding: 5px">${long_food}</td>
            <td style="border: thin solid black; padding: 5px">${long_edu}</td> </tr>
            </table>`)

        gp_results.openPopup();

    }
    
    // create map and set center and zoom level
    map = new L.map('mapid');
    map.setView([34.04,-118.24],10);

    //Create layer for displaying geoprocessing results
    var gp_results = new L.marker([0,0]);
    map.addLayer(gp_results)

    // create tile layers and add one to map
    var tiles = L.tileLayer('https://sarrett.dev/static/G585/Tiles/LA_Transportation_Basemap/{z}/{x}/{y}.png');
    var osm_tiles = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}',
        {
            foo: 'bar',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    )
    tiles.addTo(map);

    // define styles for vector layers
    function getIcon(layerName, isSelected) {
        const currentZoom = map.getZoom();
        const newSize = (currentZoom < 11) ? 3 : (currentZoom - 10) * 5
        const icon = L.icon({
            iconUrl: `https://sarrett.dev/static/G585/${layerName}${ isSelected ? "-selected" : "" }.svg`,
            iconSize: [newSize, newSize]
        })
        return icon
    }

    // create vector layers
    var foodLayer = new L.geoJSON(osmFood,{
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`<b>${feature.properties.name}</b><br />${feature.properties.type}`)
            onFeatureSelect(feature, layer, "food")
        },
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: getIcon("food", false)});
        },
    });

    var eduLayer = new L.geoJSON(osmEdu,{
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`<b>${feature.properties.name}</b><br />${feature.properties.type}`)
            onFeatureSelect(feature, layer, "edu")
        },
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: getIcon("edu", false)});
        },
    });

    // style reset function for event handlers
    function resetStyles(){
        if (selectedLayer == "food") selection.setIcon(getIcon("food", false));
        else if (selectedLayer == "edu") selection.setIcon(getIcon("edu", false));
    }

    /*
    // feature labeling function
    function setSelectedLabel(currentFeature){
        var featureName = currentFeature.properties.name || "Unnamed feature";
        var featureType = currentFeature.properties.type || "Unknown type";
        document.getElementById('feature-label').innerHTML = `<b>${featureName}:</b> ${featureType}`;
    }
    */		

    // feature select event handler
    var selection, selectionLayer;
    function onFeatureSelect(feature, layer, layerName){
        layer.on({
            click: function(e) {
            if (selection) {            
                resetStyles();
            }
            
            const layerObj = e.target._layers;
            const marker = Object.values(layerObj)[0];
            if (layerName == "food") marker.setIcon(getIcon("food", true));
            else if (layerName == "edu") marker.setIcon(getIcon("edu", true));
            selection = marker;
            selectedLayer = layerName;

            // Insert some HTML with the feature name
            //setSelectedLabel(feature);

            L.DomEvent.stopPropagation(e); // stop click event from being propagated further
            }
        });
    }

    // map select event handler
    map.addEventListener('click', function(e) {
        //remove current selection (and styling)
        if (selection) {
            resetStyles();
            selection = null;
            document.getElementById('feature-label').innerHTML = 'Click a commodity to see details.';
        }

        //Start calculating the amenities within travel distance.
        getDriveTimePolygons(e.latlng)
        .then( result => {countAmenities(...result)} )
    });

    // map zoom event handler
    map.addEventListener('zoomend', function(e) {
        function resetMarker(layer,layerName) {
            const layerObj = layer._layers;
            const marker = Object.values(layerObj)[0];
            marker.setIcon(getIcon(layerName, false));
        }
        eduLayer.eachLayer( (layer) => resetMarker(layer,"edu"));
        foodLayer.eachLayer( (layer) => resetMarker(layer,"food"));
        if (selection) selection.setIcon(getIcon(selectedLayer, true));
    })

    // Heatmap layer configuration
    var cfg = {
        // radius should be small ONLY if scaleRadius is true (or small radius is intended)
        // if scaleRadius is false it will be the constant radius used in pixels
        "radius": 0.006,
        "maxOpacity": .6,
        // scales the radius based on map zoom
        "scaleRadius": true,
        // if set to false the heatmap uses the global maximum for colorization
        // if activated: uses the data maximum within the current map boundaries
        //   (there will always be a red spot with useLocalExtremas true)
        "useLocalExtrema": true,
        // which field name in your data represents the latitude - default "lat"
        latField: 'y',
        // which field name in your data represents the longitude - default "lng"
        lngField: 'x',
        // which field name in your data represents the data value - default "value"
        valueField: 'value'
      };
    
    // Add heatmap data for food amenities
    foodHeatData = { max: 100, data: [] };
    
    osmFood.features.forEach( element => {
        foodHeatData.data.push({x: element.geometry.coordinates[0][0], y: element.geometry.coordinates[0][1], value: 1})
    });

    // Add heatmap data for education amenities
    eduHeatData = { max: 100, data: [] };

    osmEdu.features.forEach( element => {
        eduHeatData.data.push({x: element.geometry.coordinates[0][0], y: element.geometry.coordinates[0][1], value: 1})
    });
    
    // Add heatmap layer to map
    heatLayer = new HeatmapOverlay(cfg)

    map.addLayer(heatLayer)
    heatLayer.setData(foodHeatData)

    // Add control for swapping data displayed by heatmap layer
    L.Control.heatmap = L.Control.extend({
        onAdd: map => {
            this._div = document.getElementById("toggle-container")
            L.DomEvent.disableClickPropagation(this._div);
            return this._div
        }
    })

    L.control.heatmap = function(opts) { return new L.Control.heatmap(opts);}
	L.control.heatmap({ position: 'bottomleft' }).addTo(map);


    // layer controler
    L.control.layers(
        {
            "Transportation Network": tiles,
            "OSM": osm_tiles
        }, {
            "Commodity Heatmap": heatLayer,
            "Food Commodities": foodLayer, 
            "Educational Commodities": eduLayer
        }
    ).addTo(map);
}