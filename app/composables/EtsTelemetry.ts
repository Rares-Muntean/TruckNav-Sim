import { Capacitor } from "@capacitor/core";
import {
    getGameState,
    getJobState,
    getNavigationState,
    getTruckState,
} from "~/assets/utils/telemetry/helpers";
import type {
    TruckState,
    GameState,
    NavigationState,
    JobState,
    TelemetryUpdate,
    TelemetryPacket,
} from "~/types";

const truckState = reactive<TruckState>({
    truckCoords: [0, 0],
    truckHeading: 0,
    truckSpeed: 0,
    averageSpeed: 80,
});

const gameState = reactive<GameState>({
    gameTime: "",
    gameConnected: false,
    hasInGameMarker: false,
    scale: 0,
});

const navigationState = reactive<NavigationState>({
    fuel: 0,
    speedLimit: 0,
    restStoptime: "",
    restStopMinutes: 0,
});

const jobState = reactive<JobState>({
    hasActiveJob: false,
    income: 0,
    deadlineTime: new Date(),
    remainingTime: new Date(),
    sourceCity: "0",
    sourceCompany: "0",
    destinationCity: "0",
    destinationCompany: "0",
});

let lastPosition: [number, number] | null = null;
let headingOffset = 0;
let socket: WebSocket | null = null;

// TruckersMP time sync
let tmpGameTimeInterval: ReturnType<typeof setInterval> | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let tmpGameTimeMinutes: number | null = null;

function updateDisplayTime() {
    if (tmpGameTimeMinutes === null) return;
    tmpGameTimeMinutes++;
    const totalMins = tmpGameTimeMinutes % 1440;
    const hours = (Math.floor(totalMins / 60) + 2) % 24;
    const mins = totalMins % 60;
    gameState.gameTime = `MP ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function useEtsTelemetry() {
    const { settings } = useSettings();
    const isCapacitor = Capacitor.isNativePlatform();
    let speedSamples: number[] = [];
    const maxSamples = 120;

    async function fetchTruckersmpTime() {
        try {
            let calculatedTime: string | null = null;

            if (isCapacitor) {
                // On Android, call directly — Capacitor native HTTP bypasses CORS
                const res = await fetch("https://api.truckyapp.com/v2/truckersmp/time", {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                });
                const json = await res.json();
                calculatedTime = json.response?.calculated_game_time ?? null;
            } else {
                const json = await $fetch<{ response: { calculated_game_time: string } }>("/api/truckersmp-time");
                calculatedTime = json.response?.calculated_game_time ?? null;
            }

            if (calculatedTime) {
                const date = new Date(calculatedTime);
                tmpGameTimeMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
                tmpGameTimeMinutes += 1;
                updateDisplayTime();
            }
        } catch {
            tmpGameTimeMinutes = null;
        }
    }

    function startTruckersmpTimeSync() {
        fetchTruckersmpTime();
        // Re-sync from API every 30 seconds
        tmpGameTimeInterval = setInterval(fetchTruckersmpTime, 30000);
        // Tick every 10 real seconds = 1 game minute
        tickInterval = setInterval(updateDisplayTime, 10000);
    }

    function stopTruckersmpTimeSync() {
        if (tmpGameTimeInterval) {
            clearInterval(tmpGameTimeInterval);
            tmpGameTimeInterval = null;
        }
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
        tmpGameTimeMinutes = null;
    }

    function startTelemetry(onUpdate?: (data: TelemetryUpdate) => void) {
        if (socket) return;

        const ip = isCapacitor
            ? settings.value.savedIP
            : window.location.hostname;
        const url = `ws://${ip}:30001`;

        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log("Connected to Bridge");
        };

        socket.onmessage = (event) => {
            try {
                const rawData = JSON.parse(event.data);
                const data = rawData as TelemetryPacket;

                if (data.game.toLowerCase() !== settings.value.selectedGame) {
                    resetDataOnDisconnected(onUpdate);
                    return;
                }

                if (data) {
                    processData(data, onUpdate);
                }
            } catch (e) {
                console.error("Data error", e);
            }
        };

        socket.onclose = () => {
            socket = null;
            resetDataOnDisconnected(onUpdate);
            setTimeout(() => startTelemetry(onUpdate), 3000);
        };
    }

    function stopTelemetry() {
        if (socket) {
            socket.close();
            socket = null;
        }
    }

    function processData(
        data: TelemetryPacket,
        onUpdate?: (data: TelemetryUpdate) => void,
    ) {
        const { gameConnected, hasInGameMarker, gameTime, scale } =
            getGameState(data);

        Object.assign(gameState, {
            // Only use telemetry time if TruckersMP sync hasn't kicked in yet
            gameTime: tmpGameTimeMinutes !== null ? gameState.gameTime : gameTime,
            gameConnected: gameConnected,
            hasInGameMarker: hasInGameMarker,
            scale: scale,
        });

        const {
            truckCoords,
            truckSpeed,
            truckHeading,
            headingOffset: newOffset,
            avgSpeed,
        } = getTruckState(
            data,
            lastPosition,
            settings.value.selectedGame,
            headingOffset,
            speedSamples,
            maxSamples,
        );

        Object.assign(truckState, {
            truckCoords: truckCoords,
            truckHeading: truckHeading,
            truckSpeed: truckSpeed,
            averageSpeed: avgSpeed,
        });

        lastPosition = truckCoords;
        headingOffset = newOffset;

        const { fuel, speedLimit, restStoptime, restStopMinutes } =
            getNavigationState(data);

        Object.assign(navigationState, {
            restStoptime: restStoptime,
            restStopMinutes: restStopMinutes,
            speedLimit: speedLimit,
            fuel: fuel,
        });

        const {
            hasActiveJob,
            cityTarget: destinationCity,
            companyTarget: destinationCompany,
        } = getJobState(data, settings.value.selectedGame);

        Object.assign(jobState, {
            hasActiveJob: hasActiveJob,
            destinationCity: destinationCity,
            destinationCompany: destinationCompany,
        });

        if (onUpdate) {
            onUpdate({
                truck: { ...truckState },
                game: { ...gameState },
                general: { ...navigationState },
                job: { ...jobState },
            });
        }
    }

    function resetDataOnDisconnected(
        onUpdate?: (data: TelemetryUpdate) => void,
    ) {
        const wasConnected = gameState.gameConnected;
        headingOffset = 0;
        lastPosition = null;
        speedSamples = [];

        Object.assign(gameState, {
            gameConnected: false,
            hasInGameMarker: false,
            gameTime: "",
            scale: 0,
        });

        Object.assign(truckState, {
            truckCoords: [0, 0],
            truckHeading: 0,
            truckSpeed: 0,
        });

        Object.assign(navigationState, {
            fuel: 0,
            speedLimit: 0,
            restStopMinutes: 0,
            restStoptime: "0",
        });

        Object.assign(jobState, {
            hasActiveJob: false,
        });

        if (onUpdate && wasConnected) {
            onUpdate({
                truck: { ...truckState },
                game: { ...gameState },
                general: { ...navigationState },
                job: { ...jobState },
            });
        }
    }

    return {
        ...toRefs(navigationState),
        ...toRefs(truckState),
        ...toRefs(gameState),
        ...toRefs(jobState),
        startTelemetry,
        stopTelemetry,
        startTruckersmpTimeSync,
        stopTruckersmpTimeSync,
    };
}