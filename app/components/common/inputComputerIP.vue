<script lang="ts" setup>
import { isBridgeRunning } from "~/assets/utils/telemetry/helpers";
const props = defineProps<{ requireGame?: boolean }>();

const isConnected = defineModel<boolean>({ default: false });

const { settings, updateGlobal } = useSettings();
const { t } = useTranslations();

const connectionError = ref(t("common.disconnected"));
const ipInput = ref(settings.value.savedIP || "");
const isLoading = ref(false);

watch(
    () => settings.value.savedIP,
    (newIP) => {
        if (newIP && !ipInput.value) {
            ipInput.value = newIP;
        }
    },
);

onMounted(() => {
    if (ipInput.value) {
        handleConnect();
    }
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let handleConntectTimer: ReturnType<typeof setInterval> | null = null;

watch(ipInput, (nVal) => {
    isLoading.value = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (handleConntectTimer) clearInterval(handleConntectTimer);

    if (!nVal) {
        connectionError.value = t("input.missingValue");
        isConnected.value = false;
        isLoading.value = false;
        return;
    }

    debounceTimer = setTimeout(() => {
        handleConnect();
    }, 300);
});

onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (handleConntectTimer) clearInterval(handleConntectTimer);
});

const handleConnect = async () => {
    if (handleConntectTimer) clearInterval(handleConntectTimer);
    const currentIp = ipInput.value.trim();
    if (!currentIp) {
        connectionError.value = t("input.missingValue");
        isLoading.value = false;
        return;
    }

    isLoading.value = true;

    try {
        const isRunning = await isBridgeRunning(currentIp);
        if (currentIp !== ipInput.value.trim()) return;

        if (!isRunning) throw new Error(t("input.bridgeNotReachable"));

        isConnected.value = true;
        isLoading.value = false;
        updateGlobal("savedIP", ipInput.value);
    } catch (error) {
        if (currentIp !== ipInput.value.trim()) return;
        isConnected.value = false;
        isLoading.value = false;

        connectionError.value = t("common.disconnected");

        handleConntectTimer = setInterval(() => {
            handleConnect();
        }, 5000);
    }
};

const connectedValue = computed(() => {
    return isConnected.value ? t("common.connected") : connectionError.value;
});
</script>

<template>
    <div class="connect-pc-module">
        <div class="input-ip">
            <div class="form-details">
                <div class="form-info-wrapper">
                    <form action="">
                        <div class="label-wrapper">
                            <div class="label-left">
                                <label for="ip">{{
                                    t("input.ipAddress")
                                }}</label>

                                <InfoBox>
                                    <template #content>
                                        <p>{{ t("input.description") }}.</p>
                                    </template>
                                </InfoBox>
                            </div>

                            <div class="connected-value">
                                <Icon
                                    v-show="isLoading"
                                    name="svg-spinners:ring-resize"
                                    class="loading-icon"
                                    size="16"
                                />

                                <div class="status">
                                    <div
                                        class="pill"
                                        :class="
                                            isConnected
                                                ? 'connected'
                                                : 'disconnected'
                                        "
                                    >
                                        <span>
                                            {{ connectedValue }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <input
                            id="ip"
                            v-model="ipInput"
                            type="text"
                            name="ip"
                            :placeholder="t('input.placeholder')"
                        />
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/inputComputerIP.scss"
></style>
