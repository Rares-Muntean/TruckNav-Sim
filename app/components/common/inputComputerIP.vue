<script lang="ts" setup>
const props = defineProps<{ requireGame?: boolean }>();
const isConnected = defineModel<boolean>({ default: false });

const { settings, updateGlobal } = useSettings();
const { t } = useTranslations();

const ipInput = ref(settings.value.savedIP || "");
const isLoading = ref(false);

let ws: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
    if (retryTimer) clearTimeout(retryTimer);

    if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        ws = null;
    }

    const ip = ipInput.value.trim();
    if (!ip) {
        isConnected.value = false;
        isLoading.value = false;
        return;
    }

    isLoading.value = true;

    try {
        ws = new WebSocket(`ws://${ip}:30001`);

        ws.onopen = () => {
            isConnected.value = true;
            isLoading.value = false;
            updateGlobal("savedIP", ip);
        };

        ws.onclose = () => {
            isConnected.value = false;
            isLoading.value = false;
            ws = null;
            retryTimer = setTimeout(connect, 1500);
        };

        ws.onerror = () => {
            isConnected.value = false;
            isLoading.value = false;
        };
    } catch {
        isConnected.value = false;
        isLoading.value = false;
        retryTimer = setTimeout(connect, 1500);
    }
}

watch(ipInput, (newIp) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!newIp.trim()) {
        isConnected.value = false;
        isLoading.value = false;
        if (ws) ws.close();
        return;
    }

    isLoading.value = true;
    debounceTimer = setTimeout(() => {
        connect();
    }, 400);
});

watch(
    () => settings.value.savedIP,
    (newIP) => {
        if (newIP && !ipInput.value) {
            ipInput.value = newIP;
        }
    },
);

onMounted(() => {
    if (ipInput.value.trim()) {
        connect();
    }
});

onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        ws = null;
    }
});

const connectedValue = computed(() => {
    return isConnected.value ? t("common.connected") : t("common.disconnected");
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
