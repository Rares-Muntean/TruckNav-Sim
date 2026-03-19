import { getSignedAngle } from "~/assets/utils/map/maths";
import type { Edge } from "./graphTypes";

export type Maneuver =
    | { kind: "turn"; index: number; angle: number }
    | { kind: "fork"; index: number; side: "left" | "right" }
    | { kind: "destination"; index: number };

export interface TurnInstruction {
    pathIndex: number;
    type: 'slight-left' | 'left' | 'slight-right' | 'right' | 'continue' | 'keep-left' | 'keep-right' | 'destination';
    description: string;
    distance: number;
}

// Thresholds
const HARD_TURN = 45;
const SLIGHT_TURN = 25;
const FORK_MIN_DOT_DIFF = 0.12;
const CONTINUE_MIN_KM = 1.5;
const TOLERANCE_INDICES = 5;

export function generateTurnInstructions(
    rawPath: [number, number][],
    stats: Float32Array,
    pathNodeIds: number[],
    nodeCoords: Map<number, [number, number]>,
    adjacency: Map<number, Edge[]>,
): TurnInstruction[] {
    if (rawPath.length < 2) return [{
        pathIndex: 0,
        type: "destination",
        description: "Arrived at destination",
        distance: 0,
    }];

    const maneuvers: Maneuver[] = [];

    // Identify all turns and forks
    for (let i = 1; i < rawPath.length - 1; i++) {
        const prev = rawPath[i - 1];
        const curr = rawPath[i];
        const next = rawPath[i + 1];

        const angle = getSignedAngle(prev, curr, next);
        const abs = Math.abs(angle);

        const currId = pathNodeIds[i];
        const degree = currId !== undefined ? (adjacency.get(currId)?.length ?? 0) : 0;

        if (degree >= 3 && currId !== undefined) {
            const fork = detectFork(prev, curr, next, currId, adjacency, nodeCoords);
            if (fork) {
                maneuvers.push({ kind: "fork", index: i, side: fork });
                continue;
            }
        }

        if (abs >= SLIGHT_TURN) {
            maneuvers.push({ kind: "turn", index: i, angle });
        }
    }

    maneuvers.push({ kind: "destination", index: rawPath.length - 1 });

    // Build instructions with "continue" lookahead
    const instructions: TurnInstruction[] = [];

    for (let i = 0; i < maneuvers.length; i++) {
        const m = maneuvers[i];
        const km = stats[m.index * 2];

        // Insert continue for the stretch before this maneuver
        if (i > 0) {
            const prev = maneuvers[i - 1];
            const startIndex = prev.index;
            const endIndex = Math.max(m.index - TOLERANCE_INDICES, startIndex + 1);
            const straightDistance = stats[endIndex * 2] - stats[startIndex * 2];

            if (straightDistance >= CONTINUE_MIN_KM) {
                instructions.push({
                    pathIndex: endIndex,
                    type: "continue",
                    description: `Continue`,
                    distance: stats[endIndex * 2],
                });
            }
        }

        // Build maneuver instruction
        let instr: TurnInstruction | null = null;
        if (m.kind === "turn") {
            const type = Math.abs(m.angle) >= HARD_TURN
                ? m.angle < 0 ? "left" : "right"
                : m.angle < 0 ? "slight-left" : "slight-right";
            instr = {
                pathIndex: m.index,
                type,
                description: `Turn ${type.replace("-", " ")}`,
                distance: km,
            };
        } else if (m.kind === "fork") {
            instr = {
                pathIndex: m.index,
                type: m.side === "left" ? "keep-left" : "keep-right",
                description: m.side === "left" ? "Keep left" : "Keep right",
                distance: km,
            };
        } else if (m.kind === "destination") {
            instr = {
                pathIndex: m.index,
                type: "destination",
                description: "Arrived at destination",
                distance: km,
            };
        }

        if (instr) instructions.push(instr);
    }

    return instructions;
}

export function detectFork(
    prev: [number, number],
    curr: [number, number],
    next: [number, number],
    currId: number,
    adjacency: Map<number, Edge[]>,
    nodeCoords: Map<number, [number, number]>
): "keep-left" | "keep-right" | null {
    const edges = adjacency.get(currId);
    if (!edges || edges.length < 3) return null;

    const incomingAngle = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);

    let bestDot = -Infinity;
    let chosenDot = -Infinity;
    let chosenAngle = 0;

    for (const edge of edges) {
        const toCoord = nodeCoords.get(edge.to);
        if (!toCoord) continue;

        const angle = Math.atan2(toCoord[1] - curr[1], toCoord[0] - curr[0]);
        const dot = Math.cos(angle - incomingAngle);

        bestDot = Math.max(bestDot, dot);

        if (toCoord[0] === next[0] && toCoord[1] === next[1]) {
            chosenDot = dot;
            chosenAngle = angle - incomingAngle;
        }
    }

    if (bestDot - chosenDot < FORK_MIN_DOT_DIFF) return null;

    return chosenAngle < 0 ? "keep-left" : "keep-right";
}