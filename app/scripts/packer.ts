/**
 * scripts/packer.ts
 *
 * Usage:
 *   npx ts-node app/scripts/packer.ts ./public/geojson/brain.geojson ./public/geojson/prefabs.geojson ./public/roadnetwork
 *
 *
 *   * Builds binery files from a geojsons.
 */

import * as fs from "fs";
import path from "path";

const OUT_NODES = "nodes.bin";
const OUT_GRAPH = "graph.bin";
const OUT_GEOM = "geometry.bin";

interface Feature {
    properties: any;
    geometry: {
        coordinates: [number, number][];
    };
}

function haversineDistance(p1: [number, number], p2: [number, number]): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
    const dLon = ((p2[0] - p1[0]) * Math.PI) / 180;
    const lat1 = (p1[1] * Math.PI) / 180;
    const lat2 = (p2[1] * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
            Math.sin(dLon / 2) *
            Math.cos(lat1) *
            Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculatePolylineDistance(coords: [number, number][]): number {
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        total += haversineDistance(coords[i]!, coords[i + 1]!);
    }
    return total;
}

function calculateHeading(p0: [number, number], p1: [number, number]) {
    // p[0] is Lon, p[1] is Lat
    const latRad = p0[1] * (Math.PI / 180);
    // Multiply longitude diff by cos(lat) to fix aspect ratio distortion
    const xDiff = (p1[0] - p0[0]) * Math.cos(latRad);
    return Math.atan2(p1[1] - p0[1], xDiff);
}

async function packData(
    brainInputPath: string,
    prefabsInputPath: string,
    outputPath: string,
) {
    console.log("Loading geojson files");
    const logicData = JSON.parse(fs.readFileSync(brainInputPath, "utf-8"));
    const prefabData = JSON.parse(fs.readFileSync(prefabsInputPath, "utf-8"));

    const uniqueUids = new Set<string>();

    for (const feature of logicData.features as Feature[]) {
        uniqueUids.add(feature.properties.u);
        uniqueUids.add(feature.properties.v);
    }

    const nodeList = Array.from(uniqueUids).sort();
    const uidToInt = new Map<string, number>();

    const nodesBuffer = Buffer.alloc(nodeList.length * 16);
    for (let i = 0; i < nodeList.length; i++) {
        uidToInt.set(nodeList[i]!, i);
        nodesBuffer.write(nodeList[i]!.padEnd(16, "\0"), i * 16, 16, "ascii");
    }
    const nodesOutPath = path.join(outputPath, OUT_NODES);
    fs.writeFileSync(nodesOutPath, nodesBuffer);

    console.log("Visual prefab curves indexing");
    const prefabVisuals = new Map<string, [number, number][]>();
    for (const feature of prefabData.features as Feature[]) {
        const u = feature.properties.u;
        const v = feature.properties.v;
        prefabVisuals.set(`${u}_${v}`, feature.geometry.coordinates);
    }

    console.log("Building binary buffers");
    const graphData: number[] = [];
    const geometryData: number[] = [];

    let geomPointer = 0;
    let edgeCount = 0;

    const prefabUidToInt = new Map<string, number>();
    let nextPrefabId = 1;

    for (const feature of logicData.features as Feature[]) {
        const props = feature.properties;
        const uStr = props.u;
        const vStr = props.v;

        if (!uidToInt.has(uStr) || !uidToInt.has(vStr)) continue;

        const uInt = uidToInt.get(uStr)!;
        const vInt = uidToInt.get(vStr)!;

        const vPrefabUid = props.v_prefab || "";
        let vPrefabId = 0;

        if (vPrefabUid !== "") {
            if (!prefabUidToInt.has(vPrefabUid)) {
                prefabUidToInt.set(vPrefabUid, nextPrefabId++);
            }
            vPrefabId = prefabUidToInt.get(vPrefabUid)!;
        }

        const visualKey = `${uStr}_${vStr}`;
        const visualKeyRev = `${vStr}_${uStr}`;

        let coords: [number, number][];
        let fromPrefab = false;

        if (prefabVisuals.has(visualKey)) {
            coords = prefabVisuals.get(visualKey)!;
            fromPrefab = true;
        } else if (prefabVisuals.has(visualKeyRev)) {
            coords = [...prefabVisuals.get(visualKeyRev)!].reverse();
            fromPrefab = true;
        } else {
            coords = feature.geometry.coordinates;
            fromPrefab = false;
        }

        const pointCount = coords.length;
        const startIndex = geomPointer;

        for (let i = 0; i < pointCount; i++) {
            geometryData.push(coords[i]![0]!);
            geometryData.push(coords[i]![1]!);
            geomPointer += 2;
        }

        const hOut = props.hOut || 0.0;
        const hIn = props.hIn || 0.0;

        const isFerryRaw = props.isFerry;
        const isFerry =
            isFerryRaw === true || isFerryRaw === "true" || isFerryRaw === 1
                ? 1.0
                : 0.0;

        let weight = props.distance || 1.0;
        if (isFerry === 1.0) {
            const calculatedDist = calculatePolylineDistance(coords);
            if (calculatedDist > 0) {
                weight = calculatedDist;
            }
        }

        const requiredDlc = props.required_dlc || 0;
        const maneuverType = props.maneuver_type || 0;
        const exitNumber = props.exit_number || 0;

        graphData.push(
            uInt, // 0: Start node
            vInt, // 1: End node
            weight, // 2: Cost (meters) / distance
            hIn, // 3: Arrival heading
            hOut, // 4: Departure heading
            isFerry, // 5: Ferry flag
            requiredDlc, // 6: Required DLC Integer
            vPrefabId, // 7: Prefab integer ID
            startIndex, // 8: Pointer to geometry array
            pointCount, // 9: Number of [lng, lat] pairs
            maneuverType, // 10: Maneuver id
            exitNumber, // 11: Roundabout exit number (0 if not roundabout)
        );

        edgeCount++;
    }

    const graphBuffer = new Float32Array(graphData);
    const geometryBuffer = new Float32Array(geometryData);

    const graphOutPath = path.join(outputPath, OUT_GRAPH);
    const geometryOutPath = path.join(outputPath, OUT_GEOM);
    fs.writeFileSync(graphOutPath, Buffer.from(graphBuffer.buffer));
    fs.writeFileSync(geometryOutPath, Buffer.from(geometryBuffer.buffer));

    const totalSizeMB =
        (nodesBuffer.byteLength +
            graphBuffer.byteLength +
            geometryBuffer.byteLength) /
        (1024 * 1024);
    console.log(`\nBinary Size: ${totalSizeMB.toFixed(2)} MB`);
}

async function main() {
    const cliArgs = process.argv.slice(2);
    if (cliArgs.length < 2) {
        console.error(
            "Usage: npx ts-node app/scripts/buildGraph.ts <brain.geojson> <prefabs.geojson> <outDir>",
        );
        process.exit(1);
    }

    const [brainInputPath, prefabsInputPath, outDir] = cliArgs;
    await packData(brainInputPath!, prefabsInputPath!, outDir!);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
