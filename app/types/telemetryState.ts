export interface TelemetryUpdate {
    truck: TruckState;
    game: GameState;
    general: NavigationState;
    job: JobState;
}

export interface GameState {
    gameTime: string;
    gameConnected: boolean;
    simDataValid: boolean;
    hasInGameMarker: boolean;
    scale: number;
}

export interface TruckState {
    truckCoords: [number, number] | null;
    truckHeading: number;
    truckSpeed: number;
    averageSpeed: number;
}

export interface NavigationState {
    fuel: number;
    speedLimit: number;
    restStoptime: string;
    restStopMinutes: number;
}

export interface JobState {
    hasActiveJob: boolean;
    income: number;
    deadlineTime: Date;
    remainingTime: Date;
    sourceCity: string;
    sourceCompany: string;
    destinationCity: string;
    destinationCompany: string;
}
