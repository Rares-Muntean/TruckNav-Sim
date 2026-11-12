import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";
import { CapacitorZip } from "@capgo/capacitor-zip";
import { Capacitor } from "@capacitor/core";
import axios from "axios";

const { isElectron, isWeb } = usePlatform();

async function getBaseUrl() {
    if (isElectron.value && (window as any).electronAPI) {
        const port = await (window as any).electronAPI.getLocalPort();
        return `http://127.0.0.1:${port}`;
    }
    if (process.dev) {
        return `http://localhost:8628`;
    }
    return "";
}

export async function downloadMapData(
    mapName: string,
    urls: string[],
    onProgress?: (percent: number) => void,
): Promise<boolean> {
    const urlList = urls;

    try {
        for (let i = 0; i < urlList.length; i++) {
            const currentUrl = urlList[i];
            if (!currentUrl) continue;

            const success = await attemptDownload(
                mapName,
                currentUrl,
                onProgress,
            );
            if (success) {
                return true;
            }

            console.warn(
                `Mirror failed: ${currentUrl}. Trying next fallback...`,
            );
        }
    } catch (e) {
        console.error("[MAP DOWNLOAD ERROR]: All download mirrors failed: ", e);
        return false;
    }

    return false;
}

/**
 * Downloads and extracts data into Directory.Data/maps
 * @param mapName: Name of the map directory (e.g ets2, ats)
 * @param zipUrl: URL of the zip archive to download
 * @param onProgress: Optional callback that receives download progress as a percentage
 */
export async function attemptDownload(
    mapName: string,
    zipUrl: string,
    onProgress?: (percent: number) => void,
) {
    if (isElectron.value) {
        if (onProgress) {
            (window as any).electronAPI.onMapProgress((pct: number) => {
                onProgress(pct);
            });
        }

        return await (window as any).electronAPI.downloadMap(mapName, zipUrl);
    }

    if (isWeb.value || process.dev) {
        try {
            const base = await getBaseUrl();
            const progressInterval = setInterval(async () => {
                const res = await axios.get(`${base}/api/download-progress`);
                if (onProgress) onProgress(res.data.progress);
            }, 500);

            const res = await axios.post(`${base}/api/download-map`, {
                mapId: mapName,
                url: zipUrl,
            });
            clearInterval(progressInterval);
            if (res.data?.success) {
                if (onProgress) onProgress(100);
                return true;
            }
            return false;
        } catch (webErr: any) {
            console.error("[DEBUG] Web download failed:", webErr);
            return false;
        }
    }

    const zipPath = `maps/${mapName}.zip`;
    const extractPath = `maps/${mapName}`;

    try {
        try {
            await Filesystem.mkdir({
                path: "maps",
                directory: Directory.Data,
                recursive: true,
            });
        } catch (dirError) {
            console.log(`[DEBUG] Note on maps dir:`, dirError);
        }

        const zipUri = await Filesystem.getUri({
            path: zipPath,
            directory: Directory.Data,
        });

        const extractUri = await Filesystem.getUri({
            path: extractPath,
            directory: Directory.Data,
        });

        FileTransfer.addListener("progress", (progress) => {
            const total = progress.contentLength || 0;
            let percent = 0;

            if (total > 0) {
                percent = Math.round((progress.bytes / total) * 100);
            } else {
                percent = -1;
            }

            if (onProgress) onProgress(percent);
        });

        await FileTransfer.downloadFile({
            url: zipUrl,
            path: zipUri.uri,
            progress: true,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Accept-Encoding": "identity",
            },
        });

        // Extracting
        const nativeZipPath = zipUri.uri.replace("file://", "");
        const nativeExtractPath = extractUri.uri.replace("file://", "");

        if (Capacitor.getPlatform() === "electron") {
        } else {
            await CapacitorZip.unzip({
                source: nativeZipPath,
                destination: nativeExtractPath,
            });
        }

        await Filesystem.deleteFile({
            path: zipPath,
            directory: Directory.Data,
        });

        return true;
    } catch (e: any) {
        await Filesystem.deleteFile({
            path: zipPath,
            directory: Directory.Data,
        }).catch(() => {});

        console.error(
            "[DEBUG] FATAL ERROR during mobile download/extract: ",
            e,
        );
        if (e.message) console.error("[DEBUG] Error message:", e.message);
        if (e.stack) console.error("[DEBUG] Error stack:", e.stack);
        return false;
    }
}

/**
 * Checks if map is downloaded in Directory.Data/maps folder
 * @param mapName: Name of the map directory (e.g ets2, ats)
 */
export async function isMapDownloaded(mapName: string): Promise<boolean> {
    if (isElectron.value) {
        return await (window as any).electronAPI.checkMap(mapName);
    }

    if (isWeb.value || process.dev) {
        try {
            const base = await getBaseUrl();
            const res = await axios.get(`${base}/api/map-status/${mapName}`);
            return res.data.downloaded;
        } catch {
            return false;
        }
    }

    const extractPath = `maps/${mapName}`;
    try {
        const stat = await Filesystem.stat({
            path: extractPath,
            directory: Directory.Data,
        });
        return stat.type === "directory";
    } catch (e) {
        return false;
    }
}

/**
 * Gets a list of all downloaded maps
 */
export async function getDownloadedMaps(): Promise<string[]> {
    if (isWeb.value) return [];

    if (isElectron.value) {
        return await (window as any).electronAPI.getDownloadedMaps();
    }

    try {
        const result = await Filesystem.readdir({
            path: "maps",
            directory: Directory.Data,
        });

        return result.files
            .filter((file) => file.type === "directory")
            .map((file) => file.name);
    } catch (e) {
        return [];
    }
}

/**
 * Uninstalls a map data folder in case the user doesn't want to have it anymore
 * @param mapName: Name of the map directory (e.g ets2, ats)
 */
export async function uninstallMapData(mapName: string): Promise<boolean> {
    if (isElectron.value) {
        return await (window as any).electronAPI.uninstallMap(mapName);
    }

    if (isWeb.value || process.dev) {
        try {
            const base = await getBaseUrl();
            const res = await axios.post(`${base}/api/uninstall-map`, {
                mapId: mapName,
            });
            return res.data.success;
        } catch {
            return false;
        }
    }

    const extractPath = `maps/${mapName}`;
    try {
        await Filesystem.rmdir({
            path: extractPath,
            directory: Directory.Data,
            recursive: true,
        });

        return true;
    } catch (e) {
        console.log(`Failed to uninstall map data for ${mapName}: `, e);
        return false;
    }
}

/**
 * Safely get the URL for a downloaded map file.
 * Returns the local device file if downloaded, otherwise falls back to /public/ folder.
 * @param mapName: Name of the map directory (e.g. ets2, ats)
 * @param fileName: Filename to load (e.g. roadnetwork/graph.bin)
 */
export async function getMapFileUrl(
    mapName: string,
    fileName: string,
): Promise<string> {
    if (isElectron.value) {
        const port = await (window as any).electronAPI.getLocalPort();
        return `http://127.0.0.1:${port}/maps/${mapName}/${fileName}`;
    }

    if (isWeb.value || process.dev) {
        const base = await getBaseUrl();
        return `${base}/maps/${mapName}/${fileName}`;
    }

    const localPath = `maps/${mapName}/${fileName}`;
    try {
        await Filesystem.stat({
            path: localPath,
            directory: Directory.Data,
        });

        const uri = await Filesystem.getUri({
            path: localPath,
            directory: Directory.Data,
        });

        return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
        console.log("Failed to get downloaded map file: ", e);
        return `https://trucknavapp.com/data/${mapName}/${fileName}`;
    }
}
