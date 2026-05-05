import { convertAtsToGeo, convertEts2ToGeo } from "../map/converters";
import { getBearing } from "../map/maths";
import type { GameType, CommonTelemetryData } from "~/types";

export function getTruckState(
    data: CommonTelemetryData,
    lastPosition: [number, number] | null,
    selectedGame: GameType,
    currentHeadingOffset: number,
    speedSamples: number[],
    maxSamples: number,
) {
    const { x, z } = data.nav.position;
    let truckCoords: [number, number];

    if (Math.abs(x) < 0.001 && Math.abs(z) < 0.001) {
        truckCoords = [0, 0];
    } else {
        truckCoords =
            selectedGame === "ets2"
                ? convertEts2ToGeo(x, z)
                : convertAtsToGeo(x, z);
    }

    const truckSpeed = Math.max(
        0,
        Math.floor(data.nav.speedKph),
    );

    const avgSpeed = updateMovingAverage(truckSpeed, speedSamples, maxSamples);

    const rawGameHeading = data.nav.rawGameHeading;
    const { heading, newOffset } = getCorrectHeading(
        rawGameHeading,
        truckSpeed,
        truckCoords,
        lastPosition,
        currentHeadingOffset,
    );

    return {
        truckCoords,
        truckSpeed,
        truckHeading: heading,
        headingOffset: newOffset,
        avgSpeed,
    };
}

export function getNavigationState(data: CommonTelemetryData) {
    const fuel = parseInt(data.truck.fuel.toFixed(1));
    const speedLimit = Math.max(0, Math.round(data.nav.speedLimitKph));

    const totalMinutes = data.nextRestStopMinutes;
    const hours = Math.max(0, Math.floor(totalMinutes / 60));
    const mins = Math.max(0, totalMinutes % 60);

    const restStoptime = `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}`;

    return { fuel, speedLimit, restStoptime, restStopMinutes: totalMinutes };
}

export function getJobState(data: CommonTelemetryData, selectedGame: GameType) {
    let companyTarget = "";
    let cityTarget = "";
    let trailerCoords: [number, number] = [0, 0];

    const hasActiveJob = data.job.active;

    const destinationCity = data.job.destination.cityId;
    const destinationCompany = data.job.destination.companyId;

    const jobType = data.job.type;

    const sourceCity = data.job.origin.cityId;
    const sourceCompany = data.job.origin.companyId;

    const isTrailerAvailable = data.truck.trailerAvailable;
    const isTrailerAttached = data.truck.trailerAttached;

    if (jobType === "external_contracts" || jobType === "external_market") {
        companyTarget =
            isTrailerAvailable && !isTrailerAttached
                ? sourceCompany
                : destinationCompany;

        cityTarget =
            isTrailerAvailable && !isTrailerAttached
                ? sourceCity
                : destinationCity;
    } else {
        companyTarget = destinationCompany;
        cityTarget = destinationCity;
    }

    return { hasActiveJob, cityTarget, companyTarget, trailerCoords };
}

/**
 * Checks if telemetry bridge is reachable
 * @param ip Ip to get data from
 * @param timeoutMs How long to wait before giving up
 * @returns boolean - true if running, false if not
 */
export async function isBridgeRunning(
    ip: string,
    timeoutMs: number = 2000,
): Promise<boolean> {
    const wsUrl = `ws://${ip}:30001`;

    return new Promise((resolve) => {
        const testSocket = new WebSocket(wsUrl);

        const timeoutId = setTimeout(() => {
            testSocket.close();
            resolve(false);
        }, timeoutMs);

        testSocket.onopen = () => {
            clearTimeout(timeoutId);
            testSocket.close();
            resolve(true);
        };

        testSocket.onerror = () => {
            clearTimeout(timeoutId);
            testSocket.close();
            resolve(false);
        };
    });
}

function getCorrectHeading(
    rawGameHeading: number,
    truckSpeed: number,
    currentCoords: [number, number],
    lastPosition: [number, number] | null,
    headingOffset: number,
) {
    let internalOffset = headingOffset;

    const rawDegrees = -rawGameHeading * 360;

    if (lastPosition && truckSpeed > 10) {
        const dist = Math.sqrt(
            Math.pow(currentCoords[0] - lastPosition[0], 2) +
                Math.pow(currentCoords[1] - lastPosition[1], 2),
        );

        if (dist > 0.00005) {
            const trueBearing = getBearing(lastPosition, currentCoords);

            let diff = trueBearing - rawDegrees;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;

            if (Math.abs(diff) < 90) {
                internalOffset += (diff - internalOffset) * 0.1;
            }
        }
    }

    let finalHeading = rawDegrees + internalOffset;
    finalHeading = ((finalHeading % 360) + 360) % 360;

    return { heading: finalHeading, newOffset: internalOffset };
}

function updateMovingAverage(
    currentSpeed: number,
    speedSamples: number[],
    maxSamples: number,
) {
    if (currentSpeed > 10) {
        speedSamples.push(currentSpeed);
        if (speedSamples.length > maxSamples) speedSamples.shift();
    }

    if (speedSamples.length === 0) return 80;

    const sum = speedSamples.reduce((a, b) => a + b, 0);
    return sum / speedSamples.length;
}
