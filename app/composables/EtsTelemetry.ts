import { Capacitor } from "@capacitor/core";
import {
    getGameState,
    getJobState,
    getNavigationState,
    getTruckDamageState,
    getTruckState,
} from "~/assets/utils/telemetry/helpers";
import type {
    TruckState,
    GameState,
    NavigationState,
    JobState,
    TelemetryUpdate,
    TelemetryPacket,
    TruckDamageData,
} from "~/types";

const truckState = reactive<TruckState>({
    truckCoords: [0, 0],
    truckHeading: 0,
    truckSpeed: 0,
    averageSpeed: 80,

    truckBrand: "Not",
    truckName: "Driving",
    odometer: 0,

    fuel: 0,
    fuelCapacity: 0,
    fuelRange: 0,
    avgConsumption: 0,
});

const truckDamageState = reactive<TruckDamageData>({
    engine: 0,
    transmission: 0,
    cabin: 0,
    chassis: 0,
    wheels: 0,
});

const gameState = reactive<GameState>({
    gameTime: "",
    gameConnected: false,
    hasInGameMarker: false,
    scale: 0,
});

const navigationState = reactive<NavigationState>({
    speedLimit: 0,
    restStoptime: "",
    restStopMinutes: 0,
});

const jobState = reactive<JobState>({
    hasActiveJob: false,
    income: 0,
    deadlineTime: new Date(),
    remainingTime: 0,
    sourceCity: "0",
    sourceCompany: "0",
    destinationCity: "0",
    destinationCompany: "0",

    destinationCompanyName: "",
    destinationCityName: "",
    sourceCityName: "",
    sourceCompanyName: "",

    cargo: { mass: 0, name: "", cargoDamage: 0 },
});

let lastPosition: [number, number] | null = null;
let headingOffset = 0;

let socket: WebSocket | null = null;

function sendDiscordRpcState(payload: {
    game: string;
    connected: boolean;
    hasActiveJob: boolean;
    sourceCity?: string;
    destinationCity?: string;
    cargoName?: string;
    truckBrand?: string;
    truckName?: string;
}) {
    if (typeof window === "undefined") return;

    const electronApi = (window as any).electronAPI;
    if (!electronApi?.updateDiscordRpc) return;

    electronApi.updateDiscordRpc(payload);
}

function clearDiscordRpcState() {
    if (typeof window === "undefined") return;

    const electronApi = (window as any).electronAPI;
    if (!electronApi?.clearDiscordRpc) return;

    electronApi.clearDiscordRpc();
}

export function useEtsTelemetry() {
    const { settings } = useSettings();

    const isCapacitor = Capacitor.isNativePlatform();

    let speedSamples: number[] = [];
    const maxSamples = 120;

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
            socket.onclose = null;
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
            gameTime: gameTime,
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

            truckBrand,
            truckName,
            odometer,

            fuel,
            fuelCapacity,
            fuelRange,
            avgConsumption,
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

            truckBrand: truckBrand,
            truckName: truckName,
            odometer: odometer,
            fuel: fuel,
            fuelCapacity: fuelCapacity,
            fuelRange: fuelRange,
            avgConsumption: avgConsumption,
        });

        const { engine, transmission, cabin, chassis, wheels } =
            getTruckDamageState(data);

        Object.assign(truckDamageState, {
            engine: engine,
            transmission: transmission,
            cabin: cabin,
            chassis: chassis,
            wheels: wheels,
        });

        lastPosition = truckCoords;
        headingOffset = newOffset;

        const { speedLimit, restStoptime, restStopMinutes } =
            getNavigationState(data);

        Object.assign(navigationState, {
            restStoptime: restStoptime,
            restStopMinutes: restStopMinutes,
            speedLimit: speedLimit,
        });

        const {
            hasActiveJob,
            cityTarget: destinationCity,
            companyTarget: destinationCompany,
            income,
            remainingTime,
            cargo,
            destinationCompanyName,
            destinationCityName,
            sourceCityName,
            sourceCompanyName,
        } = getJobState(data, settings.value.selectedGame);

        Object.assign(jobState, {
            hasActiveJob: hasActiveJob,
            destinationCity: destinationCity,
            destinationCompany: destinationCompany,
            income: income,
            remainingTime: remainingTime,
            cargo: cargo,

            destinationCompanyName: destinationCompanyName,
            destinationCityName: destinationCityName,
            sourceCityName: sourceCityName,
            sourceCompanyName: sourceCompanyName,
        });

        sendDiscordRpcState({
            game: data.game,
            connected: gameConnected,
            hasActiveJob,
            sourceCity: data.job.citySource || data.job.citySourceId,
            destinationCity:
                data.job.cityDestination || data.job.cityDestinationId,
            cargoName: data.job.cargo?.name,
            truckBrand: data.truck.constants?.brand,
            truckName: data.truck.constants?.name,
        });

        if (onUpdate) {
            onUpdate({
                truck: { ...truckState },
                game: { ...gameState },
                general: { ...navigationState },
                job: { ...jobState },
                truckDamage: { ...truckDamageState },
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

        clearDiscordRpcState();

        if (onUpdate && wasConnected) {
            onUpdate({
                truck: { ...truckState },
                game: { ...gameState },
                general: { ...navigationState },
                job: { ...jobState },
                truckDamage: { ...truckDamageState },
            });
        }
    }

    return {
        ...toRefs(navigationState),
        ...toRefs(truckState),
        ...toRefs(truckDamageState),
        ...toRefs(gameState),
        ...toRefs(jobState),
        startTelemetry,
        stopTelemetry,
    };
}
