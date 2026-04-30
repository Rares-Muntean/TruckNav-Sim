require("./rt/electron-rt");
import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings } from "./settingsConstants";
import type { DiscordRpcPayload } from "./discordRpc";

contextBridge.exposeInMainWorld("electronAPI", {
    onServerIp: (callback: (ip: string) => void) =>
        ipcRenderer.on("server-ip", (_event, value) => callback(value)),

    getLocalIP: () => ipcRenderer.invoke("get-local-ip"),
    getLocalPort: () => ipcRenderer.invoke("get-local-port"),
    openExternal: (url: string) => ipcRenderer.send("open-external", url),
    selectGameFolder: (gameName: string) =>
        ipcRenderer.invoke("select-game-folder", gameName),
    checkPluginStatuses: () => ipcRenderer.invoke("check-plugin-statuses"),

    setWindowSize: (
        width: number,
        height: number,
        resizable: boolean,
        maximize: boolean,
    ) =>
        ipcRenderer.send("set-window-size", {
            width,
            height,
            resizable,
            maximize,
        }),

    manualStartServer: () => ipcRenderer.send("manual-start-server"),

    updateDiscordRpc: (payload: DiscordRpcPayload) =>
        ipcRenderer.send("update-discord-rpc", payload),
    clearDiscordRpc: () => ipcRenderer.send("clear-discord-rpc"),

    getSettings: () => ipcRenderer.invoke("get-settings"),
    updateSetting: (key: keyof AppSettings, value: any) =>
        ipcRenderer.invoke("update-setting", key, value),
});
