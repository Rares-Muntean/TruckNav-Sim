import { AppSettings } from "~~/shared/constants/appSettings";

export interface AppSettingsState {
    themeColor: string;
    routeColor: string;
    ownedDlcs: number[];
}

const DEFAULT_SETTINGS: AppSettingsState = {
    themeColor: AppSettings.theme.defaultColor,
    routeColor: "#22d3ee",
    ownedDlcs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

const STORAGE_KEY = "truck-nav-settings";

export const useSettings = () => {
    const settings = useState<AppSettingsState>("app-settings", () => ({
        ...DEFAULT_SETTINGS,
    }));

    const applySideEffects = () => {
        document.documentElement.style.setProperty(
            "--theme-color",
            settings.value.themeColor,
        );
    };

    const saveSettings = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
        applySideEffects();
    };

    const updateSettings = <K extends keyof AppSettingsState>(
        key: K,
        value: AppSettingsState[K],
    ) => {
        settings.value[key] = value;
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

    return { settings, updateSettings, initSettings, resetSettings };
};
