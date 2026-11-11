<script lang="ts" setup>
import { animate } from "motion";
import { EASE } from "~/types/easings";

const props = withDefaults(
    defineProps<{
        show?: boolean;
        progress: number;
        barHeight?: number;
        color?: string;
    }>(),
    { show: true, barHeight: 6, color: "var(--theme-color)" },
);

const fillRef = ref<HTMLElement | null>(null);

function updateBar(val: number) {
    if (!fillRef.value) return;

    const targetScale = Math.min(Math.max(val || 0, 0), 100) / 100;

    animate(
        fillRef.value,
        { scaleX: targetScale },
        { duration: 0.3, ease: EASE.sineOut },
    );
}

onMounted(() => {
    updateBar(props.progress);
});

watch(
    () => props.progress,
    (progress) => {
        updateBar(progress);
    },
);
</script>

<template>
    <AnimTransition type="fade">
        <div
            v-if="show"
            class="progress-bar-bg"
            :style="{ height: barHeight + 'px' }"
        >
            <div
                class="progress-bar-fill"
                :style="{ backgroundColor: color }"
                ref="fillRef"
            ></div>
        </div>
    </AnimTransition>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/progressBar.scss"
></style>
