<script lang="ts" setup>
const props = defineProps<{ launchChooseGame: () => void }>();

const { fetchIp, localIP } = useNetwork();
const { updateGlobal } = useSettings();

const isServerRunning = ref(false);
const polling = ref<any>(null);
const isWindowOpened = ref(false);

const checkStatus = async () => {
    const processExists = await (window as any).electronAPI.checkServerStatus();

    if (processExists) {
        try {
            const data = await (window as any).electronAPI.fetchTelemetry(
                "127.0.0.1",
            );
            isServerRunning.value = !!data;
        } catch {
            isServerRunning.value = false;
        }
    } else {
        isServerRunning.value = false;
    }
};

const handleLocalLaunch = async () => {
    updateGlobal("savedIP", "127.0.0.1");
    props.launchChooseGame();
};

onMounted(async () => {
    await fetchIp();
    (window as any).electronAPI.setWindowSize(900, 600, false, false);

    checkStatus();

    const bootTimer = setInterval(async () => {
        if (isServerRunning.value) {
            clearInterval(bootTimer);
            startRegularPolling();
            return;
        }

        await checkStatus();
    }, 500);
});

onUnmounted(() => {
    if (polling.value) clearInterval(polling.value);
});

const startRegularPolling = () => {
    polling.value = setInterval(async () => {
        await checkStatus();
    }, 5000);
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
            <h2 class="title">Welcome to TruckerNav!</h2>
            <span class="subtitle"
                >Below you’ll find instructions to set up the GPS on your
                phone.</span
            >
            <div class="steps">
                <ol>
                    <li>Make sure ETS2 / ATS is running on your PC.</li>
                    <li>
                        Ensure your phone is connected to the same network as
                        your PC.
                    </li>
                    <li>Open the GPS app on your phone.</li>
                    <li>
                        Enter this IP to connect to the desktop telemetry:
                        <strong class="localIp">{{ localIP }}</strong>
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
                                    : "Offline - try opening again."
                            }}</span
                        >
                    </div>

                    <div v-if="isServerRunning" class="safe-to-close">
                        <Icon
                            name="mdi:check-circle-outline"
                            size="20"
                            class="icon"
                        />
                        <span
                            >Safe to close this window! The server stays active
                            in your taskbar.</span
                        >
                    </div>
                </div>
            </div>
        </div>

        <div class="bottom">
            <div class="github-link">
                <Icon name="mdi:github" size="20" />
                <span>
                    GitHub Link:
                    <a
                        @click.prevent="
                            openLink(
                                'https://github.com/Rares-Muntean/ets2-navigation-gps',
                            )
                        "
                        >TruckNav</a
                    >
                </span>
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
