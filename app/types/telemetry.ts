/**
 * CORE TELEMETRY PACKET
 */
export interface TelemetryPacket {
    paused: boolean;
    game: string;
    gameVersion: string;
    telemetryVersion: string;
    common: CommonData;
    truck: TruckData;
    trailers: TrailerData[];
    job: JobData;
    navigation: NavigationData;
    specialEvents: SpecialEvents;
    gamePlayEvents: GamePlayEvents;
}

/**
 * COMMON DATA CATEGORY
 */
export interface CommonData {
    mapScale: number;
    gameTime: string; // ISO Date String
    nextRestStopMinutes: number;
}

/**
 * TRUCK DATA CATEGORY
 */
export interface TruckData {
    constants: TruckConstants;
    current: TruckCurrent;
    positioning: PositionData;
}

export interface TruckConstants {
    fuelCapacity: number;
    brand: string;
    name: string;
}

export interface TruckCurrent {
    dashboard: DashboardData;
    lights: LightsData;
    damage: TruckDamageData;
    position: Vector3;
    heading: number;
    parkingBrake: boolean;
}

export interface DashboardData {
    fuelAmount: number;
    averageConsumption: number;
    fuelRange: number;
    fuelWarning: boolean;
    currentGear: number;
    speedKph: number;
    speedMph: number;
    cruiseControlSpeedKph: number;
    cruiseControlSpeedMph: number;
    cruiseControlActive: boolean;
    rpm: number;
    odometer: number;
}

export interface LightsData {
    parking: boolean;
    beamLow: boolean;
    beamHigh: boolean;
}

export interface TruckDamageData {
    engine: number;
    transmission: number;
    cabin: number;
    chassis: number;
    wheels: number;
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface PositionData {
    // Reserved for future physics/camera data
}

/**
 * TRAILER DATA CATEGORY
 */
export interface TrailerData {
    attached: boolean;
    damage: TrailerDamageData;
    position: Vector3;
    heading: number;
    brand: string;
    name: string;
}

export interface TrailerDamageData {
    cargo: number;
    wheels: number;
    chassis: number;
}

/**
 * JOB DATA CATEGORY
 */
export interface JobData {
    remainingDeliveryTime: string; // ISO Date String
    cargoLoaded: boolean;
    specialJob: boolean;
    jobType: string;
    cargo: CargoData;
    cityDestinationId: string;
    cityDestination: string;
    companyDestinationId: string;
    companyDestination: string;
    citySourceId: string;
    citySource: string;
    companySourceId: string;
    companySource: string;
    income: number; // Per your C# class definition
}

export interface CargoData {
    mass: number;
    name: string;
    cargoDamage: number;
}

/**
 * NAVIGATION DATA CATEGORY
 */
export interface NavigationData {
    distance: number;
    time: number;
    speedLimitKph: number;
    speedLimitMph: number;
}

/**
 * SPECIAL EVENTS DATA CATEGORY (Booleans for UI flags)
 */
export interface SpecialEvents {
    onJob: boolean;
    jobCancelled: boolean;
    jobDelivered: boolean;
    fined: boolean;
    tollgate: boolean;
    ferry: boolean;
    train: boolean;
}

/**
 * GAMEPLAY EVENTS DATA CATEGORY (Detailed event data)
 */
export interface GamePlayEvents {
    ferryData: TransportEvent;
    finedData: FinedEvent;
    jobCancelledPenalty: number;
    jobDelivered: Delivered;
    tollgatePayment: number;
    trainData: TransportEvent;
}

export interface TransportEvent {
    payAmount: number;
    sourceName: string;
    targetName: string;
}

export interface FinedEvent {
    payAmount: number;
    offence: string;
}

export interface Delivered {
    autoLoaded: boolean;
    autoParker: boolean;
    cargoDamage: number;
    deliveryTime: string; // ISO Date String
    distanceKm: number;
    earnedXp: number;
    revenue: number;
}
