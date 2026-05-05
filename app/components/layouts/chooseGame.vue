<script lang="ts" setup>
import {Capacitor} from "@capacitor/core";

const props = defineProps<{
    launchMap: () => void;
    goToDesktopIndex: () => void;
}>();
const { selectedGame, commitSelection } = useGameSelection();
const { isWeb, isElectron } = usePlatform();
const { t } = useTranslations();

const handleStart = () => {
    commitSelection();
    props.launchMap();
};

const manualSelection = ref(false);

async function autoSelectGame(): Promise<"ets2" | "ats" | "unknown"> {
    if (Capacitor.isNativePlatform()) return "unknown";
    const url = "/api/rest/single/game/id";
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(500) });
        if (!response.ok) return "unknown";
        const result = await response.text();
        if (result === '"eut2"') {
            return "ets2";
        } else if (result === '"ats"') {
            return "ats";
        }
        return "unknown";
    } catch (e) {
        console.error(`unexpected error trying to auto-detect game: ${e}`);
        return "unknown";
    }
}

onMounted(async () => {
    console.log("Trying to auto-detect game using TruckTel API...");
    const result = await autoSelectGame();
    if (result == "unknown") {
        console.log("Auto-detection failed");
        manualSelection.value = true;
    } else {
        console.log(`Detected ${result.toUpperCase()}`);
        selectedGame.value = result;
        handleStart();
    }
});

</script>

<template>
    <div v-show="manualSelection" class="choose-game-section">
        <div class="top-tagline">
            <button
                v-show="isElectron"
                @click="goToDesktopIndex"
                class="back-btn"
            >
                <Icon name="lucide:arrow-left" size="22" />
            </button>

            <Icon name="lucide:earth" class="icon" size="22" />
            <span>{{ t("common.selectGame") }}</span>
        </div>

        <div class="game-selection" :style="{ width: isWeb ? '80%' : '85%' }">
            <div class="select-btns">
                <GameSelection
                    v-model="selectedGame"
                    :width="isWeb ? 450 : 950"
                />
            </div>
        </div>

        <button
            :disabled="!selectedGame"
            @click.prevent="handleStart"
            class="btn nav-btn"
            autofocus
        >
            <span>{{ t("common.startNavigation") }}</span>
            <Icon name="lucide:map-pinned" size="20" />
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/layouts/chooseGame.scss"
></style>
