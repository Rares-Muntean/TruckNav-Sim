import type { AppSettings } from "../../electron/src/settingsConstants";
import { DEFAULT_APP_SETTINGS } from "../../electron/src/settingsConstants";

export interface DesktopSettings extends AppSettings {
    // other settings (that are not required in electron index.ts)
}

const settings = ref<AppSettings>(
    { ...DEFAULT_APP_SETTINGS },
    // other settings (that are not required in electron index.ts)
);

export const useDesktopSettings = () => {
    const initDesktopSettings = async () => {
        if ((window as any).electronAPI) {
            const loadedSettings = await (
                window as any
            ).electronAPI.getSettings();

            if (loadedSettings) {
                settings.value = loadedSettings;
            }
        }
    };

    const updateDesktopSetting = async <K extends keyof DesktopSettings>(
        key: K,
        value: DesktopSettings[K],
    ) => {
        settings.value[key] = value;

        if ((window as any).electronAPI) {
            const updated = await (window as any).electronAPI.updateSetting(
                key,
                value,
            );

            settings.value = updated;
        }
    };

    return {
        settings,
        initDesktopSettings,
        updateDesktopSetting,
    };
};
