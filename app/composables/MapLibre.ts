import type { Map as MapLibreGl, StyleSpecification } from "maplibre-gl";
import { blendWithBg, lightenColor } from "~/assets/utils/shared/colors";
import { BlobSource } from "~/assets/utils/shared/BlobSource";

export async function initializeMap(
    container: HTMLElement,
): Promise<MapLibreGl> {
    const { settings, activeSettings } = useSettings();

    const baseUrl = window.location.origin;

    const maplibregl = (await import("maplibre-gl")).default;
    const { Protocol, PMTiles } = await import("pmtiles");

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    async function loadPmtiles(fileName: string, key: string) {
        const url = `${window.location.origin}/data/${settings.value.selectedGame}/map-data/tiles/${fileName}.mp3`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${fileName}`);

            const blob = await response.blob();
            const pmtilesInstance = new PMTiles(new BlobSource(blob, key));
            protocol.add(pmtilesInstance);

            console.log(
                `Successfully loaded ${fileName} into memory (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
            );
        } catch (error) {
            console.error("Error loading PMTiles blob:", error);
        }
    }

    await Promise.all([
        loadPmtiles("roads", "roads"),
        loadPmtiles("map-data-combined", "all-data"),
    ]);

    const style: StyleSpecification = {
        version: 8,

        name: "ETS2 PMTiles (local)",
        sources: {
            ets2: {
                type: "vector",

                url: `pmtiles://roads`,
            },
        },

        sprite: `${baseUrl}/sprites/sprites`,
        glyphs: `${baseUrl}/fonts/{fontstack}/{range}.pbf`,

        layers: [
            {
                id: "background",
                type: "background",
                paint: { "background-color": "#272d39" },
            },
            {
                id: "ets2-lines",
                type: "line",
                source: "ets2",
                filter: ["!=", ["get", "type"], "ferry"],
                "source-layer": "ets2",
                paint: {
                    "line-color": "#3d546e",
                    "line-width": 2,
                },
            },
        ],
    };

    const gameMap = {
        ets: {
            container,
            style,
            center: [10, 50],
            zoom: 6,
            minZoom: 5,
            maxZoom: 11.5,
            maxPitch: 45,
            fadeDuration: 0,
            attributionControl: false,
            collectResourceTiming: false,
            maxBounds: [
                [-28, 25], // [[west, south]
                [50, 74], // [east, north]]
            ],
        },

        ats: {
            container,
            style,
            center: [-115, 40],
            zoom: 6,
            minZoom: 5,
            maxZoom: 10.5,
            maxPitch: 45,
            fadeDuration: 0,
            attributionControl: false,
            collectResourceTiming: false,
            maxBounds: [
                [-130, 23], // SW
                [-60, 55], // NE
            ],
        },
    };

    const selectedMap =
        settings.value.selectedGame === "ets2" ? gameMap.ets : gameMap.ats;
    const map = new maplibregl.Map(selectedMap as maplibregl.MapOptions);

    map.on("error", (e) => {
        console.error(">>> MAP ERROR EVENT:", e);
        if (e.error) {
            console.error("   Message:", e.error.message);
            console.error("   Stack:", e.error.stack);
        }
        // @ts-ignore
        if (e.sourceId) console.error("  Failing Source:", e.sourceId);
        // @ts-ignore
        if (e.tile) console.error("  Failing Tile:", e.tile);
    });

    //// =================> LATER ATS UPDATE <=================

    map.on("load", async () => {
        map.addSource("ets2-all-data", {
            type: "vector",
            url: "pmtiles://all-data",
        });

        ////
        //// LAYERS FOR DISPLAYING
        //// FROM SOURCES
        ////
        // OUTLINE
        map.addLayer({
            id: "ets2-water-outline",
            type: "line",
            source: "ets2-all-data",
            "source-layer": "ets2water",
            paint: {
                "line-color": "#1e3a5f",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    7,
                    10,
                    4,
                ],
                "line-opacity": 0.6,
            },
        });

        // WATER
        map.addLayer({
            id: "ets2-water",
            type: "fill",
            source: "ets2-all-data",
            "source-layer": "ets2water",
            paint: {
                "fill-color": "#24467b",
                "fill-opacity": 0.6,
            },
        });

        // THICK ROADS
        map.addLayer({
            id: "ets2-roads",
            type: "line",
            source: "ets2",
            "source-layer": "ets2",
            filter: ["!=", ["get", "type"], "ferry"],
            layout: {
                "line-join": ["step", ["zoom"], "miter", 8, "round"],
                "line-cap": ["step", ["zoom"], "butt", 8, "round"],
            },
            paint: {
                "line-color": "#4a5f7a",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    0.5,
                    9,
                    1,
                    11.5,
                    13,
                ],
                "line-opacity": 1,
            },
        });

        // POLYGONS FOR PARKING ETC
        map.addLayer(
            {
                id: "maparea-zones",
                type: "fill",
                source: "ets2-all-data",
                "source-layer": "ets2mapareas",
                paint: {
                    "fill-color": [
                        "match",
                        ["get", "color"],
                        0,
                        "#3d546e",
                        1,
                        "#4a5f7a",
                        2,
                        "#556b7f",
                        3,
                        "#6b7f93",
                        4,
                        "#7d93a7",
                        "#3d546e",
                    ],
                    "fill-opacity": 0.5,
                },
            },
            "ets2-lines",
        );

        // PREFABS FOR SERVICE AREAS     ETC
        map.addLayer(
            {
                id: "prefab-zones",
                type: "fill",
                source: "ets2-all-data",
                "source-layer": "ets2prefabs",
                paint: {
                    "fill-color": [
                        "match",
                        ["get", "color"],
                        0,
                        blendWithBg(
                            lightenColor(activeSettings.value.themeColor, 0.3),
                            0.6,
                        ),
                        1,
                        blendWithBg(
                            lightenColor(activeSettings.value.themeColor, 0.3),
                            0.6,
                        ),
                        2,
                        blendWithBg(
                            lightenColor(activeSettings.value.themeColor, 0),
                            0.6,
                        ),
                        3,
                        blendWithBg(
                            lightenColor(activeSettings.value.themeColor, 0.3),
                            0.6,
                        ),
                        4,
                        blendWithBg(
                            lightenColor(activeSettings.value.themeColor, 0.3),
                            0.6,
                        ),
                        blendWithBg(
                            lightenColor(activeSettings.value.themeColor, 0.3),
                            0.6,
                        ),
                    ],
                },
                minzoom: 8.5,
            },
            "ets2-lines",
        );

        // DISPLAYING VILLAGE NAMES
        map.addLayer({
            id: "village-labels",
            type: "symbol",
            source: "ets2-all-data",
            "source-layer": "ets2villages",
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Quicksand regular"],
                "text-size": 13,
                "text-anchor": "center",
                "text-offset": [0, 0],
                "text-allow-overlap": false,
            },
            paint: {
                "text-color": "#ffffff",
            },
            minzoom: 8.2,
        });

        // DISPLAYING COUNTRY DELIMITATIONS
        map.addLayer(
            {
                id: "country-borders",
                type: "line",
                source: "ets2-all-data",
                "source-layer": "ets2countries",
                paint: {
                    "line-color": "#3d546e",
                    "line-width": 2,
                    "line-opacity": 0.4,
                },
            },
            "ets2-lines",
        );

        // ALL SPRITE SHEETS
        map.addLayer({
            id: "all-sprites",
            type: "symbol",
            source: "ets2-all-data",
            "source-layer": "ets2spritelocations",
            minzoom: 7,
            layout: {
                "icon-image": ["get", "sprite"],
                "icon-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    0.8,
                    10,
                    1.5,
                ],
                "icon-allow-overlap": false,
                "symbol-placement": "point",
            },
        });

        // DISPLAYING CITY NAMES
        map.addLayer({
            id: "city-labels",
            type: "symbol",
            source: "ets2-all-data",
            "source-layer": "ets2cities",
            filter: ["!=", ["get", "capital"], 2],
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Quicksand Regular"],
                "text-size": 15,
                "text-anchor": "bottom",
                "text-offset": [0, -0.3],
                "text-allow-overlap": false,
            },
            paint: {
                "text-color": "#ffffff",

                "text-halo-color": "#ffffff",
                "text-halo-width": 0.3,
            },
            minzoom: 6,
            maxzoom: 8,
        });

        // DISPLAYING CAPITAL NAMES
        map.addLayer({
            id: "capital-major-labels",
            type: "symbol",
            filter: ["==", ["get", "capital"], 2],
            source: "ets2-all-data",
            "source-layer": "ets2cities",
            layout: {
                "text-field": ["get", "name"],
                "text-size": 18,
                "text-font": ["Quicksand Regular"],
                "text-anchor": "bottom",
                "text-offset": [0, -0.3],
            },
            paint: {
                "text-color": "#ffffff",
                "text-halo-color": "#ffffff",
                "text-halo-width": 0.5,
            },
            minzoom: 6,
            maxzoom: 8,
        });

        // DISPLAYING COUNTRY NAMES
        map.addLayer({
            id: "country-labels",
            type: "symbol",
            source: "ets2-all-data",
            "source-layer": "ets2countrynames",
            layout: {
                "text-field": ["get", "name"],
                "text-size": 20,
                "text-font": ["Quicksand Regular"],
                "text-anchor": "bottom",
                "text-offset": [0, -0.3],
            },
            paint: {
                "text-color": "#ffffff",
                "text-halo-color": "#ffffff",
                "text-halo-width": 0.5,
                "text-opacity": 0.5,
            },
            minzoom: 5,
            maxzoom: 6,
        });
    });

    return map;
}
