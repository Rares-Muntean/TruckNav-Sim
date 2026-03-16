import { CapacitorHttp } from "@capacitor/core";
import {
    getGameState,
    getJobState,
    getNavigationState,
    getTruckState,
    verifyGameByTruck,
} from "~/assets/utils/telemetry/helpers";
import type {
    TruckState,
    GameState,
    NavigationState,
    JobState,
    TelemetryUpdate,
    TelemetryData,
} from "~/types";

const isTelemetryConnected = ref(false);
const isRunning = ref(false);
let currentSessionId = 0;

const truckState = reactive<TruckState>({
    truckCoords: [0, 0],
    truckHeading: 0,
    truckSpeed: 0,
});

const gameState = reactive<GameState>({
    gameTime: "",
    gameConnected: false,
    hasInGameMarker: false,
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

let fetchTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

export function useEtsTelemetry() {
    const { isElectron, isMobile, isWeb } = usePlatform();
    const { settings } = useSettings();

    async function fetchTelemetryData(): Promise<TelemetryData | null> {
        try {
            if (isMobile.value) {
                const response = await CapacitorHttp.get({
                    url: `http://${settings.value.savedIP}:25555/api/ets2/telemetry`,
                    connectTimeout: 1000,
                });

                if (response.status === 200)
                    return response.data as TelemetryData;
            } else if (isWeb.value) {
                if (abortController) abortController.abort();
                abortController = new AbortController();
                const timeoutId = setTimeout(
                    () => abortController?.abort(),
                    1000,
                );

                const res = await fetch("/api/ets2", {
                    signal: abortController.signal,
                    cache: "no-cache",
                    headers: { Pragma: "no-cache" },
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    const result = await res.json();
                    if (result.connected)
                        return result.telemetry as TelemetryData;
                }

                return null;
            } else if (isElectron.value) {
                const targetIP = settings.value.savedIP || "127.0.0.1";
                return (await (window as any).electronAPI.fetchTelemetry(
                    targetIP,
                )) as TelemetryData;
            }
        } catch (err) {
            if (err instanceof Error && err.name !== "AbortError")
                console.log(err);
        }

        return null;
    }

    function startTelemetry(onUpdate?: (data: TelemetryUpdate) => void) {
        if (isRunning.value) return;

        isRunning.value = true;
        currentSessionId++;
        const mySessionId = currentSessionId;

        const loop = async () => {
            if (!isRunning.value || currentSessionId !== mySessionId) return;

            const startTime = performance.now();
            let nextTickDelay = 100;

            const data = await fetchTelemetryData();

            if (data && data.game?.connected) {
                const apiGame = verifyGameByTruck(
                    data.truck.id,
                    data.truck.model,
                    data.game.gameName,
                );

                if (apiGame === settings.value.selectedGame) {
                    isTelemetryConnected.value = true;
                    processData(data, onUpdate);
                    nextTickDelay = 100;
                } else {
                    isTelemetryConnected.value = false;
                    resetDataOnDisconnected(onUpdate);
                    nextTickDelay = 4000;
                }
            } else {
                isTelemetryConnected.value = false;
                resetDataOnDisconnected(onUpdate);
                nextTickDelay = 1000;
            }

            const duration = performance.now() - startTime;
            const delay = Math.max(50, nextTickDelay - duration);

            if (isRunning.value && currentSessionId === mySessionId) {
                fetchTimer = setTimeout(loop, delay);
            }
        };

        loop();
    }

    function stopTelemetry() {
        isRunning.value = false;
        currentSessionId++;
        if (fetchTimer) clearTimeout(fetchTimer);
        if (abortController) abortController.abort();
        fetchTimer = null;
    }

    function processData(
        data: TelemetryData,
        onUpdate?: (data: TelemetryUpdate) => void,
    ) {
        const { gameConnected, hasInGameMarker, gameTime } = getGameState(data);
        Object.assign(gameState, {
            gameTime: gameTime,
            gameConnected: gameConnected,
            hasInGameMarker: hasInGameMarker,
        });

        const {
            truckCoords,
            truckSpeed,
            truckHeading,
            headingOffset: newOffset,
        } = getTruckState(
            data,
            lastPosition,
            settings.value.selectedGame,
            headingOffset,
        );
        Object.assign(truckState, {
            truckCoords: truckCoords,
            truckHeading: truckHeading,
            truckSpeed: truckSpeed,
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

        const { hasActiveJob, destinationCity, destinationCompany } =
            getJobState(data);
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
        isTelemetryConnected.value = false;
        headingOffset = 0;

        Object.assign(gameState, {
            gameConnected: false,
            hasInGameMarker: false,
            gameTime: "",
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
    };
}
