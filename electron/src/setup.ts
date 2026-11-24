import type { CapacitorElectronConfig } from "@capacitor-community/electron";
import {
    CapElectronEventEmitter,
    CapacitorSplashScreen,
    setupCapacitorElectronPlugins,
} from "@capacitor-community/electron";
import chokidar from "chokidar";
import type { MenuItemConstructorOptions } from "electron";
import {
    app,
    BrowserWindow,
    Menu,
    MenuItem,
    nativeImage,
    Tray,
    session,
} from "electron";
import electronIsDev from "electron-is-dev";
import electronServe from "electron-serve";
import windowStateKeeper from "electron-window-state";
import { join } from "path";

// Define components for a watcher to detect when the webapp is changed so we can reload in Dev mode.
const reloadWatcher: {
    debouncer: NodeJS.Timeout | null;
    ready: boolean;
    watcher: chokidar.FSWatcher | null;
} = {
    debouncer: null,
    ready: false,
    watcher: null,
};

export function setupReloadWatcher(
    electronCapacitorApp: ElectronCapacitorApp,
): void {
    reloadWatcher.watcher = chokidar
        .watch(join(app.getAppPath(), "app"), {
            ignored: /[/\\]\./,
            persistent: true,
        })
        .on("ready", () => {
            reloadWatcher.ready = true;
        })
        .on("all", (_event, _path) => {
            if (reloadWatcher.ready) {
                if (reloadWatcher.debouncer)
                    clearTimeout(reloadWatcher.debouncer);
                reloadWatcher.debouncer = setTimeout(async () => {
                    const win = electronCapacitorApp.getMainWindow();
                    if (win) win.webContents.reload();

                    reloadWatcher.ready = false;
                    if (reloadWatcher.debouncer)
                        clearTimeout(reloadWatcher.debouncer);
                    reloadWatcher.debouncer = null;
                    reloadWatcher.watcher = null;
                    setupReloadWatcher(electronCapacitorApp);
                }, 1500);
            }
        });
}

// Define our class to manage our app.
export class ElectronCapacitorApp {
    private MainWindow: BrowserWindow | null = null;
    private SplashScreen: CapacitorSplashScreen | null = null;
    private TrayIcon: Tray | null = null;
    private CapacitorFileConfig: CapacitorElectronConfig;
    private TrayMenuTemplate: (MenuItem | MenuItemConstructorOptions)[] = [
        new MenuItem({ label: "Quit App", role: "quit" }),
    ];
    private AppMenuBarMenuTemplate: (MenuItem | MenuItemConstructorOptions)[] =
        [
            { role: process.platform === "darwin" ? "appMenu" : "fileMenu" },
            { role: "viewMenu" },
        ];
    private mainWindowState: windowStateKeeper.State | null = null;
    private loadWebApp: (window: BrowserWindow) => Promise<void>;
    private customScheme: string;

    constructor(
        capacitorFileConfig: CapacitorElectronConfig,
        trayMenuTemplate?: (MenuItemConstructorOptions | MenuItem)[],
        appMenuBarMenuTemplate?: (MenuItemConstructorOptions | MenuItem)[],
    ) {
        this.CapacitorFileConfig = capacitorFileConfig;

        this.customScheme =
            this.CapacitorFileConfig.electron?.customUrlScheme ??
            "capacitor-electron";

        if (trayMenuTemplate) {
            this.TrayMenuTemplate = trayMenuTemplate;
        }

        if (appMenuBarMenuTemplate) {
            this.AppMenuBarMenuTemplate = appMenuBarMenuTemplate;
        }

        // Setup our web app loader
        this.loadWebApp = electronServe({
            directory: join(app.getAppPath(), "app"),
            scheme: this.customScheme,
        });
    }

    // Helper function to load in the app.
    private async loadMainWindow(thisRef: ElectronCapacitorApp) {
        if (thisRef.MainWindow) {
            await thisRef.loadWebApp(thisRef.MainWindow);
        }
    }

    // Expose the mainWindow ref for use outside of the class.
    getMainWindow(): BrowserWindow | null {
        return this.MainWindow;
    }

    getTray(): Tray | null {
        return this.TrayIcon;
    }

    getCustomURLScheme(): string {
        return this.customScheme;
    }

    async init(): Promise<void> {
        const icon = nativeImage.createFromPath(
            join(
                app.getAppPath(),
                "assets",
                process.platform === "win32"
                    ? "TruckNavIconOutline.ico"
                    : "TruckNavIconOutline.png",
            ),
        );

        this.mainWindowState = windowStateKeeper({
            defaultWidth: 1000,
            defaultHeight: 800,
        });

        const preloadPath = join(
            app.getAppPath(),
            "build",
            "src",
            "preload.js",
        );

        this.MainWindow = new BrowserWindow({
            icon,
            show: false,
            x: this.mainWindowState.x,
            y: this.mainWindowState.y,
            width: this.mainWindowState.width,
            height: this.mainWindowState.height,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: true,
                preload: preloadPath,
                backgroundThrottling: false,
            },
        });

        this.mainWindowState.manage(this.MainWindow);

        const win = this.MainWindow; // Local reference for easier null checking

        if (this.CapacitorFileConfig.electron?.backgroundColor) {
            win.setBackgroundColor(
                this.CapacitorFileConfig.electron.backgroundColor,
            );
        }

        // If we close the main window with the splashscreen enabled we need to destroy the ref.
        win.on("closed", () => {
            const splashWin = this.SplashScreen?.getSplashWindow();
            if (splashWin && !splashWin.isDestroyed()) {
                splashWin.close();
            }
        });

        // The tray is always enabled
        const trayIconPath = join(
            app.getAppPath(),
            "assets",
            process.platform === "win32"
                ? "TruckNavIconOutline.ico"
                : "TruckNavIconOutline.png",
        );

        this.TrayIcon = new Tray(nativeImage.createFromPath(trayIconPath));

        this.TrayIcon.on("click", () => {
            if (this.MainWindow) {
                this.MainWindow.show();
                this.MainWindow.focus();
            }
        });

        this.TrayIcon.setToolTip(app.getName());
        this.TrayIcon.setContextMenu(
            Menu.buildFromTemplate(this.TrayMenuTemplate),
        );

        Menu.setApplicationMenu(
            Menu.buildFromTemplate(this.AppMenuBarMenuTemplate),
        );

        if (this.CapacitorFileConfig.electron?.splashScreenEnabled) {
            this.SplashScreen = new CapacitorSplashScreen({
                imageFilePath: join(
                    app.getAppPath(),
                    "assets",
                    this.CapacitorFileConfig.electron?.splashScreenImageName ??
                        "splash.png",
                ),
                windowWidth: 400,
                windowHeight: 400,
            });
            this.SplashScreen.init(this.loadMainWindow, this);
        } else {
            this.loadMainWindow(this);
        }

        // Security
        win.webContents.setWindowOpenHandler((details) => {
            if (!details.url.includes(this.customScheme)) {
                return { action: "deny" };
            } else {
                return { action: "allow" };
            }
        });

        win.webContents.on("will-navigate", (event, _newURL) => {
            if (!win.webContents.getURL().includes(this.customScheme)) {
                event.preventDefault();
            }
        });

        setupCapacitorElectronPlugins();

        win.webContents.on("dom-ready", () => {
            if (this.CapacitorFileConfig.electron?.splashScreenEnabled) {
                this.SplashScreen?.getSplashWindow()?.hide();
            }
            if (!this.CapacitorFileConfig.electron?.hideMainWindowOnLaunch) {
                win.show();
            }
            setTimeout(() => {
                if (electronIsDev) {
                    win.webContents.openDevTools();
                }
                CapElectronEventEmitter.emit(
                    "CAPELECTRON_DeeplinkListenerInitialized",
                    "",
                );
            }, 400);
        });
    }
}

// Set a CSP up for our application based on the custom scheme
export function setupContentSecurityPolicy(customScheme: string): void {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const policy = electronIsDev
            ? `default-src ${customScheme}://* 'unsafe-inline' devtools://* 'unsafe-eval' data:; connect-src *; worker-src 'self' blob:; img-src * data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com;`
            : `default-src ${customScheme}://* 'unsafe-inline' data:; connect-src *; worker-src 'self' blob:; img-src * data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;`;

        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [policy],
            },
        });
    });
}
