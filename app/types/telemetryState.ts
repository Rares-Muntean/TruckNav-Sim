import type { CargoData, TruckDamageData } from "./telemetry";

export interface TelemetryUpdate {
    truck: TruckState;
    game: GameState;
    general: NavigationState;
    job: JobState;
    truckDamage: TruckDamageState;
}

export interface GameState {
    gameTime: string;
    gameConnected: boolean;
    hasInGameMarker: boolean;
    scale: number;
}

export interface TruckState {
    truckCoords: [number, number] | null;
    truckHeading: number;
    truckSpeed: number;
    averageSpeed: number;

    truckBrand: string;
    truckName: string;
    odometer: number;

    fuel: number;
    fuelCapacity: number;
    fuelRange: number;
    avgConsumption: number;
}

export interface TruckDamageState extends TruckDamageData {}

export interface NavigationState {
    speedLimit: number;
    restStoptime: string;
    restStopMinutes: number;
}

export interface JobState {
    hasActiveJob: boolean;
    income: number;

    cargo: CargoData;

    deadlineTime: Date;
    remainingTime: number;
    sourceCity: string;
    sourceCompany: string;
    destinationCity: string;
    destinationCompany: string;

    destinationCompanyName: string;
    destinationCityName: string;
    sourceCityName: string;
    sourceCompanyName: string;
}
