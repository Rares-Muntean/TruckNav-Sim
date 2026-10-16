<script lang="ts" setup>
import { animate } from "motion";

const props = defineProps<{
    isActive: boolean;
}>();

const liveDotRef = ref<HTMLElement | null>(null);
let liveDotAnimControl: ReturnType<typeof animate> | null = null;

watch([liveDotRef, () => props.isActive], ([el, connected]) => {
    if (el) {
        liveDotAnimControl?.stop();
        const sonar = el.querySelector(".sonar");
        if (!sonar) return;

        const animDuration = connected ? 3.4 : 5;

        liveDotAnimControl = animate(
            [
                [
                    liveDotRef.value,
                    { opacity: [0.4, 1, 0.4], scale: [0.7, 1, 0.7] },
                    {
                        repeat: Infinity,
                        duration: animDuration,
                        ease: "backInOut",
                        repeatType: "reverse",
                    },
                ],
                [
                    sonar,
                    {
                        scale: [1, 2],
                        opacity: [0.8, 0],
                    },
                    {
                        duration: animDuration,
                        ease: "easeOut",
                        at: "<",
                    },
                ],
            ],
            {
                repeat: Infinity,
            },
        );
    } else {
        liveDotAnimControl?.stop();
    }
});

onUnmounted(() => {
    liveDotAnimControl?.stop();
});
</script>

<template>
    <div
        ref="liveDotRef"
        class="live"
        :class="isActive ? 'connected' : 'disconnected'"
    >
        <div
            class="sonar"
            :class="isActive ? 'connected' : 'disconnected'"
        ></div>
    </div>
</template>

<style lang="scss" scoped>
.live {
    position: relative;
    border-radius: 50%;
    aspect-ratio: 1;
    height: 6px;

    &.connected {
        background-color: $green-color;
        box-shadow: 0 0 4px $green-color;
    }

    &.disconnected {
        background-color: $red-color;
        box-shadow: 0 0 4px $red-color;
    }

    .sonar {
        position: absolute;
        inset: 0;

        border-radius: 50%;
        aspect-ratio: 1;

        &.connected {
            border: 2px solid color-mix(in srgb, $green-color 60%, #ffffff);
        }

        &.disconnected {
            border: 2px solid color-mix(in srgb, $red-color 80%, #ffffff);
        }
    }
}
</style>
