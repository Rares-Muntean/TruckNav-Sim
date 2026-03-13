import { defineNitroPlugin } from "#imports";
import { spawn, execSync, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const REPO_URL = "https://github.com/Funbit/ets2-telemetry-server.git";
const FOLDER_NAME = "ets2-telemetry-server";
const EXE_NAME = "Ets2Telemetry.exe";

export default defineNitroPlugin((nitroApp) => {
    const rootDir = process.cwd();
    const serverDir = path.join(rootDir, FOLDER_NAME);
    const serverExeDir = path.join(serverDir, "server");
    const serverExePath = path.join(serverExeDir, EXE_NAME);

    if (!existsSync(serverDir)) {
        console.log(`[Auto-Setup] Cloning ${REPO_URL}...`);
        try {
            execSync(`git clone ${REPO_URL}`, {
                stdio: "ignore",
                cwd: rootDir,
            });
            const gitFolder = path.join(serverDir, ".git");
            if (existsSync(gitFolder))
                rmSync(gitFolder, { recursive: true, force: true });
        } catch (e) {
            console.error("Failed to clone telemetry server.");
            return;
        }
    }

    const killTelemetry = () => {
        console.log("[Telemetry] Cleaning up background processes...");
        try {
            spawnSync("taskkill", ["/F", "/IM", EXE_NAME, "/T"], {
                stdio: "ignore",
            });
        } catch (e) {}
    };

    const isAppRunning = () => {
        try {
            const stdout = execSync(
                `tasklist /FI "IMAGENAME eq ${EXE_NAME}" /NH`,
            ).toString();
            return stdout.toLowerCase().includes(EXE_NAME.toLowerCase());
        } catch (e) {
            return false;
        }
    };

    if (!isAppRunning() && existsSync(serverExePath)) {
        console.log(`[Telemetry] Starting background process...`);
        const child = spawn(EXE_NAME, [], {
            cwd: serverExeDir,
            detached: true,
            stdio: "ignore",
            windowsHide: true,
        });
        child.unref();
    }

    nitroApp.hooks.hook("close", killTelemetry);
});
