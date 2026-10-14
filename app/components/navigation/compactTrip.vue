<script lang="ts" setup>
const props = defineProps<{
    routeDistanceConverted: number;
    distanceUnit: string;
    routeEta: string;
}>();
</script>

<template>
    <div class="compact-trip-progress">
        <Icon name="lucide:flag-triangle-right" size="22" />
        <div class="route-info">
            <span>{{ routeDistanceConverted }} {{ distanceUnit }} </span>
            <span class="dot">·</span>
            <span>{{ routeEta }}</span>
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
