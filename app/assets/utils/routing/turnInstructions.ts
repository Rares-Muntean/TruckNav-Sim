export interface TurnInstruction {
    pathIndex: number;
    type:
        | "sharp-left" | "left" | "slight-left"
        | "sharp-right" | "right" | "slight-right"
        | "keep-left" | "keep-right"
        | "continue" | "destination";
    description: string;
    distance: number;
}

const SLIGHT_DEG         = 20;
const HARD_DEG           = 45;
const SHARP_DEG          = 100;
const FORK_ADVANTAGE_DEG = 15;

function bearingBetween(
    flatCoords: Float64Array,
    fromId: number,
    toId: number,
): number {
    const dLng = flatCoords[toId * 2]!     - flatCoords[fromId * 2]!;
    const dLat = flatCoords[toId * 2 + 1]! - flatCoords[fromId * 2 + 1]!;
    return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function signedAngleDiff(from: number, to: number): number {
    return ((to - from + 540) % 360) - 180;
}

export function evaluateJunction(
    prevId: number,
    currId: number,
    nextId: number,
    pathIndex: number,
    adjacency: Map<number, { to: number; weight: number; r: number; dlc: number }[]>,
    flatCoords: Float64Array,
): Omit<TurnInstruction, "distance"> | null {
    const edges = adjacency.get(currId);
    if (!edges || edges.length < 3) {
        return null;
    }
    const inBearing  = bearingBetween(flatCoords, prevId, currId);
    const outBearing = bearingBetween(flatCoords, currId, nextId);
    const chosenDeg  = signedAngleDiff(inBearing, outBearing) * -1;

    let bestAltDeg = Infinity;
    let altCount   = 0;

    for (const edge of edges) {
        if (edge.to === nextId) continue;
        const exitBearing = bearingBetween(flatCoords, currId, edge.to);
        const exitDeg     = signedAngleDiff(inBearing, exitBearing);
        if (Math.abs(exitDeg) > 150) continue; // ignore U-turns
        altCount++;
        if (Math.abs(exitDeg) < Math.abs(bestAltDeg)) bestAltDeg = exitDeg;
    }

    if (altCount === 0) return null;

    const chosenAbs  = Math.abs(chosenDeg);
    const bestAltAbs = Math.abs(bestAltDeg);

    if (chosenAbs < SLIGHT_DEG && bestAltAbs < SLIGHT_DEG) {
        if (chosenAbs - bestAltAbs > FORK_ADVANTAGE_DEG) {
            const type = chosenDeg < 0 ? "keep-left" : "keep-right";
            return { pathIndex, type, description: type === "keep-left" ? "Keep left" : "Keep right" };
        }
        return null; 
    }

    if (chosenAbs < SLIGHT_DEG) {
        return { pathIndex, type: "continue", description: "Continue straight" };
    }

    if (bestAltAbs < chosenAbs - FORK_ADVANTAGE_DEG || chosenAbs >= HARD_DEG) {
        const abs  = Math.abs(chosenDeg);
        const type: TurnInstruction["type"] =
            abs >= SHARP_DEG ? (chosenDeg < 0 ? "sharp-left"  : "sharp-right") :
            abs >= HARD_DEG  ? (chosenDeg < 0 ? "left"        : "right")       :
                               (chosenDeg < 0 ? "slight-left" : "slight-right");
        return { pathIndex, type, description: `Turn ${type.replace("-", " ")}` };
    }

    return null;
}

export function cleanInstructions(instructions: TurnInstruction[]): TurnInstruction[] {
    let result = instructions.filter((t, i) => {
        if (t.type === "continue") {
            const next = instructions[i + 1];
            if (next && next.type === "continue") return false;
        }
        return true;
    });

    const result2: TurnInstruction[] = [];
    for (const t of result) {
        const prev = result2[result2.length - 1];
        if (prev && t.pathIndex - prev.pathIndex <= 1 && t.type !== "destination") continue;
        result2.push(t);
    }

    return result2;
}
