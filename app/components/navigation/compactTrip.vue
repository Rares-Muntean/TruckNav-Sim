<script lang="ts" setup>
const props = withDefaults(
    defineProps<{
        routeDistanceConverted: number;
        distanceUnit: string;
        routeEtaMinutes: string;
        routeEtaHours: string;
        isRouteActive?: boolean;
        isSlideSheetOpened?: boolean;
    }>(),
    {
        isRouteActive: true,
        isSlideSheetOpened: false,
    },
);

const { specialJob } = useEtsTelemetry();

const MEDIA_QUERY = "(orientation: landscape), (min-width: 768px)";
const isSidePanel = ref(false);

onMounted(() => {
    const mediaQueryList = window.matchMedia(MEDIA_QUERY);
    isSidePanel.value = mediaQueryList.matches;

    const handler = (e: MediaQueryListEvent) => {
        isSidePanel.value = e.matches;
    };
    mediaQueryList.addEventListener("change", handler);

    onUnmounted(() => {
        mediaQueryList.removeEventListener("change", handler);
    });
});
</script>

<template>
    <div
        v-press
        class="compact-trip-progress"
        :class="{ 'special-cargo': specialJob }"
    >
        <div></div>

        <AnimTransition type="ticker">
            <template v-if="isRouteActive">
                <div class="route-info">
                    <div class="route-distance-wrapper">
                        <span>{{ routeDistanceConverted }}</span>
                        <span class="unit">{{ distanceUnit }} </span>
                    </div>

                    <span class="dot"></span>
                    <div class="route-distance-wrapper">
                        <span>{{ routeEtaHours }}</span>
                        <span class="unit white">h</span>
                    </div>

                    <div class="route-distance-wrapper">
                        <span>{{ routeEtaMinutes }}</span>
                        <span class="unit white">m</span>
                    </div>
                </div>
            </template>

            <template v-else>
                <span class="free-roam">Free Roam</span>
            </template>
        </AnimTransition>

        <button class="icon">
            <template v-if="!isSidePanel">
                <Icon v-if="!isSlideSheetOpened" name="lucide:chevron-up" />
                <Icon v-else name="lucide:chevron-down" />
            </template>

            <template v-else>
                <Icon v-if="!isSlideSheetOpened" name="lucide:chevron-right" />
                <Icon v-else name="lucide:chevron-left" />
            </template>
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/compactTrip.scss"
></style>
