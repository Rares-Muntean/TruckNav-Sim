<script lang="ts" setup>
import { SafeArea, SystemBarsType } from "@capacitor-community/safe-area";
import { anim } from "~/assets/utils/animations/anim";

const { isElectron, isMobile } = usePlatform();
const { settings } = useSettings();
const { settings: desktopSettings } = useDesktopSettings();

const currentView = ref<string>("");

onMounted(() => {
    setTimeout(updateSystemBars, 500);
    window.addEventListener("resize", updateSystemBars);

    if (isElectron.value) {
        if (
            desktopSettings.value.autoStartNavigation &&
            settings.value.selectedGame
        ) {
            currentView.value = "map";
        } else {
            currentView.value = "desktopHome";
        }
    } else {
        if (settings.value.autoStartNav && settings.value.selectedGame) {
            currentView.value = "map";
        } else {
            currentView.value = "gameManager";
        }
    }
});

onUnmounted(() => {
    window.removeEventListener("resize", updateSystemBars);
});

watch(currentView, async () => {
    await nextTick();
    updateSystemBars();

    if (isElectron.value && currentView.value === "desktopHome") {
        (window as any).electronAPI.setWindowSize(950, 700, false, false);
    }
});

const updateSystemBars = async () => {
    if (!isMobile.value) return;

    try {
        const isLandscape = window.innerWidth > window.innerHeight;

        if (isLandscape) {
            await SafeArea.hideSystemBars({ type: SystemBarsType.StatusBar });
            await SafeArea.hideSystemBars({
                type: SystemBarsType.NavigationBar,
            });
        } else {
            await SafeArea.showSystemBars({ type: SystemBarsType.StatusBar });
            await SafeArea.hideSystemBars({
                type: SystemBarsType.NavigationBar,
            });
        }
    } catch (e) {
        console.error("Bars update failed", e);
    }
};

const launchGameManager = () => (currentView.value = "gameManager");
const launchMap = () => (currentView.value = "map");
const goToDesktopIndex = () => (currentView.value = "desktopHome");

const goHome = () => {
    if (isElectron.value) currentView.value = "desktopHome";
    else currentView.value = "gameManager";
};
</script>

<template>
    <AnimTransition type="page">
        <DesktopIndex
            v-if="isElectron && currentView === 'desktopHome'"
            @connected="launchGameManager"
        />

        <GameManager
            v-else-if="currentView === 'gameManager'"
            @go-back="goToDesktopIndex"
            @connected="launchMap"
        />

        <LazyMap
            v-else-if="currentView === 'map'"
            @go-home="goHome"
            :key="settings.selectedGame ?? 'none'"
        />
    </AnimTransition>
</template>
