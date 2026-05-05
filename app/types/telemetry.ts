//-----------------------------------------------------------------------------
// RenCloud's SCS SDK plugin
//-----------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------
// TruckTel
//-----------------------------------------------------------------------------

// Delta-coded: missing key means unchanged from previous packet, null is used
// to invalidate.
export interface TruckTelPacket {
    game?: "eut2" | "ats";
    posX?: number | null;
    posY?: number | null;
    posZ?: number | null;
    speedKph?: number | null;
    rawHeading?: number | null;
    scale?: number | null;
    speedLimitKph?: number | null;
    navDist?: number | null;
    truckBrand?: string | null;
    truckName?: string | null;
    trailerAttached?: boolean | null;
    fuel?: number | null;
    jobType?: string | null;
    origCompId?: string | null;
    origCompName?: string | null;
    origCityId?: string | null;
    origCityName?: string | null;
    destCompId?: string | null;
    destCompName?: string | null;
    destCityId?: string | null;
    destCityName?: string | null;
    cargoName?: string | null;
    income?: number | null;
    restRemain?: number | null;
    timestamp?: number | null;
}

//-----------------------------------------------------------------------------
// Common intermediate representation
//-----------------------------------------------------------------------------

export interface CommonConnection {
    connectedToBridge: boolean;
    simDataValid: boolean;
    game: string, // ETS2, ATS, or something like "disconnected" probably
}

export interface CommonNavInfo {
    position: Vector3,
    speedKph: number,
    rawGameHeading: number,
    mapScale: number,
    speedLimitKph: number,
    inGameNavDistance: number,
}

export interface CommonTruckInfo {
    brand: string,
    name: string,
    trailerAvailable: boolean,
    trailerAttached: boolean,
    fuel: number,
}

export interface CommonCompany {
    companyName: string;
    companyId: string;
    cityName: string;
    cityId: string;
}

export interface CommonJobInfo {
    active: boolean,
    type: string,
    origin: CommonCompany,
    destination: CommonCompany,
    cargo: string,
    income: number,
}

export interface CommonTelemetryData {
    connection: CommonConnection,
    nav: CommonNavInfo,
    job: CommonJobInfo,
    truck: CommonTruckInfo,
    gameTimeFormatted: string,
    nextRestStopMinutes: number,
}