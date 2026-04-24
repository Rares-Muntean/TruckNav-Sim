import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "./settingsConstants";

function getSettingsPath() {
    return path.join(app.getPath("userData"), "app-settings.json");
}

export function getSettings(): AppSettings {
    try {
        const settingsPath = getSettingsPath();
        if (existsSync(settingsPath)) {
            const saved = JSON.parse(readFileSync(settingsPath, "utf-8"));
            return { ...DEFAULT_APP_SETTINGS, ...saved };
        }
    } catch (e) {
        console.error("Failed to save settings", e);
    }

    return DEFAULT_APP_SETTINGS;
}

export function saveSettings(settings: AppSettings) {
    try {
        const settingsPath = getSettingsPath();
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error("Failed to save settings", e);
    }
}
