import type { CapacitorElectronConfig } from "@capacitor-community/electron";
import {
    getCapacitorElectronConfig,
    setupElectronDeepLinking,
} from "@capacitor-community/electron";
import type { MenuItemConstructorOptions } from "electron";
import { app, dialog, ipcMain, MenuItem, shell } from "electron";
import electronIsDev from "electron-is-dev";
import unhandled from "electron-unhandled";
import express from "express";
import net from "net";

import {
    ElectronCapacitorApp,
    setupContentSecurityPolicy,
    setupReloadWatcher,
} from "./setup";
import path from "path";
import { spawn, spawnSync } from "child_process";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from "fs";
import * as dgram from "dgram";
import * as registry from "native-reg";

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
    new MenuItem({ label: "Quit App", role: "quit" }),
];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
    { role: process.platform === "darwin" ? "appMenu" : "fileMenu" },
    { role: "viewMenu" },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig =
    getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(
    capacitorFileConfig,
    trayMenuTemplate,
    [],
);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
    setupElectronDeepLinking(myCapacitorApp, {
        customProtocol:
            capacitorFileConfig.electron.deepLinkingCustomProtocol ??
            "mycapacitorapp",
    });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
    setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
    // Wait for electron app to be ready.
    await app.whenReady();

    startTelemetryServer();
    startWebServer();

    // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
    setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
    // Initialize our app, build windows, and load content.
    await myCapacitorApp.init();
    // Check for updates if we are in a packaged app.
    // autoUpdater.checkForUpdatesAndNotify();
})();

app.on("before-quit", function () {
    killTelemetry();
});

// Handle when all of our windows are close (platforms have their own expectations).
app.on("window-all-closed", function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// When the dock icon is clicked.
app.on("activate", async function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (myCapacitorApp.getMainWindow().isDestroyed()) {
        await myCapacitorApp.init();
    }
});

// --- Custom Functions ---

/**
 * Retrieves the local Steam installation path.
 * Defaults to the standard Program Files directory if the path cannot be located in the system registry.
 * @returns {string} The normalized steam path (e.g "C:\Games\Steam")
 */
async function getSteamPath() {
    let steamPath = "C:\\Program Files (x86)\\Steam";

    try {
        // Steam usually stores the path inside HKCU for the current user
        const key = registry.openKey(
            registry.HKCU,
            "Software\\Valve\\Steam",
            registry.Access.READ,
        );

        if (key) {
            const value = registry.getValue(key, null, "SteamPath");
            if (typeof value === "string") {
                // Ensure slashes are consistent with Windows standards
                steamPath = value.replace(/\//g, "\\");
            }

            registry.closeKey(key);
        }
    } catch (e) {
        return "C:\\Program Files (x86)\\Steam";
    }

    return steamPath;
}

ipcMain.handle("check-plugin-statuses", async () => {
    const steamRoot = await getSteamPath();
    const libraries = [steamRoot];
    const dllName = "scs-telemetry.dll";

    const vdfLocations = [
        path.join(steamRoot, "config", "libraryfolders.vdf"),
        path.join(steamRoot, "steamapps", "libraryfolders.vdf"),
    ];

    vdfLocations.forEach((vdfPath) => {
        if (existsSync(vdfPath)) {
            try {
                const content = readFileSync(vdfPath, "utf8");
                // Scan for matching paths. Find every line that has "path" + " " + "anything"
                const matches = content.match(/"path"\s+"([^"]+)"/g);
                if (matches) {
                    matches.forEach((m) => {
                        const match = m.match(/"path"\s+"([^"]+)"/);
                        if (match && match[1]) {
                            const cleanPath = match[1].replace(/\\\\/g, "\\");
                            if (!libraries.includes(cleanPath)) {
                                libraries.push(cleanPath);
                            }
                        }
                    });
                }
            } catch (e) {}
        }
    });

    const results = { ets2: false, ats: false };
    const games = [
        { key: "ets2", folder: "Euro Truck Simulator 2" },
        { key: "ats", folder: "American Truck Simulator" },
    ];

    libraries.forEach((lib) => {
        games.forEach((game) => {
            const gameBinPath = path.join(
                lib,
                lib.toLowerCase().includes("steamapps") ? "" : "steamapps",
                "common",
                game.folder,
                "bin",
                "win_x64",
            );

            const pluginFolder = path.join(gameBinPath, "plugins");
            const dllDest = path.join(pluginFolder, dllName);

            if (existsSync(gameBinPath)) {
                if (existsSync(dllDest)) {
                    results[game.key as "ets2" | "ats"] = true;
                } else {
                    try {
                        if (!existsSync(pluginFolder)) {
                            mkdirSync(pluginFolder, { recursive: true });
                        }

                        const dllSource = app.isPackaged
                            ? path.join(process.resourcesPath, "bin", dllName)
                            : path.join(app.getAppPath(), "bin", dllName);

                        if (existsSync(dllSource)) {
                            copyFileSync(dllSource, dllDest);
                            results[game.key as "ets2" | "ats"] = true;
                        } else {
                            throw new Error(`Source not found: ${dllSource}`);
                        }
                    } catch (err) {
                        console.error(
                            `[Auto-Install] Failed to copy to ${game.folder}:`,
                            err,
                        );
                    }
                }
            }
        });
    });

    return results;
});

const exeName = "TruckNavTelemetry.exe";
async function startTelemetryServer() {
    try {
        const serverPath = app.isPackaged
            ? path.join(process.resourcesPath, "bin", exeName)
            : path.join(app.getAppPath(), "bin", exeName);

        if (!existsSync(serverPath)) {
            dialog.showErrorBox(
                "DEBUG: Path Error",
                `File NOT found at:\n${serverPath}`,
            );
            return;
        }

        killTelemetry();

        const serverDir = path.dirname(serverPath);
        const flagPath = path.join(
            app.getPath("userData"),
            ".first-run-completed",
        );
        const isFirstRun = !existsSync(flagPath);

        const psCommand = `Start-Process -FilePath '${serverPath}' -WorkingDirectory '${serverDir}' -WindowStyle Hidden`;

        const logPath = path.join(
            app.getPath("userData"),
            "truck-nav-debug.txt",
        );
        writeFileSync(
            logPath,
            `Attempting to launch:\n${psCommand}\n\nPackaged: ${app.isPackaged}`,
        );

        const child = spawn(
            "powershell.exe",
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCommand],
            { shell: true },
        );

        child.stderr.on("data", (data) => {
            dialog.showErrorBox("POWERSHELL ERROR", data.toString());
        });

        if (isFirstRun) writeFileSync(flagPath, "done");
    } catch (globalError) {
        console.error("Failed to start telemetry server:", globalError);
    }
}

const killTelemetry = () => {
    console.log("[Telemetry] Cleaning up background processes...");
    try {
        spawnSync("taskkill", ["/F", "/IM", exeName, "/T"], {
            stdio: "ignore",
            windowsHide: true,
        });
    } catch (e) {}
};

const currentPort = { value: 0 };
async function startWebServer() {
    const server = express();
    currentPort.value = await getAvailablePort(8628);
    const webDir = app.isPackaged
        ? path.join(process.resourcesPath, "app.asar", "app")
        : path.join(app.getAppPath(), "app");

    server.use(express.static(webDir));

    server.get("/*splat", (_req, res) => {
        res.sendFile(path.join(webDir, "index.html"));
    });

    server.listen(currentPort.value, "0.0.0.0");
}

async function getAvailablePort(startingPort: number): Promise<number> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once("error", (err: any) => {
            if (err.code === "EADDRINUSE") {
                resolve(getAvailablePort(startingPort + 1));
            } else {
                console.error("Unexpected server error:", err);
            }
        });

        server.listen(startingPort, "0.0.0.0", () => {
            const address = server.address();
            if (address && typeof address !== "string") {
                const port = address.port;

                server.close();

                console.log(`Port ${port} confirmed available.`);
                resolve(port);
            }
        });
    });
}

/**
 * Ipc Handlers
 */
ipcMain.handle("get-local-port", () => {
    return currentPort.value;
});

ipcMain.handle("select-game-folder", async (event, gameName: string) => {
    const result = await dialog.showOpenDialog({
        title: `Select the root folder for ${gameName}.exe`,
        properties: ["openDirectory"],
        buttonLabel: "Install Plugin",
    });

    if (result.canceled) {
        return { success: false, message: "Cancelled" };
    }

    const selectedPath = result.filePaths[0];
    const pluginPath = path.join(selectedPath, "plugins");

    try {
        if (!existsSync(pluginPath)) {
            mkdirSync(pluginPath, { recursive: true });
        }

        const dllSource = app.isPackaged
            ? path.join(process.resourcesPath, "bin", "scs-telemetry.dll")
            : path.join(app.getAppPath(), "bin", "scs-telemetry.dll");

        const dllDestination = path.join(pluginPath, "scs-telemetry.dll");

        copyFileSync(dllSource, dllDestination);

        return { success: true, path: selectedPath };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle("get-local-ip", async () => {
    return new Promise((resolve) => {
        const socket = dgram.createSocket("udp4");

        socket.connect(53, "8.8.8.8", () => {
            try {
                const address = socket.address().address;
                socket.close();
                resolve(address);
            } catch (err) {
                socket.close();
                resolve("127.0.0.1");
            }
        });

        socket.on("error", () => {
            socket.close();
            resolve("127.0.0.1");
        });
    });
});

ipcMain.on("open-external", (_event, url) => {
    shell.openExternal(url);
});

ipcMain.on(
    "set-window-size",
    (_event, { width, height, resizable, maximize }) => {
        const win = myCapacitorApp.getMainWindow();

        if (!maximize) {
            win.unmaximize();
            win.setResizable(true);
            win.setSize(width, height);
            win.setResizable(resizable);
            win.center();
        } else {
            win.setResizable(true);
            win.maximize();
        }
    },
);

ipcMain.on("manual-start-server", () => {
    startTelemetryServer();
});

//#endregion
