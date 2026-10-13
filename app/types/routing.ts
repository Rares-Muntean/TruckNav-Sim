export interface RoadEdge {
    to: number; // ID of the next Node this road leads to
    weight: number; // Distance
    hIn: number; // Angle you enter this road at (radians)
    hOut: number; // Angle you exit this road at (radians)
    isFerry: boolean; // If it's a boat lane / train
    requiredDlc?: number; // DLC required to drive here
    vPrefabId?: number; // Game prefab ID
    startIndex: number; // Where the curve points start in geometryF32
    pointCount: number; // How many visual points are there on this road
    maneuverType: number; // Turn type
    exitNumber: number; // Roundabout exit number
}

export interface TripSegment {
    startNodeId: number;
    startHeading: number;
    startType: "road" | "yard";
    nodeSequence: number[];
    displayCoordinates: [number, number][];
    endNodeId: number;
    arrivalHeadingRad?: number; // Radians (checks U-Turns)
    arrivalCompassDegrees: number; // 0 - 360 degrees (for the start heading of the NEXT leg)
}

export interface CalcMultiRoutePayload {
    startId: number;
    waypointsCoords: [number, number][];
    waypointsNodeGroups: number[][];
    heading: number;
    startType: "road" | "yard";
    ownedDlcs: number[];
    selectedGame: "ets2" | "ats";
    sdkScale: number;
    avgSpeed: number;
}

export interface NodeIndexItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: number;
    coord: [number, number];
}
