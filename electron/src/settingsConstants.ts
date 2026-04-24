export interface AppSettings {
    startWithWindows: boolean;
    startMinimized: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
    startWithWindows: false,
    startMinimized: false,
};
