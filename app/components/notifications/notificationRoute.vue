<script lang="ts" setup>
const props = defineProps<{
    isCalculatingRoute: boolean;
    isRouteFound: boolean | null;
}>();

const { isWeb } = usePlatform();

const iconName = computed(() => {
    if (props.isRouteFound === true) {
        return "lucide:map-pin-check-inside";
    } else if (props.isRouteFound === false) {
        return "lucide:map-pin-x-inside";
    }

    return "svg-spinners:ring-resize";
});

const notificationName = computed(() => {
    if (props.isRouteFound === true) {
        return "Route Found";
    } else if (props.isRouteFound === false) {
        return "No Route Available";
    }

    return "Locating Route";
});

const iconClass = computed(() => {
    if (props.isRouteFound === true) {
        return "found";
    } else if (props.isRouteFound === false) {
        return "failed";
    }

    return "loading";
});

const isVisible = computed(() => {
    return props.isCalculatingRoute || props.isRouteFound !== null;
});
</script>

<template>
    <div class="notification-container" :class="{ 'is-web': isWeb }">
        <Transition name="notification-slide">
            <div v-if="isVisible" class="notification-wrapper">
                <Transition name="notification-fade" mode="out-in">
                    <div
                        :key="String(notificationName)"
                        class="content-wrapper"
                    >
                        <span>{{ notificationName }}</span>
                        <Icon
                            class="notification-icon"
                            :name="iconName"
                            :class="iconClass"
                            size="24"
                        />
                    </div>
                </Transition>
            </div>
        </Transition>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/notifications/notificationRoute.scss"
></style>
