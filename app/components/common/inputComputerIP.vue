<script lang="ts" setup>
import { isBridgeRunning } from "~/assets/utils/telemetry/helpers";
const props = defineProps<{ requireGame?: boolean }>();

const { selectedGame, commitSelection } = useGameSelection();
const { settings, updateGlobal } = useSettings();

const connectionError = ref("Disconnected");
const ipInput = ref(settings.value.savedIP || "");
const isConnecting = ref(false);
const isConnected = ref(false);

const emit = defineEmits(["connected"]);

watch(isConnected, (connected) => {
    if (connected) {
        emit("connected");
    }
});

watch(
    () => settings.value.savedIP,
    (newIP) => {
        if (newIP && !ipInput.value) {
            ipInput.value = newIP;
        }
    },
);

const canConnect = computed(() => {
    if (isConnecting.value) return false;
    if (props.requireGame) return !!selectedGame.value;
    return true;
});

const handleConnect = async () => {
    connectionError.value = "Disconnected";

    if (!ipInput.value) {
        connectionError.value = "Please input a value.";
        return;
    }

    isConnecting.value = true;

    try {
        if (!(await isBridgeRunning(ipInput.value)))
            throw new Error("Bridge not reachable");

        updateGlobal("savedIP", ipInput.value);
        isConnected.value = true;
        commitSelection();

        emit("connected");

        setTimeout(() => {
            isConnecting.value = false;
        }, 500);
    } catch (error) {
        isConnected.value = false;
        connectionError.value = "Could not connect...";
        isConnecting.value = false;
    }
};
</script>

<template>
    <div class="connect-pc-module">
        <div class="input-ip">
            <div class="form-details">
                <form @submit.prevent="handleConnect" action="">
                    <label for="ip">IP Address:</label>
                    <input
                        id="ip"
                        v-model="ipInput"
                        type="text"
                        name="ip"
                        placeholder="Type here..."
                        :disabled="isConnecting"
                    />
                </form>
                <p class="status">
                    <span v-if="!connectionError">Current Status: &nbsp;</span>
                    <span :class="isConnected ? 'connected' : 'disconnected'">{{
                        isConnected ? "Connected" : connectionError
                    }}</span>
                </p>
            </div>

            <div class="description">
                <div class="note">
                    <Icon name="lucide:info" />
                    <p>Note</p>
                </div>
                <p class="description-text">
                    Enter the IP shown in TruckNav from your computer
                </p>
            </div>
        </div>

        <button class="btn" @click="handleConnect" :disabled="!canConnect">
            <span>{{ isConnecting ? "Connecting..." : "Connect" }}</span>
            <Icon name="lucide:link" size="20" />
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/inputComputerIP.scss"
></style>
