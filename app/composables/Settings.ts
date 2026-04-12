import { AppSettings } from "~/constants/appSettings";
import type { GameType } from "~/types";

export type UnitSystem = "metric" | "imperial";
export type TextTheme = "light" | "dark";

export interface GameProfile {
    themeColor: string;
    textColor: TextTheme;
    routeColor: string;
    units: UnitSystem;
    ownedDlcs: number[];
    lastDestination: [number, number] | null;
}

export interface AppSettingsState {
    selectedGame: GameType;
    savedIP: string | null;
    profiles: {
        ets2: GameProfile;
        ats: GameProfile;
    };
    hasTurnNavigation: boolean;
}

const DEFAULT_PROFILE: GameProfile = {
    themeColor: AppSettings.theme.defaultColor,
    textColor: "light",
    routeColor: "#22d3ee",
    units: "metric",
    ownedDlcs: Array.from({ length: 10 }, (_, i) => i + 1),
    lastDestination: null,
};

const DEFAULT_SETTINGS: AppSettingsState = {
    selectedGame: null,
    savedIP: null,
    profiles: {
        ets2: { ...DEFAULT_PROFILE, themeColor: "#fbc02d", units: "metric" },
        ats: {
            ...DEFAULT_PROFILE,
            themeColor: "#d32f2f",
            ownedDlcs: Array.from({ length: 16 }, (_, i) => i + 1),
            units: "imperial",
        },
    },
    hasTurnNavigation: true,
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
        settings.value = { ...DEFAULT_SETTINGS };
        saveSettings();
    };

    return {
        settings,
        activeSettings,
        updateGlobal,
        updateProfile,
        initSettings,
        resetSettings,
    };
};
