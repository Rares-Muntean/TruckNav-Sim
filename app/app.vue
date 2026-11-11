<script setup lang="ts">
import { KeepAwake } from "@capacitor-community/keep-awake";
import SplashScreen from "./components/common/splashScreen.vue";
import { animate } from "motion";
import { EASE } from "./types/easings.js";

const { checkBaseMapStatus } = useGameSelection();

const isAppInitializing = ref(true);
const isAppReady = useState("isAppReady", () => false);

const onSplashLeave = (el: Element, done: () => void) => {
    const a = animate(
        el,
        { opacity: [1, 0] },
        { duration: 0.6, ease: EASE.power2Out },
    );
    a.finished.then(done);
};

onMounted(async () => {
    const startTime = performance.now();

    try {
        const result = await KeepAwake.isSupported();
        if (result.isSupported) await KeepAwake.keepAwake();
    } catch (e) {}

    await checkBaseMapStatus();

    const elapsedTime = performance.now() - startTime;
    const remainingDelay = Math.max(0, 1000 - elapsedTime);

    if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
    }

    isAppInitializing.value = false;
    isAppReady.value = true;
});
</script>

<template>
    <UApp>
        <Transition :css="false" @leave="onSplashLeave">
            <SplashScreen v-if="isAppInitializing" />
        </Transition>

        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>

<style lang="scss">
@use "~/assets/scss/global/global";
</style>
