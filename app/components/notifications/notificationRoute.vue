<script lang="ts" setup>
import { animate } from "motion";

const props = defineProps<{
    isCalculatingRoute: boolean;
    isRouteFound: boolean | null;
}>();

const { isWeb } = usePlatform();
const { t } = useTranslations();

const routeFound = defineModel<boolean | null>({ default: false });
let timer: ReturnType<typeof setTimeout> | null = null;
const fillRef = ref<HTMLElement | null>(null);

const notificationName = computed(() => {
    if (props.isRouteFound === true) {
        return t("notifications.routeFound");
    } else if (props.isRouteFound === false) {
        return t("notifications.noRouteAvailable");
    }

    return t("notifications.locatingRoute");
});

const isVisible = computed(() => {
    return props.isCalculatingRoute || props.isRouteFound !== null;
});

watch(fillRef, (el) => {
    if (el) startBar();
});

watch(routeFound, (newVal) => {
    if (newVal !== null) {
        if (timer) clearTimeout(timer);

        timer = setTimeout(() => {
            routeFound.value = null;
        }, 2000);
    }
});

onUnmounted(() => {
    if (timer) clearTimeout(timer);
});

function startBar() {
    if (!fillRef.value || props.isCalculatingRoute) return;

    animate(fillRef.value, { scaleX: [1, 0] }, { duration: 2, ease: "linear" });
}
</script>

<template>
    <div class="notification-container" :class="{ 'is-web': isWeb }">
        <div v-if="isVisible" class="notification-wrapper">
            <div :key="String(notificationName)" class="content-wrapper">
                <span>{{ notificationName }}</span>
                <Icon
                    v-if="isRouteFound === true"
                    name="lucide:map-pin-check-inside"
                    class="notification-icon found"
                    size="24"
                />
                <Icon
                    v-else-if="isRouteFound === false"
                    name="lucide:map-pin-x-inside"
                    class="notification-icon failed"
                    size="24"
                />
                <Icon
                    v-else
                    name="svg-spinners:ring-resize"
                    class="notification-icon loading"
                    size="24"
                />
            </div>

            <div
                v-if="!isCalculatingRoute && routeFound !== null"
                ref="fillRef"
                class="timer-progress"
            ></div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/notifications/notifications.scss"
></style>
