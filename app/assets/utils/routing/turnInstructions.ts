import { getSignedAngle } from "~/assets/utils/map/maths";

export interface TurnInstruction {
    pathIndex: number;
    type: 'slight-left' | 'left' | 'slight-right' | 'right' | 'straight' | 'destination';
    description: string;
    distance: number;
}

const minTurn = 15;
const minSlightTurn = 45;

export function generateTurnInstructions(
    rawPath: [number, number][],
    stats: Float32Array,
    nodeCoords: Map<number, [number, number]>,
    adjacency: Map<number, { to: number; weight: number; r: number }[]>,
): TurnInstruction[] {
    if (rawPath.length < 3) {
        return [{
            pathIndex: rawPath.length - 1,
            type: 'destination',
            description: 'Arrive at destination',
            distance: 0,
        }];
    }

    const instructions: TurnInstruction[] = [];

    const formatCoordKey = (coord: [number, number]) => `${coord[0]},${coord[1]}`;

    const coordToNodeId = new Map<string, number>();
    const nodeDegree = new Map<number, number>();

    for (const [id, coord] of nodeCoords) {
        coordToNodeId.set(formatCoordKey(coord), id);
    }

    for (const [from, neighbors] of adjacency) {
        nodeDegree.set(from, (nodeDegree.get(from) ?? 0) + neighbors.length);
        for (const edge of neighbors) {
            nodeDegree.set(edge.to, (nodeDegree.get(edge.to) ?? 0) + 1);
        }
    }

    for (let i = 1; i < rawPath.length - 1; i++) {
        const prev = rawPath[i - 1]!;
        const curr = rawPath[i]!;
        const next = rawPath[i + 1]!;

        const signedAngle = getSignedAngle(prev, curr, next);
        const absAngle = Math.abs(signedAngle);

        const currId = coordToNodeId.get(formatCoordKey(curr));
        const degree = currId !== undefined ? nodeDegree.get(currId) ?? 0 : 0;
        const isIntersection = degree >= 3;

        const effectiveMinTurn = isIntersection ? minTurn : 60;

        if (absAngle <= effectiveMinTurn) continue;

        const lastInstruction = instructions[instructions.length - 1];
        const currentKm = stats[i * 2]!;

        if (lastInstruction) {
            const delta = currentKm - lastInstruction.distance;
            if (delta < 0.2) continue;
        }

        let turnType: 'slight-left' | 'left' | 'slight-right' | 'right';
        let turnWord: string;

        if (signedAngle < -minSlightTurn) {
            turnType = 'left';
            turnWord = 'left';
        } else if (signedAngle < -minTurn) {
            turnType = 'slight-left';
            turnWord = 'slight left';
        } else if (signedAngle > minSlightTurn) {
            turnType = 'right';
            turnWord = 'right';
        } else {
            turnType = 'slight-right';
            turnWord = 'slight right';
        }

        instructions.push({
            pathIndex: i,
            type: turnType,
            description: `Turn ${turnWord}`,
            distance: currentKm,
        });
    }

    instructions.push({
        pathIndex: rawPath.length - 1,
        type: 'destination',
        description: 'Arrived at destination',
        distance: stats[(rawPath.length - 1) * 2]!,
    });

    return instructions;
}