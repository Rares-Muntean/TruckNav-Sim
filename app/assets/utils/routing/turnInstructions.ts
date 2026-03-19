import { getSignedAngle } from "~/assets/utils/map/maths";
import type { Edge } from "./graphTypes";

export interface TurnInstruction {
    pathIndex: number;
    type: "slight-left" | "left" | "slight-right" | "right" | "destination";
    description: string;
    distance: number;
}

const HARD_TURN = 45;
const SLIGHT_TURN = 25;
const STRAIGHT_RESET = 10;
const POST_TURN_SUPPRESS_KM = 0.5;

export function generateTurnInstructions(
    rawPath: [number, number][],
    stats: Float32Array,
    pathNodeIds: number[],
    adjacency: Map<number, Edge[]>,
    nodeCoords: Map<number, [number, number]>
): TurnInstruction[] {
    if (rawPath.length < 3) {
        return [{
            pathIndex: rawPath.length - 1,
            type: "destination",
            description: "Arrive at destination",
            distance: 0,
        }];
    }

    const instructions: TurnInstruction[] = [];

    function tookStraightEdge(
        prev: [number, number],
        curr: [number, number],
        next: [number, number],
        currId: number
    ): boolean {
        const edges = adjacency.get(currId);
        if (!edges || edges.length < 3) return true;

        const incoming = Math.atan2(
            curr[1] - prev[1],
            curr[0] - prev[0],
        );

        let bestDot = -Infinity;
        let takenDot = -Infinity;

        for (const edge of edges) {
            const to = nodeCoords.get(edge.to);
            if (!to) continue;

            const angle = Math.atan2(
                to[1] - curr[1],
                to[0] - curr[0],
            );

            const dot = Math.cos(angle - incoming);
            bestDot = Math.max(bestDot, dot);

            if (to[0] === next[0] && to[1] === next[1]) {
                takenDot = dot;
            }
        }

        return takenDot >= bestDot - 0.15;
    }

    let activeAngle = 0;
    let activeSign = 0;
    let activeIndex = -1;
    let activeDistance = 0;

    for (let i = 1; i < rawPath.length - 1; i++) {
        const prev = rawPath[i - 1]!;
        const curr = rawPath[i]!;
        const next = rawPath[i + 1]!;

        const angle = getSignedAngle(prev, curr, next);
        const abs = Math.abs(angle);
        const sign = Math.sign(angle);
        const km = stats[i * 2]!;

        const currId = pathNodeIds[i];
        const degree = currId !== undefined
            ? adjacency.get(currId)?.length ?? 0
            : 0;

        const isTopologyTurn =
            currId !== undefined &&
            degree >= 3 &&
            !tookStraightEdge(prev, curr, next, currId);

        const isHardGeometryTurn = abs >= HARD_TURN;
        const shouldStartTurn = isTopologyTurn || isHardGeometryTurn;

        if (!shouldStartTurn && abs < STRAIGHT_RESET) {
            if (Math.abs(activeAngle) >= SLIGHT_TURN) {
                const hard = Math.abs(activeAngle) >= HARD_TURN;
                const left = activeAngle < 0;

                const type = hard
                    ? (left ? "left" : "right")
                    : (left ? "slight-left" : "slight-right");

                const word = type.replace("-", " ");

                const last = instructions[instructions.length - 1];
                const suppress =
                    last &&
                    (last.type === "left" || last.type === "right") &&
                    type.startsWith("slight") &&
                    activeDistance - last.distance < POST_TURN_SUPPRESS_KM;

                if (!suppress && (!last || activeDistance - last.distance >= 0.2)) {
                    instructions.push({
                        pathIndex: activeIndex,
                        type,
                        description: `Turn ${word}`,
                        distance: activeDistance,
                    });
                }
            }

            activeAngle = 0;
            activeSign = 0;
            activeIndex = -1;
            continue;
        }

        if (activeSign === 0) {
            activeAngle = angle;
            activeSign = sign;
            activeIndex = i;
            activeDistance = km;
        } else if (sign === activeSign) {
            activeAngle += angle;
        } else {
            activeAngle = angle;
            activeSign = sign;
            activeIndex = i;
            activeDistance = km;
        }
    }

    instructions.push({
        pathIndex: rawPath.length - 1,
        type: "destination",
        description: "Arrived at destination",
        distance: stats[(rawPath.length - 1) * 2]!,
    });

    return instructions;
}