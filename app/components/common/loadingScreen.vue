<script lang="ts" setup>
import { animate } from "motion";
import ProgressBar from "./progressBar.vue";
import { EASE } from "~/types/easings.js";

defineProps<{ progress: number }>();
const { activeSettings } = useSettings();

const progressTextRef = ref<HTMLElement | null>(null);

onMounted(async () => {
    const progress = progressTextRef.value?.querySelector(
        ".progress-text-wrapper",
    );
    const percentage = progressTextRef.value?.querySelector(".percentage");

    animate([
        [
            progress,
            { opacity: [0, 1], y: [100, 0] },
            { duration: 1.6, ease: "anticipate" },
        ],
        [
            percentage,
            { opacity: [0, 1], rotate: 360 },
            { duration: 0.6, ease: EASE.backOutSubtle, at: 1.2 },
        ],
    ]);
});
</script>

<template>
    <div class="loading-screen">
        <div
            ref="progressTextRef"
            class="progress-text"
            :style="{
                color: activeSettings.themeColor,
            }"
        >
            <div class="progress-text-wrapper">
                <p class="progress">
                    {{ progress }}
                </p>

                <p class="percentage">%</p>
            </div>
        </div>
        <ProgressBar class="loading-screen-bar" :progress="progress" />
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/loadingScreen.scss"
></style>
