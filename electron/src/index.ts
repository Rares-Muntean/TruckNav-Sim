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
import { spawn, spawnSync, ChildProcess } from "child_process";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    createWriteStream,
} from "fs";
import * as dgram from "dgram";
import * as registry from "native-reg";

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
    new MenuItem({
        label: "Show App",
        click: () => {
            const win = myCapacitorApp.getMainWindow();
            if (win) win.show();
        },
    }),

    new MenuItem({ type: "separator" }),

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

app.on("browser-window-created", (_, window) => {
    window.on("close", (event: Electron.Event) => {
        if (!(app as any).isQuitting) {
            event.preventDefault();
            window.hide(); // Hide to tray instead of closing
        }
    });
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        const win = myCapacitorApp.getMainWindow();
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
            win.show();
        }
    });

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
}

app.on("before-quit", function () {
    (app as any).isQuitting = true;
    killTelemetry();
});

// Handle when all of our windows are close (platforms have their own expectations).
app.on("window-all-closed", function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
});

// When the dock icon is clicked.
app.on("activate", async function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    const win = myCapacitorApp.getMainWindow();
    if (win && win.isDestroyed()) {
        await myCapacitorApp.init();
    } else if (win) {
        win.show();
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

const exeName = "TruckNavTelemetry.exe";
let telemetryProcess: ChildProcess | null = null;

async function startTelemetryServer() {
    try {
        const serverPath = app.isPackaged
            ? path.join(process.resourcesPath, "bin", exeName)
            : path.join(app.getAppPath(), "bin", exeName);

        if (!existsSync(serverPath)) {
            dialog.showErrorBox(
                "DEBUG: Path Error",
                `Telemetry .exe NOT found at:\n${serverPath}`,
            );
            return;
        }

        killTelemetry();
        const serverDir = path.dirname(serverPath);

        const logPath = path.join(
            app.getPath("userData"),
            "telemetry-crash-log.txt",
        );
        const logStream = createWriteStream(logPath, { flags: "a" });

        logStream.write(`\n\n--- App Boot: ${new Date().toISOString()} ---\n`);
        logStream.write(`Path: ${serverPath}\nPackaged: ${app.isPackaged}\n\n`);

        telemetryProcess = spawn(serverPath, [], {
            cwd: serverDir,
            windowsHide: true,
        });

        telemetryProcess.stdout?.pipe(logStream);
        telemetryProcess.stderr?.pipe(logStream);

        telemetryProcess.on("error", (err: any) => {
            logStream.write(
                `[FATAL ERROR]: Failed to start process: ${err.message}\n`,
            );
        });

        telemetryProcess.on("close", (code: number) => {
            logStream.write(
                `[INFO]: Server process exited with code ${code}\n`,
            );
            telemetryProcess = null;
        });
    } catch (globalError) {
        console.error("Failed to start telemetry server:", globalError);
    }
}

const killTelemetry = () => {
    console.log("[Telemetry] Cleaning up background processes...");

    if (telemetryProcess) {
        try {
            telemetryProcess.kill();
        } catch (e) {}
        telemetryProcess = null;
    }

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
                        }
                    } catch (err) {}
                }
            }
        });
    });

    return results;
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

        if (win) {
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
        }
    },
);

ipcMain.on("manual-start-server", () => {
    startTelemetryServer();
});
