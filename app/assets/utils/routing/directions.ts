export interface DirectionStep {
    id: number;
    type:
        | "depart"
        | "straight"
        | "left"
        | "right"
        | "slight-left"
        | "slight-right"
        | "sharp-left"
        | "sharp-right"
        | "ferry"
        | "roundabout"
        | "destination"
        | "exit-highway";

    voiceKey?: string;
    text: string;
    distance: number;
    coords: [number, number];
    exitCoords?: [number, number];
    debugAngle?: number;
    debugPrefabId?: number;
    exitCount?: number;
    cumulativeKm?: number;
    exitCumulativeKm?: number;
}

export function generateDirectionsList(
    nodeSequence: number[],
    nodeKms: Float32Array,
    sequenceManeuvers: Int8Array,
    sequenceExits: Int8Array,
    nodeCoords: Map<number, [number, number]>,
): DirectionStep[] {
    const steps: DirectionStep[] = [];
    if (nodeSequence.length < 2) return steps;

    steps.push({
        id: 0,
        type: "depart",
        text: "Head on Route",
        voiceKey: "start_route",
        distance: 0,
        coords: nodeCoords.get(nodeSequence[0]!) || [0, 0],
    });

    let lastStepKm = 0;
    let inRoundabout = false;

    for (let i = 0; i < nodeSequence.length - 1; i++) {
        const curr = nodeSequence[i];
        const next = nodeSequence[i + 1];
        const maneuver = sequenceManeuvers[i]!;

        if (maneuver === 3) {
            if (inRoundabout) continue;
            inRoundabout = true;
        } else {
            inRoundabout = false;
        }

        if (maneuver > 0 && maneuver !== 4) {
            let turnType: DirectionStep["type"] = "straight";
            let turnText = "";
            let voiceKey = "";
            let exitCount = sequenceExits[i]!;

            switch (maneuver) {
                case 1:
                    turnType = "left";
                    turnText = "Turn left";
                    voiceKey = "turn_left";
                    break;
                case 2:
                    turnType = "right";
                    turnText = "Turn right";
                    voiceKey = "turn_right";
                    break;
                case 3: {
                    turnType = "roundabout";
                    if (exitCount && exitCount > 0 && exitCount <= 6) {
                        const suffix =
                            exitCount === 1
                                ? "st"
                                : exitCount === 2
                                ? "nd"
                                : exitCount === 3
                                ? "rd"
                                : "th";
                        turnText = `${exitCount}${suffix} exit`;
                        voiceKey = `roundabout_exit_${exitCount}`;
                    } else {
                        turnText = `exit at the roundabout`;
                        voiceKey = "roundabout_exit";
                    }
                    break;
                }
                case 5:
                    turnType = "exit-highway";
                    turnText = "Take the exit";
                    voiceKey = "exit_highway";
                    break;
                case 6:
                    turnType = "slight-left";
                    turnText = "Keep left";
                    voiceKey = "keep_left";
                    break;
                case 7:
                    turnType = "slight-right";
                    turnText = "Keep right";
                    voiceKey = "keep_right";
                    break;
            }

            if (turnText !== "") {
                steps[steps.length - 1]!.distance = nodeKms[i]! - lastStepKm;
                steps.push({
                    id: curr!,
                    type: turnType,
                    text: turnText,
                    voiceKey: voiceKey,
                    distance: 0,
                    cumulativeKm: nodeKms[i],
                    exitCumulativeKm: nodeKms[i + 1],
                    coords: nodeCoords.get(curr!) || [0, 0],
                    exitCoords: nodeCoords.get(next!) || [0, 0],
                    exitCount: exitCount,
                });
                lastStepKm = nodeKms[i]!;
            }
        }
    }

    // Add Destination
    const totalKm = nodeKms[nodeSequence.length - 1];
    steps[steps.length - 1]!.distance = Math.max(0, totalKm! - lastStepKm);
    steps.push({
        id: nodeSequence[nodeSequence.length - 1]!,
        type: "destination",
        text: "Arrived",
        voiceKey: "arrived",
        cumulativeKm: totalKm,
        distance: 0,
        coords: nodeCoords.get(nodeSequence[nodeSequence.length - 1]!) || [
            0, 0,
        ],
    });

    return steps;
}
