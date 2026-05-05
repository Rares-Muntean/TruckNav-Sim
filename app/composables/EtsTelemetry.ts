import { Capacitor } from "@capacitor/core";
import {
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
    TruckTelPacket,
    CommonTelemetryData,
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
    simDataValid: false,
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

    let isTruckTel: boolean = false;
    let truckTelCurrentState: TruckTelPacket = {};
    let truckTelLastKnownState: TruckTelPacket = {};

    function startTelemetry(onUpdate?: (data: TelemetryUpdate) => void) {
        if (socket) return;

        const ip = isCapacitor
            ? settings.value.savedIP
            : window.location.hostname;
        const path = isTruckTel ? "/api/ws/delta/nav?throttle=100" : "";
        const url = `ws://${ip}:30001${path}`;

        socket = new WebSocket(url);

        socket.onopen = () => {
            if (isTruckTel) {
                console.log("Connected to TruckTel");
            } else {
                console.log("Connected to Bridge");
            }
        };

        socket.onmessage = (event) => {
            try {
                const rawData = JSON.parse(event.data);

                let data;
                if (isTruckTel) {
                    data = convertTruckTelData(rawData);
                } else {
                    data = convertScsSdkPluginData(rawData);
                }

                if (data.connection.game.toLowerCase() !== settings.value.selectedGame) {
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

        socket.onclose = (e: CloseEvent) => {
            socket = null;
            truckTelCurrentState = {};
            truckTelLastKnownState = {};
            resetDataOnDisconnected(onUpdate);

            // TruckTel immediately closes websockets with
            // "1000 invalid endpoint" if the URL path is not a websocket API.
            // Detect that and immediately reopen in TruckTel mode.
            if (e.code == 1000 && e.reason.trim().toLowerCase() == "invalid endpoint") {
                console.log("Detected TruckTel connection");
                isTruckTel = true;
                startTelemetry(onUpdate);
                return;
            }
            setTimeout(() => startTelemetry(onUpdate), 3000);
        };
    }

    function stopTelemetry() {
        if (socket) {
            socket.close();
            socket = null;
        }
    }

    function convertScsSdkPluginData(rawData: object): CommonTelemetryData {
        const data = rawData as TelemetryPacket;

        const name = data.game.toLowerCase();
        const gameConnected = name === "ets2" || name === "ats";

        const date = new Date(data.common.gameTime);
        const formatted = `${date.getUTCHours().toString().padStart(2, "0")}:${date
                .getUTCMinutes()
                .toString()
                .padStart(2, "0")}`;
        const day = date.toUTCString().slice(0, 3);
        const gameTimeFormatted = `${day} ${formatted}`;

        const trailerAvailable =
            data.trailers[0] &&
            data.trailers[0].position.y !== 0 &&
            data.trailers[0].position.x !== 0;

        const trailerAttached = data.trailers[0]?.attached;

        return {
            connection: {
                connectedToBridge: gameConnected,
                simDataValid: gameConnected,
                game: data.game,
            },
            nav: {
                position: data.truck.current.position,
                speedKph: data.truck.current.dashboard.speedKph,
                rawGameHeading: data.truck.current.heading,
                mapScale: data.common.mapScale,
                speedLimitKph: data.navigation.speedLimitKph,
                inGameNavDistance: data.navigation.distance,
            },
            truck: {
                brand: data.truck.constants?.brand,
                name: data.truck.constants?.name,
                trailerAvailable: trailerAvailable ?? false,
                trailerAttached: trailerAttached ?? false,
                fuel: data.truck.current.dashboard.fuelAmount,
            },
            job: {
                active: data.specialEvents.onJob,
                type: data.job.jobType,
                origin: {
                    companyName: data.job.companySource,
                    companyId: data.job.companySourceId,
                    cityName: data.job.citySource,
                    cityId: data.job.citySourceId,
                },
                destination: {
                    companyName: data.job.companyDestination,
                    companyId: data.job.companyDestinationId,
                    cityName: data.job.cityDestination,
                    cityId: data.job.cityDestinationId,
                },
                cargo: data.job.cargo?.name,
                income: data.job.income,
            },
            nextRestStopMinutes: data.common.nextRestStopMinutes,
            gameTimeFormatted: gameTimeFormatted,
        };
    }

    function convertTruckTelData(rawData: object): CommonTelemetryData {
        // After the first packet, TruckTel only sends keys that have changed.
        Object.assign(truckTelCurrentState, rawData);

        // TruckTel sends null for keys that the game has invalidated, which
        // happens  in particular for simulation state when the game has
        // paused. We prefer to use the latest known data in most cases,
        // though.
        for (const [key, value] of Object.entries(rawData)) {
            if (value !== null) {
                Object.assign(truckTelLastKnownState, {[key]: value});
            }
        }

        const simDataValid = truckTelLastKnownState.speedKph !== null && truckTelLastKnownState.speedKph !== undefined;

        // Shorthands.
        const cur = truckTelCurrentState;
        const data = truckTelLastKnownState;

        // Convert from internal SCS API game ID to normal abbreviations.
        let game = "unknown";
        if (data.game === "eut2") {
            game = "ETS2";
        } else if (data.game === "ats") {
            game = "ATS";
        }

        // Convert game time.
        const timestamp = data.timestamp ?? 0;
        const min = timestamp % 60;
        const hrs = Math.floor(timestamp / 60) % 24;
        const day = Math.floor(timestamp / 60 / 24) % 7;
        const minStr = min.toString().padStart(2, "0");
        const hrsStr = hrs.toString().padStart(2, "0");
        const dayStr = {
            0: "Mon",
            1: "Tue",
            2: "Wed",
            3: "Thu",
            4: "Fri",
            5: "Sat",
            6: "Sun",
        }[day];
        const gameTimeFormatted = `${dayStr} ${hrsStr}:${minStr}`;

        return {
            connection: {
                connectedToBridge: true, // there is no bridge
                simDataValid: simDataValid,
                game,
            },
            nav: {
                position: {
                    x: data.posX ?? 0,
                    y: data.posY ?? 0,
                    z: data.posZ ?? 0,
                },
                speedKph: data.speedKph ?? 0,
                rawGameHeading: data.rawHeading ?? 0,
                mapScale: data.scale ?? 1,
                speedLimitKph: data.speedLimitKph ?? 0,
                inGameNavDistance: data.navDist ?? 0,
            },
            truck: {
                brand: data.truckBrand ?? "",
                name: data.truckName ?? "",
                trailerAvailable: cur.trailerAttached !== null,
                trailerAttached: data.trailerAttached ?? false,
                fuel: data.fuel ?? 0,
            },
            job: {
                active: !!data.jobType,
                type: data.jobType ?? "",
                origin: {
                    companyName: data.origCompName ?? "",
                    companyId: data.origCompId ?? "",
                    cityName: data.origCityName ?? "",
                    cityId: data.origCityId ?? "",
                },
                destination: {
                    companyName: data.destCompName ?? "",
                    companyId: data.destCompId ?? "",
                    cityName: data.destCityName ?? "",
                    cityId: data.destCityId ?? "",
                },
                cargo: data.cargoName ?? "",
                income: data.income ?? 0,
            },
            nextRestStopMinutes: data.restRemain ?? 0,
            gameTimeFormatted,
        };
    }

    function processData(
        data: CommonTelemetryData,
        onUpdate?: (data: TelemetryUpdate) => void,
    ) {
        const hasInGameMarker =
            data.nav.inGameNavDistance > 100 && data.job.income === 0;

        Object.assign(gameState, {
            gameTime: data.gameTimeFormatted,
            gameConnected: data.connection.connectedToBridge,
            simDataValid: data.connection.simDataValid,
            hasInGameMarker: hasInGameMarker,
            scale: data.nav.mapScale,
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

        sendDiscordRpcState({
            game: data.connection.game,
            connected: data.connection.connectedToBridge,
            hasActiveJob,
            sourceCity: data.job.origin.cityName ?? data.job.origin.cityId,
            destinationCity: data.job.destination.cityName ?? data.job.destination.cityId,
            cargoName: data.job.cargo,
            truckBrand: data.truck.brand,
            truckName: data.truck.name,
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

        clearDiscordRpcState();

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
