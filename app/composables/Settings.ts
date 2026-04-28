import type { GameType } from "~/types";

export type UnitSystem = "metric" | "imperial";
export type TextTheme = "light" | "dark";
export type UiComponent =
    | "speed"
    | "fuel"
    | "sleep"
    | "time"
    | "speedLimit"
    | "topBar";
export type ActiveComponents = UiComponent[];
export type LocaleCode = "en" | "de";

export interface GameProfile {
    themeColor: string;
    textColor: TextTheme;
    routeColor: string;
    units: UnitSystem;
    ownedDlcs: number[];
    lastDestination: [number, number] | null;
    hasTurnNavigation: boolean;
    fontFamily: string;
}

export interface AppSettingsState {
    selectedGame: GameType;
    savedIP: string | null;
    profiles: {
        ets2: GameProfile;
        ats: GameProfile;
    };
    hudBtnSize: number;
    truckMarkerSize: number;
    compactTripFontSize: number;
    activeUiComponents: ActiveComponents;
    locale: LocaleCode;
}

const DEFAULT_PROFILE: GameProfile = {
    themeColor: "#fbc02d",
    textColor: "light",
    routeColor: "#22d3ee",
    units: "metric",
    ownedDlcs: Array.from({ length: 10 }, (_, i) => i + 1),
    lastDestination: null,
    hasTurnNavigation: true,
    fontFamily: "Commissioner",
};

const DEFAULT_SETTINGS: AppSettingsState = {
    selectedGame: null,
    savedIP: null,
    profiles: {
        ets2: {
            ...DEFAULT_PROFILE,
            themeColor: "#fbc02d",
            textColor: "dark",
            units: "metric",
        },
        ats: {
            ...DEFAULT_PROFILE,
            themeColor: "#d32f2f",
            ownedDlcs: Array.from({ length: 16 }, (_, i) => i + 1),
            units: "imperial",
        },
    },
    hudBtnSize: 30,
    truckMarkerSize: 40,
    compactTripFontSize: 1.8,
    activeUiComponents: [
        "speed",
        "speedLimit",
        "fuel",
        "time",
        "sleep",
        "topBar",
    ],
    locale: "en",
};

const STORAGE_KEY = "truck-nav-settings";

export const useSettings = () => {
    const settings = useState<AppSettingsState>("app-settings", () => ({
        ...DEFAULT_SETTINGS,
    }));

    const activeSettings = computed(() => {
        const game = settings.value.selectedGame || "ets2";
        return settings.value.profiles[game as "ets2" | "ats"];
    });

    const applySideEffects = () => {
        document.documentElement.style.setProperty(
            "--theme-color",
            activeSettings.value.themeColor,
        );

        const isLight = activeSettings.value.textColor === "light";

        document.documentElement.style.setProperty(
            "--main-text-color",
            isLight ? "#f2f2f2" : "#333",
        );

        document.documentElement.style.setProperty(
            "--app-font",
            activeSettings.value.fontFamily,
        );

        document.documentElement.style.setProperty(
            "--hud-btn-size",
            `${settings.value.hudBtnSize}px`,
        );

        document.documentElement.style.setProperty(
            "--compact-trip-size",
            `${settings.value.compactTripFontSize}rem`,
        );

        document.documentElement.style.setProperty(
            "--top-bar-height",
            !settings.value.activeUiComponents.includes("topBar")
                ? "0px"
                : "40px",
        );
    };

    const saveSettings = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
        applySideEffects();
    };

    const updateGlobal = <K extends keyof Omit<AppSettingsState, "profiles">>(
        key: K,
        value: AppSettingsState[K],
    ) => {
        (settings.value as any)[key] = value;
        saveSettings();
    };

    const updateProfile = <K extends keyof GameProfile>(
        key: K,
        value: GameProfile[K],
    ) => {
        const game = settings.value.selectedGame || "ets2";
        (settings.value.profiles[game as "ets2" | "ats"] as any)[key] = value;
        saveSettings();
    };

    const initSettings = () => {
        const savedString = localStorage.getItem(STORAGE_KEY);

        if (savedString) {
            try {
                const parsed = JSON.parse(savedString);
                settings.value = { ...DEFAULT_SETTINGS, ...parsed };
            } catch (e) {
                console.error("Corrupt settings found, resetting to defaults.");
                settings.value = { ...DEFAULT_SETTINGS };
            }
        } else {
            settings.value = { ...DEFAULT_SETTINGS };
        }

        applySideEffects();
    };

    const resetSettings = () => {
        const game = settings.value.selectedGame || "ets2";

        const currentDest = settings.value.profiles[game].lastDestination;

        const freshProfile = JSON.parse(
            JSON.stringify(DEFAULT_SETTINGS.profiles[game]),
        );
        freshProfile.lastDestination = currentDest;

        settings.value.hudBtnSize = DEFAULT_SETTINGS.hudBtnSize;
        settings.value.truckMarkerSize = DEFAULT_SETTINGS.truckMarkerSize;
        settings.value.compactTripFontSize =
            DEFAULT_SETTINGS.compactTripFontSize;

        settings.value.activeUiComponents = [
            ...DEFAULT_SETTINGS.activeUiComponents,
        ];

        settings.value.profiles[game] = freshProfile;

        saveSettings();
    };

    return {
        settings,
        activeSettings,
        DEFAULT_SETTINGS,
        updateGlobal,
        updateProfile,
        initSettings,
        resetSettings,
    };
};
