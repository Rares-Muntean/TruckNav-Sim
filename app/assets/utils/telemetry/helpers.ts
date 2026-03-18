import { convertAtsToGeo, convertEts2ToGeo } from "../map/converters";
import { getBearing } from "../map/maths";
import type { GameType, TelemetryData } from "~/types";

export const ATS_BRANDS = [
    "freightliner",
    "peterbilt",
    "kenworth",
    "westernstar",
    "intl",
    "mack",
];
const ETS2_BRANDS = ["scania", "man", "mercedes", "renault", "iveco", "daf"];

export function getTruckState(
    data: TelemetryData,
    lastPosition: [number, number] | null,
    selectedGame: GameType,
    currentHeadingOffset: number,
) {
    const { x, z } = data.truck.placement;
    let truckCoords: [number, number] = [0, 0];

    truckCoords =
        selectedGame === "ets2"
            ? convertEts2ToGeo(x, z)
            : convertAtsToGeo(x, z);

    const truckSpeed = Math.max(0, Math.floor(data.truck.speed));

    const rawGameHeading = data.truck.placement.heading;
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
    };
}

export function getGameState(data: TelemetryData) {
    const gameConnected = data.game.connected;
    const hasInGameMarker =
        data.navigation.estimatedDistance > 100 && data.job.income === 0;

    const { formatted, raw } = convertTelemtryTime(data.game.time);
    const day = raw.toUTCString().slice(0, 3);
    const gameTime = `${day} ${formatted}`;

    return {
        gameConnected,
        hasInGameMarker,
        gameTime,
    };
}

export function getNavigationState(data: TelemetryData) {
    const fuel = parseInt(data.truck.fuel.toFixed(1));
    const speedLimit = data.navigation.speedLimit;

    const { formatted: restStoptime, raw } = convertTelemtryTime(
        data.game.nextRestStopTime,
    );
    const restStopMinutes = raw.getUTCHours() * 60 + raw.getUTCMinutes();

    return { fuel, speedLimit, restStoptime, restStopMinutes };
}

export function getJobState(data: TelemetryData) {
    const hasActiveJob = data.job.income > 0;
    const hasCargo = data.trailer.attached;

    const destinationCity = hasCargo ? data.job.destinationCity : data.job.sourceCity;
    const destinationCompany = hasCargo ? data.job.destinationCompany : data.job.sourceCompany;

    return { hasActiveJob, destinationCity, destinationCompany };
}

export function verifyGameByTruck(
    truckId: string,
    truckModel: string,
    reportedGame: string,
): "ats" | "ets2" {
    const id = truckId.toLowerCase();
    const model = truckModel.toLowerCase();

    if (ATS_BRANDS.some((brand) => id.includes(brand))) return "ats";

    if (ETS2_BRANDS.some((brand) => id.includes(brand))) return "ets2";

    if (id.includes("volvo")) {
        if (model.includes("vnl")) return "ats";
        if (model.includes("fh")) return "ets2";

        return "ets2";
    }

    return reportedGame.toLowerCase().includes("ats") ? "ats" : "ets2";
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
