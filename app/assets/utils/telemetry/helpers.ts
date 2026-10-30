import { convertAtsToGeo, convertEts2ToGeo } from "../map/converters";
import { getBearing } from "../map/maths";
import type { GameType, TelemetryPacket } from "~/types";
import anyAscii from "any-ascii";

export function getTruckState(
    data: TelemetryPacket,
    lastPosition: [number, number] | null,
    selectedGame: GameType,
    currentHeadingOffset: number,
    speedSamples: number[],
    maxSamples: number,
) {
    const { x, z } = data.truck.current.position;
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
        Math.floor(data.truck.current.dashboard.speedKph),
    );

    const avgSpeed = updateMovingAverage(truckSpeed, speedSamples, maxSamples);

    const rawGameHeading = data.truck.current.heading;
    const { heading, newOffset } = getCorrectHeading(
        rawGameHeading,
        truckSpeed,
        truckCoords,
        lastPosition,
        currentHeadingOffset,
    );

    const truckBrand = data.truck.constants.brand;
    const truckName = data.truck.constants.name;
    const odometer = Math.round(data.truck.current.dashboard.odometer);

    const fuel = Math.round(data.truck.current.dashboard.fuelAmount);
    const fuelCapacity = data.truck.constants.fuelCapacity;
    const fuelRange = Math.round(data.truck.current.dashboard.fuelRange);
    const avgConsumption = data.truck.current.dashboard.averageConsumption;

    return {
        truckCoords,
        truckSpeed,
        truckHeading: heading,
        headingOffset: newOffset,
        avgSpeed,

        truckBrand,
        truckName,
        odometer,
        fuel,
        fuelCapacity,
        fuelRange,
        avgConsumption,
    };
}

export function getGameState(data: TelemetryPacket) {
    const name = data.game.toLowerCase();
    const gameConnected = name === "ets2" || name === "ats";

    const scale = data.common.mapScale;

    const hasInGameMarker =
        data.navigation.distance > 100 && data.job.income === 0;

    const { formatted, raw } = convertTelemtryTime(data.common.gameTime);
    const day = raw.toUTCString().slice(0, 3);
    const gameTime = `${day} ${formatted}`;

    return {
        gameConnected,
        hasInGameMarker,
        gameTime,
        scale,
    };
}

export function getTruckDamageState(data: TelemetryPacket) {
    const engine = Math.round(data.truck.current.damage.engine * 100);
    const transmission = Math.round(
        data.truck.current.damage.transmission * 100,
    );
    const cabin = Math.round(data.truck.current.damage.cabin * 100);
    const chassis = Math.round(data.truck.current.damage.chassis * 100);
    const wheels = Math.round(data.truck.current.damage.wheels * 100);

    return {
        engine,
        transmission,
        cabin,
        chassis,
        wheels,
    };
}

export function getNavigationState(data: TelemetryPacket) {
    const speedLimit = Math.max(0, Math.round(data.navigation.speedLimitKph));

    const totalMinutes = data.common.nextRestStopMinutes;
    const hours = Math.max(0, Math.floor(totalMinutes / 60));
    const mins = Math.max(0, totalMinutes % 60);

    const restStoptime = `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}`;

    return { speedLimit, restStoptime, restStopMinutes: totalMinutes };
}

export function getJobState(data: TelemetryPacket, selectedGame: GameType) {
    let companyTarget = "";
    let cityTarget = "";
    let trailerCoords: [number, number] = [0, 0];

    const hasActiveJob = data.specialEvents.onJob;

    const destinationCity = data.job.cityDestinationId;
    const destinationCityName = cleanText(data.job.cityDestination);

    const destinationCompany = data.job.companyDestinationId;
    const destinationCompanyName = cleanText(data.job.companyDestination);

    const jobType = data.job.jobType;

    const sourceCity = data.job.citySourceId;
    const sourceCityName = cleanText(data.job.citySource);

    const sourceCompany = data.job.companySourceId;
    const sourceCompanyName = cleanText(data.job.companySource);

    if (data.trailers[0]) {
        const isTrailerAvailable =
            data.trailers[0].position.y !== 0 &&
            data.trailers[0].position.x !== 0;

        const isTrailerAttached = data.trailers[0]?.attached;

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
    } else {
        companyTarget = destinationCompany;
        cityTarget = destinationCity;
    }

    const income = data.job.income;
    const remainingTime = data.job.remainingDeliveryTime;

    const cargo = {
        mass: data.job.cargo.mass,
        name: data.job.cargo.name,
        cargoDamage: Math.round(data.job.cargo.cargoDamage * 100),
    };

    return {
        hasActiveJob,
        cityTarget,
        companyTarget,
        trailerCoords,
        income,
        remainingTime,
        cargo,

        destinationCityName,
        destinationCompanyName,
        sourceCityName,
        sourceCompanyName,
    };
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

export function getPercentage(part: number, total: number) {
    if (!total || total <= 0) return 0;
    return Math.round((part / total) * 100);
}

export function getRestPercentage(minutesLeft: number, game: GameType): number {
    if (!minutesLeft || minutesLeft <= 0) return 0;

    const maxShiftMinutes = game === "ats" ? 14 * 60 : 11 * 60;

    return getPercentage(minutesLeft, maxShiftMinutes);
}

export function formatRemainingTime(totalMinutes: number) {
    if (!totalMinutes || totalMinutes < 0) return { hours: 0, mins: 0 };

    const hours = Math.floor(totalMinutes / 60);

    const mins = totalMinutes % 60;

    console.log(totalMinutes);

    return { hours, mins };
}

export function formatNumber(value: number) {
    if (value === null) return "0";

    return value.toLocaleString("en-US");
}

export function formatCompactNumber(value: number): string {
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
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

function convertTelemtryTime(time: string) {
    const date = new Date(time);
    return {
        formatted: `${date.getUTCHours().toString().padStart(2, "0")}:${date
            .getUTCMinutes()
            .toString()
            .padStart(2, "0")}`,
        raw: date,
    };
}

export function cleanText(value: string | null | undefined): string {
    if (!value) return "";
    return anyAscii(value);
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
