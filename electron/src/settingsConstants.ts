export interface AppSettings {
    startWithWindows: boolean;
    startMinimized: boolean;
    rpcEnabled: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
    startWithWindows: false,
    startMinimized: false,
    rpcEnabled: true,
};
