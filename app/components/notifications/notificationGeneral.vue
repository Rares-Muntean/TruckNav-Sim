<script lang="ts" setup>
import { animate } from "motion";
import { EASE } from "~/types/easings";

const props = withDefaults(
    defineProps<{
        text: string;
        trigger?: number;
        duration?: number;
        persistent?: boolean;
    }>(),
    {
        trigger: 0,
        duration: 3500,
        persistent: false,
    },
);

const isTriggerVisible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const fillRef = ref<HTMLElement | null>(null);

watch(fillRef, (el) => {
    if (el) startBar();
});

watch(
    () => props.trigger,
    (newVal) => {
        if (newVal > 0) {
            isTriggerVisible.value = true;
            startBar();

            if (timer) clearTimeout(timer);

            timer = setTimeout(() => {
                isTriggerVisible.value = false;
            }, props.duration);
        }
    },
    { immediate: true },
);

onUnmounted(() => {
    if (timer) clearTimeout(timer);
});

function startBar() {
    if (!fillRef.value || props.persistent) return;

    animate(
        fillRef.value,
        { scaleX: [1, 0] },
        { duration: props.duration / 1000, ease: "linear" },
    );
}

const isVisible = computed(() => {
    return props.persistent || isTriggerVisible.value;
});
</script>

<template>
    <div v-if="isVisible" class="notification-container">
        <div class="notification-wrapper">
            <div class="content-wrapper">
                <span>{{ text }}</span>
                <slot name="icon"></slot>
            </div>

            <div v-if="!persistent" ref="fillRef" class="timer-progress"></div>
        </div>
    </div>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/notifications/notifications.scss"
></style>
