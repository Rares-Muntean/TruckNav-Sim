import {
    convertGeoToAts,
    convertGeoToEts2,
} from "~/assets/utils/map/converters";
import { type SimpleCityNode } from "~/assets/utils/routing/algorithm";

// --- Types ---
interface GeoJsonProperties {
    name: string;
    poiName: string;
    poiType: string;
    countryToken?: string;
    scaleRank?: number;
    state?: string;
    [key: string]: any;
}

interface GeoJsonFeature {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: [number, number];
    };
    properties: GeoJsonProperties;
}

interface GeoJsonCollection {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
}

interface CityFallback {
    FirstName: string;
    SecondName: string;
}

interface RealCompanyModFallback {
    [companyId: string]: {
        name: string;
        sort_name: string;
        trailer_look: string;
    };
}

const cityData = shallowRef<GeoJsonCollection | null>(null);
const villageData = shallowRef<GeoJsonCollection | null>(null);
const companiesData = shallowRef<GeoJsonCollection | null>(null);
const citiesFallbackData = shallowRef<CityFallback[] | null>(null);
const realCompanyModData = shallowRef<RealCompanyModFallback | null>(null);

const isLoaded = ref(false);
const optimizedCityNodes = shallowRef<SimpleCityNode[]>([]);

export function useCityData() {
    const { settings } = useSettings();

    async function loadLocationData() {
        if (isLoaded.value) return;

        try {
            if (settings.value.selectedGame === "ets2") {
                const [
                    citiesRes,
                    villagesRes,
                    companiesRes,
                    citiesFallbackRes,
                ] = await Promise.all([
                    fetch("/data/ets2/map-data/cities.geojson"),
                    fetch("/data/ets2/map-data/villages.geojson"),
                    fetch("/data/ets2/map-data/companies.geojson"),
                    fetch("/data/ets2/map-data/citiesCheck.json"),
                ]);

                if (citiesRes.ok) cityData.value = await citiesRes.json();
                if (villagesRes.ok)
                    villageData.value = await villagesRes.json();
                if (companiesRes.ok)
                    companiesData.value = await companiesRes.json();
                if (citiesFallbackRes.ok)
                    citiesFallbackData.value = await citiesFallbackRes.json();
            } else if (settings.value.selectedGame == "ats") {
                const [citiesRes, companiesRes, realCompanyModRes] =
                    await Promise.all([
                        fetch("/data/ats/map-data/cities.geojson"),
                        fetch("/data/ats/map-data/companies.geojson"),
                        fetch(
                            "/data/ats/map-data/RealCompaniesModVanillaMapping.json",
                        ),
                    ]);

                if (citiesRes.ok) cityData.value = await citiesRes.json();
                if (companiesRes.ok)
                    companiesData.value = await companiesRes.json();
                if (realCompanyModRes.ok)
                    realCompanyModData.value = await realCompanyModRes.json();
            }

            const cNodes = processCollection(cityData.value);
            optimizedCityNodes.value = [...cNodes!];

            isLoaded.value = true;
        } catch (e) {
            console.error("Failed to load map data:", e);
        }
    }

    function findDestinationCoords(
        targetCityName: string,
        targetCompanyId: string,
    ): [number, number] | null {
        if (!isLoaded.value || !companiesData.value) return null;

        let cityCoords = getCityGeoCoordinates(targetCityName);
        if (!cityCoords) {
            console.log(
                `Primary name failed: ${targetCityName}. Searching for aliases...`,
            );

            const aliasEntry = citiesFallbackData.value?.find(
                (c) =>
                    c.FirstName.toLowerCase() ===
                        targetCityName.toLowerCase() ||
                    c.SecondName.toLowerCase() === targetCityName.toLowerCase(),
            );

            if (aliasEntry) {
                if (aliasEntry.SecondName && aliasEntry.SecondName !== "") {
                    console.log(
                        `Trying SecondName alias: ${aliasEntry.SecondName}`,
                    );
                    cityCoords = getCityGeoCoordinates(aliasEntry.SecondName);
                }

                if (!cityCoords && aliasEntry.FirstName) {
                    console.log(
                        `Trying FirstName alias: ${aliasEntry.FirstName}`,
                    );
                    cityCoords = getCityGeoCoordinates(aliasEntry.FirstName);
                }
            }
        }

        if (!cityCoords) {
            console.log(
                `City totally not found in geo-data: ${targetCityName}. Manually insert it in citiesCheck.json`,
            );
            return null;
        }

        const safeCompanyName = targetCompanyId.toLowerCase().trim();
        let vanillaId: string | undefined = undefined;

        if (realCompanyModData.value) {
            vanillaId = Object.keys(realCompanyModData.value).find((key) => {
                const entry = realCompanyModData.value![key];
                return (
                    entry?.sort_name &&
                    safeCompanyName.includes(
                        entry.sort_name.toLowerCase().trim(),
                    )
                );
            });
        }

        const companyCandidates = companiesData.value.features.filter((f) => {
            const p = f.properties;

            return (
                p.poiType === "company" &&
                p.sprite &&
                (p.sprite.toLowerCase().trim() === safeCompanyName ||
                    (vanillaId && p["sprite"].includes(vanillaId)))
            );
        });

        if (companyCandidates.length === 0) {
            console.warn(`Company not found in data ${targetCompanyId}`);

            return [cityCoords[0], cityCoords[1]];
        }

        let bestCandidate: GeoJsonFeature | null = null;
        let minDistance = Infinity;

        const [cityLng, cityLat] = cityCoords;

        for (const candidate of companyCandidates) {
            const [companyLng, companyLat] = candidate.geometry.coordinates;

            const differenceX = companyLng - cityLng;
            const differenceY = companyLat - cityLat;
            const distance =
                differenceX * differenceX + differenceY * differenceY;

            if (distance < minDistance) {
                minDistance = distance;
                bestCandidate = candidate;
            }
        }

        if (bestCandidate) {
            const [finalLng, finalLat] = bestCandidate.geometry.coordinates;

            return [finalLng, finalLat];
        }

        return null;
    }

    function getCityGeoCoordinates(name: string): [number, number] | null {
        const searchName = name.toLowerCase().trim();

        const findIn = (col: GeoJsonCollection | null) => {
            if (!col || !col.features) return null;
            return col.features.find(
                (f) =>
                    f.properties.name &&
                    f.properties.name.toLowerCase() === searchName,
            );
        };

        const city = findIn(cityData.value);
        if (city) return city.geometry.coordinates;

        return null;
    }

    const processCollection = (collection: GeoJsonCollection | null) => {
        const nodes: SimpleCityNode[] = [];
        if (!collection || !collection.features) return;

        for (const feature of collection.features) {
            const [lng, lat] = feature.geometry.coordinates;
            const [gameX, gameZ] =
                settings.value.selectedGame === "ets2"
                    ? convertGeoToEts2(lng, lat)
                    : convertGeoToAts(lng, lat);

            const rank = feature.properties.scaleRank || 10;
            const isCapital = feature.properties.capital === 1;

            let radius = 350;

            if (rank <= 2) radius = 1000;
            else if (rank <= 4) radius = 750;
            else if (rank <= 7) radius = 550;

            if (isCapital) radius += 200;

            nodes.push({
                x: gameX,
                z: gameZ,
                radius: radius,
            });
        }
        return nodes;
    };

    function getWorkerCityData() {
        return processCollection(cityData.value);
    }

    function getGameLocationName(targetX: number, targetY: number): string {
        if (!isLoaded.value) return "Loading data...";

        let bestName = "";
        let bestCountry = "";
        let minDistance = Infinity;

        const checkFeatures = (
            collection: GeoJsonCollection | null,
            type: "city" | "village",
        ) => {
            if (!collection || !collection.features) return;

            for (const feature of collection.features) {
                const [lng, lat] = feature.geometry.coordinates;

                const dx = lng - targetX;
                const dy = lat - targetY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDistance) {
                    minDistance = dist;
                    bestName = feature.properties.name;

                    if (type === "city") {
                        bestCountry = formatCountryToken(
                            feature.properties.countryToken,
                        );
                    } else {
                        bestCountry = feature.properties.state || "";
                    }
                }
            }
        };

        checkFeatures(cityData.value, "city");
        checkFeatures(villageData.value, "village");

        if (bestName) {
            const threshold = 0.3;

            const fullName = bestCountry
                ? `${bestName}, ${bestCountry}`
                : bestName;

            if (minDistance < threshold) {
                return fullName;
            } else {
                return `Near ${fullName}`;
            }
        }

        return "Open Road";
    }

    function formatCountryToken(token?: string): string {
        if (!token) return "";
        return token
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return {
        loadLocationData,
        getGameLocationName,
        getWorkerCityData,
        findDestinationCoords,
    };
}
