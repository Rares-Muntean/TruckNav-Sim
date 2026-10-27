<script lang="ts" setup>
const props = defineProps<{
    routeDistanceConverted: number;
    distanceUnit: string;
    routeEtaMinutes: string;
    routeEtaHours: string;
}>();
</script>

<template>
    <div class="compact-trip-progress">
        <div></div>

        <div class="route-info">
            <div class="route-distance-wrapper">
                <span>{{ routeDistanceConverted }}</span>
                <span class="unit">{{ distanceUnit }} </span>
            </div>

            <span class="dot"></span>
            <div class="route-distance-wrapper">
                <span>{{ routeEtaHours }}</span>
                <span class="unit">h</span>
            </div>

            <div class="route-distance-wrapper">
                <span>{{ routeEtaMinutes }}</span>
                <span class="unit">m</span>
            </div>
        </div>

        <button class="icon">
            <Icon name="lucide:chevron-up" />
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/compactTrip.scss"
></style>
