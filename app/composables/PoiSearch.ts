import pois from '~/data/ets2/pois.json';

type PoiType = 'gas' | 'service' | 'parking';

interface Poi {
    type: PoiType;
    lng: number;
    lat: number;
}

const allPois = pois as Poi[];

function distanceSq(lng1: number, lat1: number, lng2: number, lat2: number) {
    const dlng = lng1 - lng2;
    const dlat = lat1 - lat2;
    return dlng * dlng + dlat * dlat;
}

export function usePoiSearch() {
    function findNearest(type: PoiType, truckCoords: [number, number]): [number, number] | null {
        const [truckLng, truckLat] = truckCoords;
        let nearest: Poi | null = null;
        let nearestDist = Infinity;

        for (const poi of allPois) {
            if (poi.type !== type) continue;
            const d = distanceSq(truckLng, truckLat, poi.lng, poi.lat);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = poi;
            }
        }

        return nearest ? [nearest.lng, nearest.lat] : null;
    }

    return { findNearest };
}