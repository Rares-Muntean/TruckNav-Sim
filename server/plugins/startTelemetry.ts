import { defineNitroPlugin } from "#imports";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const EXE_NAME = "TruckNavTelemetry.exe";

export default defineNitroPlugin((nitroApp) => {
    const rootDir = process.cwd();
    const serverExeDir = path.join(rootDir, "electron", "bin");
    const serverExePath = path.join(serverExeDir, EXE_NAME);

    const killTelemetry = () => {
        console.log("[Telemetry] Cleaning up background processes...");
        try {
            spawnSync("taskkill", ["/F", "/IM", EXE_NAME, "/T"], {
                stdio: "ignore",
                windowsHide: true,
            });
        } catch (e) {}
    };

    const isAppRunning = () => {
        try {
            const res = spawnSync(
                "tasklist",
                ["/FI", `IMAGENAME eq ${EXE_NAME}`, "/NH"],
                {
                    windowsHide: true,
                },
            );
            return res.stdout
                .toString()
                .toLowerCase()
                .includes(EXE_NAME.toLowerCase());
        } catch (e) {
            return false;
        }
    };

    if (existsSync(serverExePath)) {
        if (!isAppRunning()) {
            console.log(
                `[Telemetry] Launching separate window via PowerShell...`,
            );

            const psCommand = `Start-Process -FilePath '${serverExePath}' -WorkingDirectory '${serverExeDir}' -WindowStyle Normal`;

            const child = spawn(
                "powershell.exe",
                [
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    psCommand,
                ],
                {
                    shell: true,
                    detached: true,
                    stdio: "ignore",
                },
            );

            child.unref();
        } else {
            console.log(`[Telemetry] Process is already running.`);
        }
    } else {
        console.error(`[Telemetry] EXE not found at: ${serverExePath}`);
    }

    nitroApp.hooks.hook("close", killTelemetry);
});
