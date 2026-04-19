<script lang="ts" setup>
const props = defineProps<{
    isCalculatingRoute: boolean;
    isRouteFound: boolean | null;
}>();

const { isWeb } = usePlatform();

const notificationName = computed(() => {
    if (props.isRouteFound === true) {
        return "Route Found";
    } else if (props.isRouteFound === false) {
        return "No Route Available";
    }

    return "Locating Route";
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
