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
import { execSync, spawn } from "child_process";
import { existsSync, writeFileSync } from "fs";

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

app.on("before-quit", () => {
    killTelemetryServer();
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

/**
 * Custom Functions
 */
async function startTelemetryServer() {
    try {
        const exeName = "Ets2Telemetry.exe";
        const serverPath = app.isPackaged
            ? path.join(process.resourcesPath, "telemetry-server", exeName)
            : path.join(app.getAppPath(), "bin", "telemetry-server", exeName);

        if (!existsSync(serverPath)) {
            dialog.showErrorBox(
                "DEBUG: Path Error",
                `File NOT found at:\n${serverPath}`,
            );
            return;
        }

        try {
            const running = execSync(
                `tasklist /FI "IMAGENAME eq ${exeName}" /NH`,
            ).toString();
            if (running.toLowerCase().includes(exeName.toLowerCase())) return;
        } catch (e) {}

        const serverDir = path.dirname(serverPath);
        const flagPath = path.join(
            app.getPath("userData"),
            ".first-run-completed",
        );
        const isFirstRun = !existsSync(flagPath);

        const style = isFirstRun ? "Normal" : "Minimized";

        const psCommand = `Start-Process -FilePath '${serverPath}' -WorkingDirectory '${serverDir}' -WindowStyle ${style}`;

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

function killTelemetryServer() {
    const exeName = "Ets2Telemetry.exe";
    try {
        execSync(`taskkill /F /IM ${exeName} /T`, { stdio: "ignore" });
        console.log("Telemetry server killed.");
    } catch (e) {}
}

const currentPort = { value: 0 };
async function startWebServer() {
    const server = express();
    currentPort.value = await getAvailablePort(8628);
    const webDir = app.isPackaged
        ? path.join(process.resourcesPath, "app.asar", "app")
        : path.join(app.getAppPath(), "app");

    server.get("/api/ets2", async (_req, res) => {
        var response = await fetchTelemetry("localhost");
        if (response) {
            const wrappedResponse = {
                connected: true,
                telemetry: response,
            };
            res.json(wrappedResponse);
        } else {
            res.json({ connected: false, telemetry: null });
        }
    });

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

async function fetchTelemetry(ip: string | "localhost") {
    try {
        const response = await fetch(`http://${ip}:25555/api/ets2/telemetry`);
        if (!response.ok) {
            console.warn(
                `Telemetry fetch failed with status ${response.status}: ${response.statusText}`,
            );

            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Ipc Handlers
 */
ipcMain.handle("get-local-port", () => {
    return currentPort.value;
});

const dgram = require("dgram");
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

ipcMain.handle("fetch-telemetry", async (_event, ip) => {
    return await fetchTelemetry(ip);
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

ipcMain.handle("check-server-status", () => {
    const exeName = "Ets2Telemetry.exe";

    try {
        const runningProcesses = execSync(
            `tasklist /FI "IMAGENAME eq ${exeName}" /NH`,
        ).toString();

        return runningProcesses.includes(exeName);
    } catch (err) {
        return false;
    }
});

ipcMain.on("manual-start-server", () => {
    startTelemetryServer();
});
