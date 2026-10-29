import type { DirectionStep } from "../routing/directions";
import { getBearing, getSquaredDist } from "./maths";

const ARROW_HEAD_OFFSET_M = 30;
const MAX_ARROWS_TO_SHOW = 2;

const { activeSettings } = useSettings();

export function drawTurnArrows(
    map: maplibregl.Map | null,
    steps: DirectionStep[],
    displayPath: [number, number][],
) {
    if (!map) return;
    if (!activeSettings.value.drawTurnNavigation) {
        clearTurnArrows(map);
        return;
    }

    const linesFeatures = [];
    const headsFeatures = [];

    let arrowsDrawn = 0;

    for (const step of steps) {
        if (["depart", "destination", "straight", "ferry"].includes(step.type))
            continue;

        if (arrowsDrawn >= MAX_ARROWS_TO_SHOW) break;

        let startIdx = -1;
        let minStartDist = Infinity;
        for (let i = 0; i < displayPath.length; i++) {
            const distSq = getSquaredDist(displayPath[i]!, step.coords);
            if (distSq < minStartDist) {
                minStartDist = distSq;
                startIdx = i;
            }
        }

        let endIdx = startIdx;
        if (step.exitCoords && startIdx !== -1) {
            let minEndDist = Infinity;
            const searchLimit = Math.min(displayPath.length, startIdx + 1000);
            for (let i = startIdx; i < searchLimit; i++) {
                const distSq = getSquaredDist(displayPath[i]!, step.exitCoords);
                if (distSq < minEndDist) {
                    minEndDist = distSq;
                    endIdx = i;
                }
            }
        }

        if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
            const arrowCoords: [number, number][] = [];

            for (let i = startIdx; i <= endIdx; i++) {
                arrowCoords.push(displayPath[i]!);
            }

            let hIdx = endIdx;
            let dFwd = 0;
            let finalHeadPoint: [number, number] = displayPath[hIdx]!;

            while (
                hIdx < displayPath.length - 1 &&
                dFwd < ARROW_HEAD_OFFSET_M
            ) {
                const segDist =
                    Math.sqrt(
                        getSquaredDist(
                            displayPath[hIdx]!,
                            displayPath[hIdx + 1]!,
                        ),
                    ) * 111000;
                if (dFwd + segDist > ARROW_HEAD_OFFSET_M) {
                    const ratio = (ARROW_HEAD_OFFSET_M - dFwd) / segDist;
                    const p1 = displayPath[hIdx]!;
                    const p2 = displayPath[hIdx + 1]!;
                    finalHeadPoint = [
                        p1[0] + (p2[0] - p1[0]) * ratio,
                        p1[1] + (p2[1] - p1[1]) * ratio,
                    ];
                    dFwd = ARROW_HEAD_OFFSET_M;
                } else {
                    dFwd += segDist;
                    hIdx++;
                    finalHeadPoint = displayPath[hIdx]!;
                }
            }

            if (dFwd > 0) {
                arrowCoords.push(finalHeadPoint);
            }

            if (arrowCoords.length >= 2) {
                linesFeatures.push({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: arrowCoords,
                    },
                    properties: {},
                });

                const pLast = arrowCoords[arrowCoords.length - 1]!;
                const pPrev = arrowCoords[arrowCoords.length - 2]!;
                const bearing = getBearing(pPrev, pLast);

                headsFeatures.push({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: pLast },
                    properties: { bearing },
                });

                arrowsDrawn++;
            }
        }
    }

    const lineSource = map.getSource(
        "turn-arrows-line-source",
    ) as maplibregl.GeoJSONSource;
    const headSource = map.getSource(
        "turn-arrows-head-source",
    ) as maplibregl.GeoJSONSource;

    if (lineSource)
        lineSource.setData({
            type: "FeatureCollection",
            features: linesFeatures as any,
        });
    if (headSource)
        headSource.setData({
            type: "FeatureCollection",
            features: headsFeatures as any,
        });
}

export function clearTurnArrows(map: maplibregl.Map | null) {
    if (!map) return;

    const lineSource = map.getSource(
        "turn-arrows-line-source",
    ) as maplibregl.GeoJSONSource;
    const headSource = map.getSource(
        "turn-arrows-head-source",
    ) as maplibregl.GeoJSONSource;

    const emptyData: any = {
        type: "FeatureCollection",
        features: [],
    };

    if (lineSource) lineSource.setData(emptyData);
    if (headSource) headSource.setData(emptyData);
}
