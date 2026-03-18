<script lang="ts" setup>
import { isBridgeRunning } from "~/assets/utils/telemetry/helpers";
import type { ets2Expansions } from "~/data/ets2/ets2Expansions";
const props = defineProps<{ launchChooseGame: () => void }>();

const { fetchIp, fetchPort, localIP, localPort } = useNetwork();
const { updateGlobal } = useSettings();

const isServerRunning = ref(false);
const polling = ref<any>(null);
const isWindowOpened = ref(false);
const etsActive = ref(false);
const atsActive = ref(false);

const checkStatus = async () => {
    isServerRunning.value = await isBridgeRunning("127.0.0.1");

    const statuses = await (window as any).electronAPI.checkPluginStatuses();
    etsActive.value = statuses.ets2;
    atsActive.value = statuses.ats;
};

const handleLocalLaunch = async () => {
    updateGlobal("savedIP", "127.0.0.1");
    props.launchChooseGame();
};

onMounted(async () => {
    await fetchIp();
    await fetchPort();

    (window as any).electronAPI.setWindowSize(900, 600, false, false);
    checkStatus();
    const bootTimer = setInterval(async () => {
        if (isServerRunning.value) {
            clearInterval(bootTimer);
            startRegularPolling();
            return;
        }

        await checkStatus();
    }, 1500);
});

const handleExplorerLaunch = async (gameName: string) => {
    const result = await (window as any).electronAPI.selectGameFolder(gameName);

    if (result.success) {
        console.log("Plugin installed at:", result.path);
        checkStatus();
    } else {
        if (result.message !== "Cancelled") {
            alert("Error: " + result.message);
        }
    }
};

onUnmounted(() => {
    if (polling.value) clearInterval(polling.value);
});

const startRegularPolling = () => {
    polling.value = setInterval(async () => {
        await checkStatus();
    }, 7000);
};

const openLink = async (url: string) => {
    (window as any).electronAPI.openExternal(url);
};

const toggleWindow = () => {
    isWindowOpened.value = !isWindowOpened.value;
};
</script>

<template>
    <section class="section-device-info">
        <div class="top-tagline">
            <Icon name="whh:gpsalt" class="icon" size="20" />
            <span>Your Trucking Companion</span>
        </div>

        <div class="content">
            <div class="title-wrapper">
                <h2 class="title">Welcome to TruckNav!</h2>
                <Icon
                    class="github-icon"
                    name="mdi:github"
                    size="30"
                    @click.prevent="
                        openLink(
                            'https://github.com/Rares-Muntean/ets2-navigation-gps',
                        )
                    "
                />
            </div>

            <span class="subtitle"
                >Below you’ll find instructions to set up the app on your
                phone.</span
            >
            <div class="steps">
                <ol>
                    <li>Make sure ETS2 / ATS is running on your PC.</li>
                    <li>
                        Ensure your phone is connected to the same network as
                        your PC.
                    </li>
                    <li>
                        Open the TruckNav app or web browser using the ip
                        address below.
                    </li>
                    <li>
                        TruckNav App:
                        <strong class="localIp">{{ localIP }}</strong> |
                        Browser:
                        <strong class="localIp"
                            >{{ localIP }}:{{ localPort }}</strong
                        >
                    </li>
                </ol>
            </div>

            <div class="bottom-info">
                <div class="status-div">
                    <div class="status">
                        <p>Current Status: &nbsp;</p>
                        <span
                            :class="
                                isServerRunning ? 'connected' : 'disconnected'
                            "
                            >{{
                                isServerRunning
                                    ? "Connected"
                                    : "Offline, try opening again."
                            }}</span
                        >
                    </div>

                    <div
                        v-if="isServerRunning"
                        class="status-indicator is-safe"
                    >
                        <Icon
                            name="mdi:check-circle-outline"
                            size="20"
                            class="icon"
                        />
                        <span
                            >Telemetry is running.
                            <strong>Minimize</strong> this window to keep the
                            GPS active.
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div class="bottom">
            <div class="setup-games-sdk">
                <div class="game-status">
                    <span class="game-name">ETS2</span>
                    <div class="icon-status-wrapper">
                        <div
                            class="label"
                            :class="etsActive ? 'active' : 'missing'"
                        >
                            <span
                                >Plugin
                                {{ etsActive ? "Active" : "Missing" }}</span
                            >
                            <button
                                @click.prevent="handleExplorerLaunch('ETS2')"
                                class="folder-btn"
                            >
                                <Icon
                                    name="mdi:folder-edit-outline"
                                    size="20"
                                />
                            </button>
                        </div>
                    </div>
                </div>

                <div class="game-status">
                    <span class="game-name">ATS</span>
                    <div class="icon-status-wrapper">
                        <span
                            class="label"
                            :class="atsActive ? 'active' : 'missing'"
                        >
                            <span
                                >Plugin
                                {{ atsActive ? "Active" : "Missing" }}</span
                            >
                            <button
                                @click.prevent="handleExplorerLaunch('ATS')"
                                class="folder-btn"
                            >
                                <Icon
                                    name="mdi:folder-edit-outline"
                                    size="20"
                                />
                            </button>
                        </span>
                    </div>
                </div>
            </div>

            <Transition name="panel-pop">
                <div
                    @click.self="toggleWindow"
                    v-show="isWindowOpened"
                    class="connect-modal-overlay"
                >
                    <div class="connect-window">
                        <InputComputerIP @connected="launchChooseGame" />
                    </div>
                </div>
            </Transition>

            <div class="connection-type">
                <button @click.prevent="toggleWindow" class="btn">
                    <span>Remote GPS</span>
                    <Icon name="material-symbols:link-rounded" size="20" />
                </button>

                <button @click.prevent="handleLocalLaunch" class="btn">
                    <span>Local GPS </span>
                    <Icon
                        name="material-symbols:screenshot-monitor-outline-rounded"
                        size="20"
                    />
                </button>
            </div>
        </div>
    </section>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/layouts/desktopIndex.scss"
></style>
