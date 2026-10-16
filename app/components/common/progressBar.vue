<script lang="ts" setup>
import { animate } from "motion";
import { EASE } from "~/types/easings";

const props = defineProps<{ progress: number }>();

const fillRef = ref<HTMLElement | null>(null);

watch(
    () => props.progress,
    (progress) => {
        if (!fillRef) return;

        const targetScale = Math.min(Math.max(progress, 0), 100) / 100;

        animate(
            fillRef.value,
            { scaleX: targetScale },
            { duration: 0.4, ease: EASE.circInOut },
        );
    },
);
</script>

<template>
    <div class="progress-bar-bg">
        <div class="progress-bar-fill" ref="fillRef"></div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/progressBar.scss"
></style>
